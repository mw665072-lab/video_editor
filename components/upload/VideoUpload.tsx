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
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('url')
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
      toast.success('YouTube preview loaded. Server import will run only when you export.')
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
        const resolved = await resolveAndLoad(originalUrl, fallbackLabel)
        if (resolved) {
          toast.success('Loaded via proxy fallback', { id: toastId })
        }
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
  ): Promise<boolean> => {
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
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to load ${platformLabel} video`, { id: toastId })
      return false
    } finally {
      setUrlLoading(false)
    }
  }

  const activeUploadMethod = showUrlUpload ? uploadMethod : 'file'

  return (
    <div className="w-full max-w-2xl mx-auto rounded-[2rem] border border-[#dce5dc] bg-white/95 p-5 shadow-[0_22px_60px_rgba(31,52,36,0.12)] sm:p-6">
      {showUrlUpload && (
        <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-[#dce5dc] bg-[#f1f6ef] p-1.5 sm:flex-row">
          <Button
            variant={activeUploadMethod === 'file' ? 'default' : 'outline'}
            onClick={() => setUploadMethod('file')}
            className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition sm:flex-1 ${activeUploadMethod === 'file' ? 'bg-[#15803d] text-white shadow-[0_8px_20px_rgba(21,128,61,0.22)] hover:bg-[#166534]' : 'border-transparent bg-transparent text-[#526159] hover:bg-white hover:text-[#18231b]'}`}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          <Button
            variant={activeUploadMethod === 'url' ? 'default' : 'outline'}
            onClick={() => setUploadMethod('url')}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${activeUploadMethod === 'url' ? 'bg-[#15803d] text-white shadow-[0_8px_20px_rgba(21,128,61,0.22)] hover:bg-[#166534]' : 'border-transparent bg-transparent text-[#526159] hover:bg-white hover:text-[#18231b]'}`}
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
          className="cursor-pointer rounded-3xl border-2 border-dashed border-[#b9cfbd] bg-[#fbfdf9] p-8 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#15803d] hover:bg-[#f4faf3]"
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
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9f7eb] text-[#15803d]">
            <Upload className="h-6 w-6" />
          </span>
          <h3 className="mb-2 text-lg font-extrabold text-[#18231b]">Upload a video file</h3>
          <p className="mb-3 text-sm text-[#526159]">
            Drag and drop your video here or click to browse
          </p>
          <p className="text-xs text-[#718078]">
            Supported formats: MP4, MOV, AVI, WebM (Max 500MB)
          </p>
          {(isLoading || fileLoading) && (
            <p className="mt-4 text-sm font-semibold text-[#15803d]">Loading video...</p>
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
              className="min-h-11 flex-1 rounded-xl bg-[#15803d] px-5 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(21,128,61,0.22)] hover:bg-[#166534] disabled:bg-[#a6b7aa]"
            >
              {urlLoading ? 'Loading...' : 'Load'}
            </Button>
          </div>
          <div className="rounded-xl border border-[#d7e5d8] bg-[#edf7ef] px-4 py-3 text-xs leading-5 text-[#41634a]">
            Supported URL sources for the MVP: YouTube, Facebook, Instagram, TikTok, X/Twitter, Vimeo, and direct MP4/WebM/M3U8 links.
          </div>
        </div>
      )}
    </div>
  )
}
