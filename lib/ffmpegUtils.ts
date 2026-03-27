import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { VideoClip } from './types'
import { detectVideoPlatform } from './videoUtils'

let ffmpegInstance: FFmpeg | null = null
let isFFmpegLoaded = false

async function safeDeleteFile(ffmpeg: FFmpeg, file: string) {
  try {
    await ffmpeg.deleteFile(file)
  } catch {
    // ignore – file may not exist
  }
}

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

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function readStreamToArrayBuffer(
  stream: ReadableStream<Uint8Array>,
  totalBytes: number | null,
  onProgress?: (loaded: number, total?: number) => void
): Promise<ArrayBuffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    chunks.push(value)
    loaded += value.byteLength

    if (onProgress) {
      onProgress(loaded, totalBytes ?? undefined)
    }
  }

  const result = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }

  return result.buffer
}

async function fetchVideoSource(
  videoSource: Blob | string,
  onProgress?: (loaded: number, total?: number) => void,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<ArrayBuffer> {
  if (videoSource instanceof Blob) {
    return await videoSource.arrayBuffer()
  }

  const platform = detectVideoPlatform(videoSource)
  if (platform === 'youtube' || platform === 'facebook') {
    const proxyUrl = `/api/yt-clip?url=${encodeURIComponent(videoSource)}&quality=${quality}`

    let response: Response
    try {
      response = await fetchWithTimeout(proxyUrl, 60000)
    } catch (err) {
      // retry once on transient failure
      response = await fetchWithTimeout(proxyUrl, 60000)
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Failed to fetch external video source from proxy (${response.status}): ${body || response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('video')) {
      const textBody = await response.text().catch(() => '')
      throw new Error(`Proxy returned non-video response (${contentType}): ${textBody.slice(0, 512)}`)
    }

    const contentLengthHeader = response.headers.get('content-length')
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null

    if (response.body) {
      return await readStreamToArrayBuffer(response.body, contentLength, onProgress)
    }

    return await response.arrayBuffer()
  }

  let response: Response
  try {
    response = await fetchWithTimeout(videoSource, 60000)
  } catch (err) {
    response = await fetchWithTimeout(videoSource, 60000)
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.statusText}`)
  }

  const contentLengthHeader = response.headers.get('content-length')
  const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null

  if (response.body) {
    return await readStreamToArrayBuffer(response.body, contentLength, onProgress)
  }

  return await response.arrayBuffer()
}


async function writeInputVideo(
  ffmpeg: FFmpeg,
  videoSource: Blob | string,
  inputFileName: string,
  onProgress?: (loaded: number, total?: number) => void,
  quality: 'low' | 'medium' | 'high' = 'medium'
) {
  const arrayBuffer = await fetchVideoSource(videoSource, onProgress, quality)
  await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer))
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
  await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatContent))

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
  const startTime = Number(clip.startTime.toFixed(3))
  const endTime = Number(clip.endTime.toFixed(3))

  if (method === 'copy') {
    await ffmpeg.exec([
      '-ss', String(startTime),
      '-i', inputFileName,
      '-to', String(endTime),
      '-c', 'copy',
      '-avoid_negative_ts', '1',
      '-y',
      outputFileName,
    ])
  } else {
    await ffmpeg.exec([
      '-ss', String(startTime),
      '-i', inputFileName,
      '-to', String(endTime),
      '-c:v', 'libx264',
      '-preset', 'veryfast',
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
    await safeDeleteFile(ffmpeg, file)
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

  let currentStage = 'extracting'
  const progressHandler = ({ progress }: { progress: number }) => {
    if (!onProgress) return
    const ratio = progress || 0

    if (currentStage === 'extracting') {
      const pct = 20 + Math.round(ratio * 40)
      onProgress(Math.min(70, pct), 'extracting clips')
    } else if (currentStage === 'merging') {
      const pct = 70 + Math.round(ratio * 20)
      onProgress(Math.min(95, pct), 'merging clips')
    } else if (currentStage === 'finalizing') {
      const pct = 95 + Math.round(ratio * 5)
      onProgress(Math.min(99, pct), 'finalizing')
    }
  }

  let manualProgress = 20
  let progressInterval: ReturnType<typeof setInterval> | null = null

  try {
    onProgress?.(5, 'fetching video')

    // This interval provides UI movement when ffmpeg emits sparse progress events
    progressInterval = setInterval(() => {
      if (!onProgress) return
      if (currentStage === 'extracting') {
        manualProgress = Math.min(60, manualProgress + 2)
        onProgress(manualProgress, 'extracting clips')
      } else if (currentStage === 'merging') {
        manualProgress = Math.min(90, manualProgress + 1)
        onProgress(manualProgress, 'merging clips')
      } else if (currentStage === 'finalizing') {
        manualProgress = Math.min(98, manualProgress + 1)
        onProgress(manualProgress, 'finalizing')
      }
    }, 2000)

    // Cleanup from prior runs to avoid FS conflict
    const allCandidates = ['input.mp4', 'output.mp4', 'concat.txt', ...sortedClips.map((_, i) => `clip_${i}.mp4`)]
    for (const file of allCandidates) {
      await safeDeleteFile(ffmpeg, file)
    }

    const downloadQuality: 'low' | 'medium' | 'high' =
      quality === 'fast' ? 'low' : quality === 'slow' ? 'high' : 'medium'

    await writeInputVideo(
      ffmpeg,
      videoSource,
      inputFileName,
      (loaded, total) => {
        if (!onProgress) return

        if (total && total > 0) {
          const progressValue = 5 + Math.round((loaded / total) * 15)
          onProgress(Math.min(20, progressValue), 'fetching video')
        } else {
          const progressValue = 5 + Math.round(Math.min(15, loaded / (1024 * 1024)))
          onProgress(Math.min(20, progressValue), 'fetching video')
        }
      },
      downloadQuality
    )

    onProgress?.(20, 'extracting clips')

    ffmpeg.on('progress', progressHandler)

    onProgress?.(20, 'extracting clips')

    const streamCopyFiles: string[] = []
    let streamCopySuccess = true

    for (let i = 0; i < sortedClips.length; i += 1) {
      const clip = sortedClips[i]
      const clipFile = getClipFilename(i)
      tempFiles.push(clipFile)

      try {
        onProgress?.(20 + Math.round((i / sortedClips.length) * 20), `extracting clip ${i + 1}/${sortedClips.length}`)
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
        currentStage = 'merging'
        onProgress?.(60, 'merging clips')
        await concatClipFiles(ffmpeg, streamCopyFiles, outputFileName)
        onProgress?.(80, 'finalizing')
        const blob = await readOutputBlob(ffmpeg, outputFileName)
        onProgress?.(100, 'done')
        return blob
      } catch (e) {
        streamCopySuccess = false
        console.warn('Stream copy concatenation failed:', e)
      }
    }

    onProgress?.(65, 'extracting clips')
    const reencodedFiles: string[] = []

    for (let i = 0; i < sortedClips.length; i += 1) {
      const clip = sortedClips[i]
      const clipFile = getClipFilename(i)

      try {
        onProgress?.(65 + Math.round((i / sortedClips.length) * 20), `re-encoding clip ${i + 1}/${sortedClips.length}`)
        await extractClip(ffmpeg, inputFileName, clip, clipFile, 'reencode', crf)
        reencodedFiles.push(clipFile)
      } catch (e) {
        console.warn('Re-encode failed for clip', clip, e)
        throw new Error('Re-encode failed, falling back to full encode')
      }
    }

    const sourceFiles = reencodedFiles.length > 0 ? reencodedFiles : streamCopyFiles
    if (sourceFiles.length === 0) {
      throw new Error('No clip artifacts available for concat')
    }

    currentStage = 'merging'
    onProgress?.(70, 'merging clips')

    await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(sourceFiles.map(id => `file '${id}'`).join('\n')))

    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', String(crf),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y',
      outputFileName,
    ])

    currentStage = 'finalizing'
    onProgress?.(90, 'finalizing')

    const finalBlob = await readOutputBlob(ffmpeg, outputFileName)
    onProgress?.(100, 'done')

    return finalBlob
  } catch (error) {
    console.error('processClipsDirect error:', error)
    // Reset FFmpeg instance so next export gets a clean state
    isFFmpegLoaded = false
    ffmpegInstance = null
    throw error
  } finally {
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }

    try {
      ffmpeg.off('progress', progressHandler)
      await cleanupFiles(ffmpeg, tempFiles)
      await safeDeleteFile(ffmpeg, 'concat.txt')
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

async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export async function processClipsServer(
  videoSource: string,
  clips: VideoClip[],
  quality: 'fast' | 'medium' | 'slow' = 'medium',
  onProgress?: (progress: number, step: string) => void
): Promise<Blob> {
  const payload = { videoSource, clips, quality }

  const apiUrl = `${window.location.origin}/api/export-video`
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.statusText)
    throw new Error(`Server export failed: ${err}`)
  }

  const { jobId } = await resp.json()
  if (!jobId) throw new Error('Server export returned no jobId')

  let lastProgress = 0

  while (true) {
    const statusResp = await fetch(`/api/export-video?jobId=${encodeURIComponent(jobId)}&action=status`)
    if (!statusResp.ok) {
      const err = await statusResp.text().catch(() => statusResp.statusText)
      throw new Error(`Status request failed: ${err}`)
    }

    const status = (await statusResp.json()) as {
      status: 'pending' | 'running' | 'done' | 'failed'
      progress: number
      step: string
      error?: string
    }

    if (status.error) {
      throw new Error(status.error)
    }

    lastProgress = status.progress
    onProgress?.(status.progress, status.step)

    if (status.status === 'done') break
    if (status.status === 'failed') throw new Error('Export process failed on server')

    await sleep(700)
  }

  const downloadResp = await fetch(`/api/export-video?jobId=${encodeURIComponent(jobId)}&action=download`)
  if (!downloadResp.ok) {
    const err = await downloadResp.text().catch(() => downloadResp.statusText)
    throw new Error(`Download failed: ${err}`)
  }

  const contentLength = Number(downloadResp.headers.get('content-length') || '0')
  const reader = downloadResp.body?.getReader()
  if (!reader) {
    throw new Error('Download stream unavailable')
  }

  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.length

      if (contentLength && contentLength > 0) {
        const pct = 100 * (received / contentLength)
        onProgress?.(Math.min(99, pct), 'downloading output')
      } else {
        onProgress?.(
          Math.min(99, lastProgress + Math.min(99 - lastProgress, (received / (1024 * 1024)) * 20)),
          'downloading output'
        )
      }
    }
  }

  const blob = new Blob(chunks, { type: 'video/mp4' })
  onProgress?.(100, 'done')

  return blob
}

export async function processClips(
  videoSource: Blob | string,
  clips: VideoClip[],
  quality: 'fast' | 'medium' | 'slow' = 'medium',
  onProgress?: (progress: number, step: string) => void
): Promise<Blob> {
  try {
    if (typeof videoSource === 'string' && /^https?:\/\//.test(videoSource)) {
      return await processClipsServer(videoSource, clips, quality, onProgress)
    }
    return await processClipsInWorker(videoSource, clips, quality, onProgress)
  } catch (serverError) {
    console.warn('Server export failed, falling back to client FFmpeg:', serverError)
    return processClipsInWorker(videoSource, clips, quality, onProgress)
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
