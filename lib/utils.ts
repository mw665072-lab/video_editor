import { VideoFilters } from '@/store/editorStore'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export async function extractThumbnail(objectUrl: string, time: number = 1): Promise<string> {
  return new Promise<string>((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(time, video.duration)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 192
        canvas.height = 108
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, 192, 108)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        } else {
          resolve('')
        }
      } catch {
        resolve('')
      }
    }
    video.onerror = () => resolve('')
    video.src = objectUrl
  })
}


export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}


export function buildFilterString(f: VideoFilters): string {
  return [
    `brightness(${f.brightness})`,
    `contrast(${f.contrast})`,
    `saturate(${f.saturation})`,
    `hue-rotate(${f.hue}deg)`,
    `blur(${f.blur}px)`,
    `sepia(${f.sepia / 100})`,
    `grayscale(${f.grayscale})`,
    `invert(${f.invert / 100})`,
  ].join(' ')
}