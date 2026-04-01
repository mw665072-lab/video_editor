'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateVideoFile, detectVideoPlatform, isDirectVideoUrl, isValidVideoUrl, getYouTubeVideoId } from '@/lib/videoUtils'
import { Upload, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

interface VideoUploadProps {
  onVideoLoaded: (
    source: Blob | string,
    duration: number,
    fileName?: string,
    sourceType?: 'file' | 'direct' | 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'vimeo' | 'proxy' | 'unknown'
  ) => void
  isLoading?: boolean
}

export function VideoUpload({ onVideoLoaded, isLoading = false }: VideoUploadProps) {
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
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
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
    console.log('handleLoadFromURL', { trimmedUrl, platform })

    // ── YouTube ──────────────────────────────────────────────────
    if (platform === 'youtube') {
      const youTubeId = getYouTubeVideoId(trimmedUrl)
      if (!youTubeId) {
        toast.error('Invalid YouTube URL')
        return
      }
      onVideoLoaded(trimmedUrl, 0, undefined, 'youtube')
      setUrlInput('')
      toast.success('YouTube video loaded — clip preview enabled.')
      return
    }

    // ── Facebook ─────────────────────────────────────────────────
    if (platform === 'facebook') {
      setUrlLoading(true)
      try {
        const proxyUrl = `${BACKEND_URL}/api/yt-clip?url=${encodeURIComponent(trimmedUrl)}`
        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'

        const loadPromise = new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve()
          video.onerror = () => reject(new Error('Failed to load Facebook video metadata via proxy'))
          video.src = proxyUrl
        })

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Facebook video loading timeout')), 20000)
        })

        await Promise.race([loadPromise, timeoutPromise])
        onVideoLoaded(proxyUrl, video.duration, undefined, 'proxy')
        setUrlInput('')
        toast.success('Facebook video loaded successfully via proxy')
        return
      } catch (error) {
        console.error('Facebook proxy load error:', error)
        toast.error('Failed to load Facebook video. Video may be private or deleted.')
        return
      } finally {
        setUrlLoading(false)
      }
    }

    // ── Direct video file (.mp4 / .webm / etc.) ──────────────────
    if (platform === 'direct') {
      setUrlLoading(true)
      try {
        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        let loadTimeout: NodeJS.Timeout | null = null
        const timeoutPromise = new Promise<never>((_, reject) => {
          loadTimeout = setTimeout(() => reject(new Error('Video loading timeout')), 15000)
        })
        const loadPromise = new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => { if (loadTimeout) clearTimeout(loadTimeout); resolve() }
          video.onerror = () => { if (loadTimeout) clearTimeout(loadTimeout); reject(new Error('Failed to load video metadata')) }
          video.src = trimmedUrl
        })
        await Promise.race([loadPromise, timeoutPromise])
        onVideoLoaded(trimmedUrl, video.duration, undefined, 'direct')
        setUrlInput('')
        toast.success('Direct video URL loaded successfully')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load video from URL')
      } finally {
        setUrlLoading(false)
      }
      return
    }

    // ── All other URLs (Instagram, TikTok, Twitter/X, Vimeo, etc.) ─
    // Route through the backend yt-dlp proxy so we can play & clip them.
    const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '')
    const proxyUrl = `${BASE_URL}/api/yt-clip?url=${encodeURIComponent(trimmedUrl)}`

    setUrlLoading(true)
    try {
      // Probe the proxy endpoint with a HEAD request to catch errors early.
      const probe = await fetch(proxyUrl, { method: 'HEAD' }).catch(() => null)
      if (probe && !probe.ok) {
        throw new Error(`Could not load video (status ${probe.status}). The URL may not be supported.`)
      }

      // Load metadata via a hidden video element pointing at the proxy stream.
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      let loadTimeout: NodeJS.Timeout | null = null
      const timeoutPromise = new Promise<never>((_, reject) => {
        loadTimeout = setTimeout(() => reject(new Error('Video loading timeout — the platform may not be supported')), 20000)
      })
      const loadPromise = new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => { if (loadTimeout) clearTimeout(loadTimeout); resolve() }
        video.onerror = () => {
          if (loadTimeout) clearTimeout(loadTimeout)
          reject(new Error('Browser could not play the video stream from this URL'))
        }
        video.src = proxyUrl
      })

      await Promise.race([loadPromise, timeoutPromise])

      const sourceType = (['instagram', 'tiktok', 'twitter', 'vimeo'] as const).includes(platform as any)
        ? (platform as 'instagram' | 'tiktok' | 'twitter' | 'vimeo')
        : 'proxy'

      onVideoLoaded(proxyUrl, video.duration || 0, undefined, sourceType)
      setUrlInput('')
      toast.success(`${platform === 'unknown' ? 'Video' : platform.charAt(0).toUpperCase() + platform.slice(1)} loaded via stream proxy.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load video from URL'
      toast.error(message)
      console.error('URL proxy loading error:', error)
    } finally {
      setUrlLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-2 mb-6 rounded-xl border border-slate-800/50 p-2">
        <Button
          variant={uploadMethod === 'file' ? 'default' : 'outline'}
          onClick={() => setUploadMethod('file')}
          className="w-full sm:flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 hover:text-white bg-slate-900/60 font-semibold"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload File
        </Button>
        <Button
          variant={uploadMethod === 'url' ? 'default' : 'outline'}
          onClick={() => setUploadMethod('url')}
          className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 hover:text-white bg-slate-900/60 font-semibold"
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Load from URL
        </Button>
      </div>

      {uploadMethod === 'file' ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center hover:border-cyan-300 transition-colors duration-200 cursor-pointer bg-slate-900/40"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading || fileLoading}
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Upload a video file</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your video here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: MP4, MOV, AVI, WebM (Max 500MB)
          </p>
          {(isLoading || fileLoading) && (
            <p className="text-sm text-primary mt-4">Loading video...</p>
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
              className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 hover:text-white bg-slate-900/60 font-semibold"

            >
              {urlLoading ? 'Loading...' : 'Load'}
            </Button>
          </div>
          {/* <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Ensure the video URL supports CORS or the video player may not work properly.
            </p>
          </div> */}
        </div>
      )}
    </div>
  )
}
