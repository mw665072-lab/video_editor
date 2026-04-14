import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

// ─── Singleton ────────────────────────────────────────────────────────────────
// Separate instance from the main editor so both can coexist independently.
let _ff: FFmpeg | null = null

export async function loadFFmpegCut(): Promise<FFmpeg> {
  if (_ff) return _ff

  _ff = new FFmpeg()
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

  await _ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return _ff
}

// ─── trimSegment ─────────────────────────────────────────────────────────────

/**
 * Trims a single File to [startTime, startTime + trimDuration] seconds.
 * Encodes to H.264 + AAC with even-dimension enforcement for H.264 compat.
 * Returns an MP4 Blob ready to be fed into concatSegments().
 */
export async function trimSegment(
  file: File,
  startTime: number,
  trimDuration: number,
  segIdx: number,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const ff = await loadFFmpegCut()

  const ts = Date.now()
  const inputName  = `seg_in_${segIdx}_${ts}.mp4`
  const outputName = `seg_out_${segIdx}_${ts}.mp4`

  await ff.writeFile(inputName, await fetchFile(file))

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(99, Math.round(progress * 100)))
  }
  ff.on('progress', progressHandler)

  try {
    await ff.exec([
      // Input-side seek = fast, accurate enough for most cases
      '-ss', String(Math.max(0, startTime)),
      '-t',  String(Math.max(0.1, trimDuration)),
      '-i',  inputName,

      // Video: H.264 high profile, yuv420p for widest compat
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-profile:v', 'high',
      '-level:v', '4.1',
      '-pix_fmt', 'yuv420p',
      // CRITICAL: even dimensions for H.264
      '-vf', "scale='trunc(iw/2)*2:trunc(ih/2)*2'",

      // Audio: AAC stereo
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ac', '2',

      // Flags
      '-movflags', '+faststart',
      '-avoid_negative_ts', 'make_zero',
      '-y',
      outputName,
    ])

    const data = await ff.readFile(outputName)
    onProgress?.(100)
    return new Blob([data], { type: 'video/mp4' })
  } finally {
    ff.off('progress', progressHandler)
    try { await ff.deleteFile(inputName)  } catch { /* ignore */ }
    try { await ff.deleteFile(outputName) } catch { /* ignore */ }
  }
}

// ─── concatSegments ──────────────────────────────────────────────────────────

/**
 * Concatenates an array of already-encoded MP4 Blobs using the FFmpeg
 * concat demuxer with `-c copy` — fast and lossless at the merge step.
 *
 * All blobs must have been encoded with the same codec parameters (which
 * trimSegment() guarantees: libx264 + aac, yuv420p).
 */
export async function concatSegments(
  blobs: Blob[],
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  if (blobs.length === 0) throw new Error('No segments to concatenate')
  if (blobs.length === 1) {
    onProgress?.(100)
    return blobs[0]
  }

  const ff = await loadFFmpegCut()
  const ts = Date.now()

  // Write each segment to WASM FS
  const fileNames: string[] = []
  for (let i = 0; i < blobs.length; i++) {
    const name = `cat_in_${i}_${ts}.mp4`
    await ff.writeFile(name, await fetchFile(blobs[i]))
    fileNames.push(name)
  }

  // Build concat list (absolute WASM FS paths)
  const listName   = `cat_list_${ts}.txt`
  const outputName = `cat_out_${ts}.mp4`
  const listContent = fileNames.map(f => `file '${f}'`).join('\n')
  await ff.writeFile(listName, listContent)

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(99, Math.round(progress * 100)))
  }
  ff.on('progress', progressHandler)

  try {
    await ff.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', listName,
      '-c', 'copy',           // lossless copy — no re-encode needed
      '-movflags', '+faststart',
      '-y',
      outputName,
    ])

    const data = await ff.readFile(outputName)
    onProgress?.(100)
    return new Blob([data], { type: 'video/mp4' })
  } finally {
    ff.off('progress', progressHandler)
    try { await ff.deleteFile(listName)   } catch { /* ignore */ }
    try { await ff.deleteFile(outputName) } catch { /* ignore */ }
    for (const f of fileNames) {
      try { await ff.deleteFile(f) } catch { /* ignore */ }
    }
  }
}
