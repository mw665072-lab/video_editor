import { VideoClip } from './types'

export function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '00:00:00'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function timeToPixels(time: number, pixelsPerSecond: number): number {
  return time * pixelsPerSecond
}

export function pixelsToTime(pixels: number, pixelsPerSecond: number): number {
  return pixels / pixelsPerSecond
}

export function generateClipId(): string {
  return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function validateClip(clip: VideoClip, videoDuration: number): { valid: boolean; error?: string } {
  if (clip.startTime < 0) {
    return { valid: false, error: 'Start time cannot be negative' }
  }
  if (clip.endTime > videoDuration) {
    return { valid: false, error: 'End time exceeds video duration' }
  }
  if (clip.startTime >= clip.endTime) {
    return { valid: false, error: 'Start time must be before end time' }
  }
  return { valid: true }
}

export function calculateTotalDuration(clips: VideoClip[]): number {
  return clips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0)
}

export function getClipDuration(clip: VideoClip): number {
  return clip.endTime - clip.startTime
}

export async function validateVideoFile(file: File): Promise<{ valid: boolean; error?: string }> {
  const validMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
  const validExtensions = ['.mp4', '.mov', '.avi', '.webm']
  
  const hasMimeType = validMimeTypes.includes(file.type)
  const hasExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  
  if (!hasMimeType && !hasExtension) {
    return { 
      valid: false, 
      error: 'Unsupported video format. Please upload MP4, MOV, AVI, or WebM.' 
    }
  }
  
  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File size exceeds 500MB limit' 
    }
  }
  
  return { valid: true }
}

export function getYouTubeVideoId(url: string): string | null {
  const normalized = url.trim()

  try {
    const parsed = new URL(normalized)
    const host = parsed.host.toLowerCase()

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const id = parsed.pathname.slice(1)
      if (/^[\w-]{11}$/.test(id)) return id
    }

    if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube-nocookie.com')
    ) {
      const searchParams = parsed.searchParams
      const fromParam = searchParams.get('v')
      if (fromParam && /^[\w-]{11}$/.test(fromParam)) return fromParam

      const pathMatch = parsed.pathname.match(/\/embed\/([\w-]{11})/)
      if (pathMatch?.[1]) return pathMatch[1]

      const shortMatch = parsed.pathname.match(/\/v\/([\w-]{11})/)
      if (shortMatch?.[1]) return shortMatch[1]

      const shortsMatch = parsed.pathname.match(/\/shorts\/([\w-]{11})/)
      if (shortsMatch?.[1]) return shortsMatch[1]

      const liveMatch = parsed.pathname.match(/\/live\/([\w-]{11})/)
      if (liveMatch?.[1]) return liveMatch[1]
    }
  } catch {
    // Fallback to regex for non-standard cases or invalid URL parsing
  }

  const patterns = [
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/))([\w-]{11})/, // standard and embed URLs
    /(?:youtu\.be\/)([\w-]{11})/, // short URL
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

export function getYouTubeStartTime(url: string): number {
  const normalized = url.trim()
  const queryMatch = normalized.match(/[?&](?:t|start)=([^&]+)/)
  if (!queryMatch?.[1]) return 0

  const raw = queryMatch[1]

  // direct seconds (e.g. 115 or 115s)
  const secondsDirect = parseInt(raw.replace(/s$/, ''), 10)
  if (!Number.isNaN(secondsDirect) && /^\d+s?$/.test(raw)) {
    return secondsDirect
  }

  // YouTube time format like 1h2m30s
  const timeMatch = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/) 
  if (!timeMatch) return 0

  const hours = parseInt(timeMatch[1] ?? '0', 10)
  const minutes = parseInt(timeMatch[2] ?? '0', 10)
  const seconds = parseInt(timeMatch[3] ?? '0', 10)

  if ([hours, minutes, seconds].every((v) => Number.isNaN(v))) return 0
  return hours * 3600 + minutes * 60 + seconds
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url)
  if (!id) return null

  const start = getYouTubeStartTime(url)
  const startParam = start > 0 ? `&start=${start}` : ''

  return `https://www.youtube.com/embed/${id}?autoplay=0&controls=1${startParam}`
}

export function sortClipsByOrder(clips: VideoClip[]): VideoClip[] {
  return [...clips].sort((a, b) => a.order - b.order)
}

export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function revokeBlobUrl(url: string): void {
  try {
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error revoking blob URL:', error)
  }
}

export function detectVideoPlatform(
  url: string
): 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'vimeo' | 'direct' | 'unknown' {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const pathname = parsed.pathname.toLowerCase()

    if (
      host === 'youtu.be' ||
      host.endsWith('.youtu.be') ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube-nocookie.com')
    ) return 'youtube'
    if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch' || host.endsWith('.fbsbx.com')) return 'facebook'
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram'
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok'
    if (host === 'twitter.com' || host.endsWith('.twitter.com') || host === 'x.com' || host.endsWith('.x.com')) return 'twitter'
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return 'vimeo'

    const directExt = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m3u8']
    if (directExt.some(ext => pathname.endsWith(ext))) {
      return 'direct'
    }

    if (['http:', 'https:'].includes(parsed.protocol)) return 'unknown'

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function isDirectVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const pathname = parsed.pathname.toLowerCase()
    const directExt = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m3u8']
    return directExt.some(ext => pathname.endsWith(ext))
  } catch {
    return false
  }
}

export function isFacebookShareUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const pathname = parsed.pathname.toLowerCase()

    if (!(host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch')) {
      return false
    }

    return pathname.startsWith('/share/') || host === 'fb.watch'
  } catch {
    return false
  }
}

export function isValidVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function getClipIndexAtTime(clips: VideoClip[], time: number): number {
  const sorted = sortClipsByOrder(clips)
  return sorted.findIndex(clip => time >= clip.startTime && time < clip.endTime)
}

export function getNextClip(clips: VideoClip[], currentIndex: number): VideoClip | null {
  const sorted = sortClipsByOrder(clips)
  return sorted[currentIndex + 1] ?? null
}

export function getVirtualTimelineDuration(clips: VideoClip[]): number {
  return clips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0)
}
