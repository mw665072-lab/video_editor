'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateVideoFile, detectVideoPlatform, isFacebookShareUrl, isValidVideoUrl, getYouTubeVideoId } from '@/lib/videoUtils'
import { Upload, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { hlsPrepare, ytResolve } from '@/lib/api'

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

interface VideoUploadProps {
  onVideoLoaded: (
    source: Blob | string,
    duration: number,
    fileName?: string,
    sourceType?: 'file' | 'direct' | 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'vimeo' | 'proxy' | 'unknown',
    originalSource?: string
  ) => void
  /** Called when background yt-info resolves with accurate duration */
  onDurationResolved?: (duration: number, title?: string) => void
  isLoading?: boolean
  showUrlUpload?: boolean
}

export function VideoUpload({ onVideoLoaded, onDurationResolved, isLoading = false, showUrlUpload = true }: VideoUploadProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    const validation = await validateVideoFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid video file')
      return
    }

    setFileLoading(true)

    try {
      const blob = new Blob([file], { type: file.type })
      const video = document.createElement('video')
      const url = URL.createObjectURL(blob)

      const loadTimeout = setTimeout(() => {
        URL.revokeObjectURL(url)
        setFileLoading(false)
        toast.error('Video loading timeout - file may be corrupted')
      }, 30000)

      video.onloadedmetadata = () => {
        clearTimeout(loadTimeout)
        URL.revokeObjectURL(url)
        setFileLoading(false)
        onVideoLoaded(blob, video.duration, file.name, 'file')
        toast.success('Video uploaded successfully')
      }

      video.onerror = () => {
        clearTimeout(loadTimeout)
        URL.revokeObjectURL(url)
        setFileLoading(false)
        toast.error('Failed to load video metadata')
      }

      video.src = url
    } catch (error) {
      setFileLoading(false)
      console.error('Error processing video:', error)
      toast.error('Failed to process video file')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => handleFileSelect(file))
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => handleFileSelect(file))
    }
  }

  const handleLoadFromURL = async () => {
    const trimmedUrl = urlInput.trim()
    if (!trimmedUrl) {
      toast.error('Please enter a valid URL')
      return
    }

    if (!isValidVideoUrl(trimmedUrl)) {
      toast.error('Please enter a valid URL with http:// or https://')
      return
    }

    const platform = detectVideoPlatform(trimmedUrl)

    if (platform === 'youtube') {
      const youTubeId = getYouTubeVideoId(trimmedUrl)
      if (!youTubeId) {
        toast.error('Invalid YouTube URL')
        return
      }
      onVideoLoaded(trimmedUrl, 0, undefined, 'youtube', trimmedUrl)
      setUrlInput('')
      toast.success('YouTube video loaded — clip preview enabled.')
      return
    }

    if (platform === 'facebook') {
      const isShareUrl = isFacebookShareUrl(trimmedUrl)
      if (isShareUrl) {
        await resolveAndLoad(trimmedUrl, 'Facebook')
      } else {
        await hlsPrepareAndLoad(trimmedUrl, 'facebook')
      }
      return
    }

    if (platform === 'direct') {
      setUrlLoading(true)
      try {
        const proxiedUrl = `${BACKEND_URL}/api/stream?url=${encodeURIComponent(trimmedUrl)}`
        onVideoLoaded(proxiedUrl, 0, undefined, 'direct', trimmedUrl)
        setUrlInput('')
        toast.success('Direct video URL loaded via backend proxy')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load video from URL')
      } finally {
        setUrlLoading(false)
      }
      return
    }

    const sourceType = (['instagram', 'tiktok', 'twitter', 'vimeo'] as const).includes(platform as any)
      ? (platform as 'instagram' | 'tiktok' | 'twitter' | 'vimeo')
      : 'proxy'
    await hlsPrepareAndLoad(trimmedUrl, sourceType)
  }

  const hlsPrepareAndLoad = async (
    originalUrl: string,
    sourceType: 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'vimeo' | 'proxy'
  ) => {
    setUrlLoading(true)
    const platformLabel = sourceType === 'proxy' ? 'Video' : sourceType.charAt(0).toUpperCase() + sourceType.slice(1)
    const toastId = `hls-${Date.now()}`

    toast.loading(`Preparing ${platformLabel} stream…`, { id: toastId })

    try {
      const data = await hlsPrepare(originalUrl, sourceType)

      const fullHlsUrl = data.hlsUrl.startsWith('http')
        ? data.hlsUrl
        : `${BACKEND_URL}${data.hlsUrl}`

      onVideoLoaded(fullHlsUrl, data.duration || 0, data.title || undefined, sourceType, originalUrl)
      if (data.duration > 0) {
        onDurationResolved?.(data.duration, data.title)
      }
      setUrlInput('')
      toast.success(
        `${platformLabel} prepared${data.title && data.title !== 'Untitled' ? ` — ${data.title}` : ''} (Starting HLS stream)`,
        { id: toastId }
      )
    } catch (error) {
      console.warn(`[VideoUpload] HLS prepare failed, falling back to proxy:`, error)
      toast.loading(`HLS failed, trying proxy fallback…`, { id: toastId })
      try {
        const fallbackLabel = sourceType === 'proxy'
          ? 'Video'
          : sourceType.charAt(0).toUpperCase() + sourceType.slice(1)
        await resolveAndLoad(originalUrl, fallbackLabel)
        toast.success('Loaded via proxy fallback', { id: toastId })
      } catch (fallbackError) {
        toast.error(
          fallbackError instanceof Error ? fallbackError.message : `Failed to load ${platformLabel} video`,
          { id: toastId }
        )
      }
    } finally {
      setUrlLoading(false)
    }
  }

  const resolveAndLoad = async (
    originalUrl: string,
    platformLabel: string
  ) => {
    setUrlLoading(true)
    const toastId = `resolve-${Date.now()}`

    toast.loading(`Resolving ${platformLabel} URL…`, { id: toastId })

    try {
      const data = await ytResolve(originalUrl)

      const fullStreamUrl = data.streamUrl.startsWith('http')
        ? data.streamUrl
        : `${BACKEND_URL}${data.streamUrl}`

      onVideoLoaded(fullStreamUrl, data.duration || 0, data.title || undefined, 'proxy', originalUrl)
      if (data.duration > 0) {
        onDurationResolved?.(data.duration, data.title)
      }
      setUrlInput('')
      toast.success(
        `${platformLabel} loaded${data.title && data.title !== 'Untitled' ? ` — ${data.title}` : ''}`,
        { id: toastId }
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to load ${platformLabel} video`, { id: toastId })
    } finally {
      setUrlLoading(false)
    }
  }

  const activeUploadMethod = showUrlUpload ? uploadMethod : 'file'

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-[#12072f]/80 p-4">
      {showUrlUpload && (
        <div className="flex flex-col sm:flex-row gap-2 mb-6 rounded-3xl border border-white/10 bg-[#150b40]/70 p-2">
          <Button
            variant={activeUploadMethod === 'file' ? 'default' : 'outline'}
            onClick={() => setUploadMethod('file')}
            className="w-full sm:flex-1 rounded-lg px-4 py-2 text-white text-sm bg-[#150b40]/80 hover:bg-[#1f0f4e] font-semibold"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          <Button
            variant={activeUploadMethod === 'url' ? 'default' : 'outline'}
            onClick={() => setUploadMethod('url')}
            className="flex-1 rounded-lg px-4 py-2 text-white text-sm bg-[#150b40]/80 hover:bg-[#1f0f4e] font-semibold"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Load from URL
          </Button>
        </div>
      )}

      {activeUploadMethod === 'file' ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-white/20 rounded-3xl p-6 text-center transition-colors duration-200 cursor-pointer bg-[#150b40]/60 hover:border-purple-400"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading || fileLoading}
          />
          <Upload className="w-10 h-10 mx-auto mb-3 text-purple-200" />
          <h3 className="text-lg font-semibold mb-2 text-white">Upload a video file</h3>
          <p className="text-sm text-purple-200/70 mb-3">
            Drag and drop your video here or click to browse
          </p>
          <p className="text-xs text-purple-200/60">
            Supported formats: MP4, MOV, AVI, WebM (Max 500MB)
          </p>
          {(isLoading || fileLoading) && (
            <p className="text-sm text-purple-200 mt-4">Loading video...</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="url"
              placeholder="Enter video URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={urlLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLoadFromURL()
                }
              }}
            />
            <Button
              onClick={handleLoadFromURL}
              disabled={urlLoading || !urlInput.trim()}
              className="flex-1 rounded-lg px-4 py-2 text-white text-sm bg-purple-600 hover:bg-purple-500 font-semibold"
            >
              {urlLoading ? 'Loading...' : 'Load'}
            </Button>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#150b40]/80 px-3 py-2 text-xs text-purple-200/80">
            Supported URL sources for the MVP: YouTube, Facebook, Instagram, TikTok, X/Twitter, Vimeo, and direct MP4/WebM/M3U8 links.
          </div>
        </div>
      )}
    </div>
  )
}
