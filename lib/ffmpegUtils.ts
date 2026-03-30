import { VideoClip } from './types'

// Frontend remains UI-only; backend handles all processing via POST /api/clip-video.

export async function processClips(
  videoSource: Blob | string,
  clips: VideoClip[],
  quality: 'fast' | 'medium' | 'slow' = 'medium',
  onProgress?: (progress: number, step: string) => void
): Promise<Blob> {
  throw new Error('processClips is deprecated; call backend /api/clip-video through lib/api.ts')
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
  return false
}
