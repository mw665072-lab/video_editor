export interface VideoClip {
  id: string
  startTime: number // in seconds
  endTime: number // in seconds
  originalIndex?: number
  order: number
  duration?: number
  thumbnailUrl?: string
}

export interface EditorState {
  videoSource: Blob | string | null
  videoOriginalSource?: string
  videoSourceType?: 'file' | 'direct' | 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'vimeo' | 'proxy' | 'unknown'
  videoDuration: number
  videoFileName?: string
  clips: VideoClip[]
  currentTime: number
  isPlaying: boolean
  selectedClipId: string | null
}

export interface ExportOptions {
  videoCodec?: string
  audioCodec?: string
  bitrate?: string
  quality?: 'fast' | 'medium' | 'slow'
}

export interface ExportProgress {
  isExporting: boolean
  progress: number // 0-100
  currentStep?: string
  error?: string
}
