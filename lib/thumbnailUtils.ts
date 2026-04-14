import { VideoClip } from './types'
import { requestWithAuth } from './api'

export async function generateClipThumbnail(source: Blob | string, time: number): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.pause()
      video.src = ''
      video.removeAttribute('src')
      if (video.parentNode) {
        video.parentNode.removeChild(video)
      }
    }

    let url: string | null = null
    if (source instanceof Blob) {
      url = URL.createObjectURL(source)
      video.src = url
    } else {
      video.src = source
    }

    const onError = (e: any) => {
      cleanup()
      if (url) URL.revokeObjectURL(url)
      reject(new Error(`Thumbnail generation failed: ${e?.message || 'unknown'}`))
    }

    const onSeeked = async () => {
      try {
        const width = 320
        const height = Math.floor(video.videoHeight * (width / video.videoWidth))

        let canvas: OffscreenCanvas | HTMLCanvasElement

        if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(width, height)
        } else {
          const c = document.createElement('canvas')
          c.width = width
          c.height = height
          canvas = c
        }

        const ctx = ('getContext' in canvas ? (canvas as HTMLCanvasElement).getContext('2d') : (canvas as OffscreenCanvas).getContext('2d'))
        if (!ctx) throw new Error('Canvas context unavailable')

        ctx.drawImage(video, 0, 0, width, height)

        if (canvas instanceof HTMLCanvasElement) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
          cleanup()
          if (url) URL.revokeObjectURL(url)
          resolve(dataUrl)
        } else {
          const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 })
          const dataUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader()
            reader.onload = () => (typeof reader.result === 'string' ? res(reader.result) : rej(new Error('Failed to read thumbnail')))
            reader.onerror = rej
            reader.readAsDataURL(blob)
          })
          cleanup()
          if (url) URL.revokeObjectURL(url)
          resolve(dataUrl)
        }
      } catch (thr) {
        onError(thr)
      }
    }

    const onLoadedMetadata = () => {
      if (time < 0 || time > video.duration) {
        video.currentTime = 0
      } else {
        video.currentTime = time
      }
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)

    video.load()
  })
}

export async function generateRemoteClipThumbnail(url: string, time: number): Promise<string> {
  const response = await requestWithAuth(
    `/api/thumbnail?url=${encodeURIComponent(url)}&time=${encodeURIComponent(String(Math.max(0, time)))}`,
    { method: 'GET' },
  )

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Thumbnail request failed (${response.status})`)
  }

  const blob = await response.blob()

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read thumbnail'))
    }
    reader.onerror = () => reject(new Error('Failed to read thumbnail'))
    reader.readAsDataURL(blob)
  })
}

export function createThumbnailFromClip(clip: VideoClip): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='100%25' height='100%25' fill='%23111'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23fff' font-family='system-ui' font-size='20'%3EClip ${clip.order + 1} %3C/text%3E%3C/svg%3E`
}
