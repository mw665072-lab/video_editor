import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { VideoClip } from './types'

let ffmpegInstance: FFmpeg | null = null
let isFFmpegLoaded = false

export async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && isFFmpegLoaded) {
    return ffmpegInstance
  }

  try {
    const FFmpegModule = await import('@ffmpeg/ffmpeg')
    ffmpegInstance = new FFmpegModule.FFmpeg()

    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    isFFmpegLoaded = true
    return ffmpegInstance
  } catch (error) {
    console.error('Failed to initialize FFmpeg:', error)
    throw new Error('Failed to initialize video processing. Your browser may not support this feature.')
  }
}

async function writeInputVideo(ffmpeg: FFmpeg, videoSource: Blob | string, inputFileName: string) {
  if (videoSource instanceof Blob) {
    const arrayBuffer = await videoSource.arrayBuffer()
    ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer))
  } else {
    const response = await fetch(videoSource)
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`)
    const arrayBuffer = await response.arrayBuffer()
    ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer))
  }
}

function getClipFilename(index: number): string {
  return `clip_${index}.mp4`
}

function clipWithInfo(clip: VideoClip): VideoClip {
  return {
    ...clip,
    duration: Number((clip.endTime - clip.startTime).toFixed(3)),
  }
}

async function concatClipFiles(ffmpeg: FFmpeg, files: string[], outputFileName: string) {
  const concatContent = files.map(file => `file '${file}'`).join('\n')
  ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatContent))

  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    '-y',
    outputFileName,
  ])
}

async function extractClip(
  ffmpeg: FFmpeg,
  inputFileName: string,
  clip: VideoClip,
  outputFileName: string,
  method: 'copy' | 'reencode',
  crf: number
) {
  const duration = Number((clip.endTime - clip.startTime).toFixed(3))

  if (method === 'copy') {
    await ffmpeg.exec([
      '-ss', String(clip.startTime),
      '-i', inputFileName,
      '-t', String(duration),
      '-c', 'copy',
      '-avoid_negative_ts', '1',
      '-y',
      outputFileName,
    ])
  } else {
    await ffmpeg.exec([
      '-ss', String(clip.startTime),
      '-i', inputFileName,
      '-t', String(duration),
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', String(crf),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y',
      outputFileName,
    ])
  }
}

async function readOutputBlob(ffmpeg: FFmpeg, fileName: string): Promise<Blob> {
  const data = await ffmpeg.readFile(fileName as any)
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as any)
  return new Blob([bytes], { type: 'video/mp4' })
}

async function cleanupFiles(ffmpeg: FFmpeg, files: string[]) {
  for (const file of files) {
    try {
      ffmpeg.deleteFile(file)
    } catch (error) {
      // ignore cleanup errors
    }
  }
}

export async function processClipsDirect(
  videoSource: Blob | string,
  clips: VideoClip[],
  quality: 'fast' | 'medium' | 'slow' = 'medium',
  onProgress?: (progress: number, step: string) => void
): Promise<Blob> {
  const ffmpeg = await initFFmpeg()
  const inputFileName = 'input.mp4'
  const outputFileName = 'output.mp4'
  const tempFiles: string[] = [inputFileName, outputFileName]

  const qualityConfig: Record<string, number> = {
    fast: 35,
    medium: 28,
    slow: 22,
  }

  const crf = qualityConfig[quality] || 28
  const sortedClips = clips.slice().sort((a, b) => a.order - b.order).map(clipWithInfo)

  if (sortedClips.length === 0) {
    throw new Error('No clips selected.')
  }

  try {
    onProgress?.(5, 'Initializing importer...')

    if (typeof (ffmpeg as any).isRunning === 'function' && (ffmpeg as any).isRunning()) {
      await (ffmpeg as any).terminate()
    }

    await writeInputVideo(ffmpeg, videoSource, inputFileName)

    // Attempt fast stream copy (no re-encode)
    onProgress?.(12, 'Fast path: stream copy attempt')
    const streamCopyFiles: string[] = []
    let streamCopySuccess = true

    for (let i = 0; i < sortedClips.length; i += 1) {
      const clip = sortedClips[i]
      const clipFile = getClipFilename(i)
      tempFiles.push(clipFile)

      try {
        onProgress?.(12 + (i / sortedClips.length) * 18, `Stream copying clip ${i + 1}/${sortedClips.length}`)
        await extractClip(ffmpeg, inputFileName, clip, clipFile, 'copy', crf)
        streamCopyFiles.push(clipFile)
      } catch (e) {
        streamCopySuccess = false
        console.warn('Stream copy failed for clip', clip, e)
        break
      }
    }

    if (streamCopySuccess && streamCopyFiles.length > 0) {
      try {
        await concatClipFiles(ffmpeg, streamCopyFiles, outputFileName)
        onProgress?.(65, 'Stream copy concatenation done')
        const blob = await readOutputBlob(ffmpeg, outputFileName)
        onProgress?.(100, 'Export completed with stream copy')
        return blob
      } catch (e) {
        streamCopySuccess = false
        console.warn('Stream copy concatenation failed:', e)
      }
    }

    // Step 2: partial re-encode each clip edges (fast fallback)
    onProgress?.(67, 'Partial encode fallback')
    const reencodedFiles: string[] = []

    for (let i = 0; i < sortedClips.length; i += 1) {
      const clip = sortedClips[i]
      const clipFile = getClipFilename(i)

      try {
        onProgress?.(67 + (i / sortedClips.length) * 20, `Re-encoding clip ${i + 1}/${sortedClips.length}`)
        await extractClip(ffmpeg, inputFileName, clip, clipFile, 'reencode', crf)
        reencodedFiles.push(clipFile)
      } catch (e) {
        console.warn('Partial encode failed for clip', clip, e)
        throw new Error('Partial encode failed, falling back to full encode')
      }
    }

    try {
      await concatClipFiles(ffmpeg, reencodedFiles, outputFileName)
      const blob = await readOutputBlob(ffmpeg, outputFileName)
      onProgress?.(95, 'Partial encode concatenation done')
      onProgress?.(100, 'Export completed with partial encode')
      return blob
    } catch (e) {
      console.warn('Partial encode concatenation failed, will try full encode:', e)
    }

    // Step 3: Full encode pipeline (all clips through libx264)
    onProgress?.(70, 'Full encode fallback')

    const concatFiles = reencodedFiles.length > 0 ? reencodedFiles : streamCopyFiles
    if (concatFiles.length === 0) {
      throw new Error('No clip artifacts available for full encode')
    }

    // Rebuild concat file with selected segments
    ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatFiles.map(id => `file '${id}'`).join('\n')))

    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', String(crf),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y',
      outputFileName,
    ])

    const finalBlob = await readOutputBlob(ffmpeg, outputFileName)
    onProgress?.(100, 'Full encode complete')

    return finalBlob
  } catch (error) {
    console.error('processClipsDirect error:', error)
    throw error
  } finally {
    try {
      await cleanupFiles(ffmpeg, tempFiles)
    } catch (cleanupError) {
      console.warn('Unable to fully clean FFmpeg FS:', cleanupError)
    }
  }
}

export async function processClipsInWorker(
  videoSource: Blob | string,
  clips: VideoClip[],
  quality: 'fast' | 'medium' | 'slow' = 'medium',
  onProgress?: (progress: number, step: string) => void
): Promise<Blob> {
  if (typeof Worker === 'undefined') {
    return processClipsDirect(videoSource, clips, quality, onProgress)
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./workers/videoProcessorWorker.ts', import.meta.url), {
      type: 'module',
    })

    worker.postMessage({ videoSource, clips, quality })

    worker.onmessage = (event: MessageEvent) => {
      const { type, data } = event.data
      if (type === 'progress') {
        onProgress?.(data.progress, data.step)
      } else if (type === 'result') {
        resolve(data.blob)
        worker.terminate()
      } else if (type === 'error') {
        reject(new Error(data.message))
        worker.terminate()
      }
    }

    worker.onerror = (event: ErrorEvent) => {
      reject(event.error || new Error('Worker error'))
      worker.terminate()
    }

    setTimeout(() => {
      // Fallback to main thread if worker does not respond in time
      if (worker) {
        worker.terminate()
      }
      processClipsDirect(videoSource, clips, quality, onProgress)
        .then(resolve)
        .catch(reject)
    }, 15000)
  })
}

export async function processClips(
  videoSource: Blob | string,
  clips: VideoClip[],
  quality: 'fast' | 'medium' | 'slow' = 'medium',
  onProgress?: (progress: number, step: string) => void
): Promise<Blob> {
  try {
    return await processClipsInWorker(videoSource, clips, quality, onProgress)
  } catch (workerError) {
    console.warn('Worker exports failed, fallback to direct', workerError)
    return processClipsDirect(videoSource, clips, quality, onProgress)
  }
}

export async function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.mp4`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function getFFmpegStatus(): Promise<boolean> {
  return isFFmpegLoaded
}
