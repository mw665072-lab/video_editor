'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateVideoFile, detectVideoPlatform, isDirectVideoUrl, isValidVideoUrl, getYouTubeVideoId } from '@/lib/videoUtils'
import { Upload, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface VideoUploadProps {
  onVideoLoaded: (
    source: Blob | string,
    duration: number,
    fileName?: string,
    sourceType?: 'file' | 'direct' | 'youtube' | 'facebook' | 'unknown'
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
    if (!urlInput.trim()) {
      toast.error('Please enter a valid URL')
      return
    }

    const platform = detectVideoPlatform(urlInput)
    console.log('handleLoadFromURL', { urlInput, platform })

    if (platform === 'youtube' || platform === 'facebook') {
      if (platform === 'youtube') {
        const youTubeId = getYouTubeVideoId(urlInput)
        console.log('YouTube detected, id', youTubeId)
        if (!youTubeId) {
          toast.error('Invalid YouTube URL')
          return
        }
      }

      onVideoLoaded(urlInput, 0, undefined, platform)
      setUrlInput('')
      setUrlLoading(false)
      toast.success('External URL loaded. Clip preview enabled; export requires direct source.')
      return
    }

    if (!isDirectVideoUrl(urlInput)) {
      toast.error('URL is not a supported direct video source. Use MP4/WebM/etc URL or a YouTube/Facebook link.')
      return
    }

    if (!isValidVideoUrl(urlInput)) {
      toast.error('Please enter a valid URL with http:// or https://')
      return
    }

    setUrlLoading(true)
    try {
      // Already validated URL format

      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'

      let loadTimeout: NodeJS.Timeout | null = null
      const timeoutPromise = new Promise((_, reject) => {
        loadTimeout = setTimeout(
          () => reject(new Error('Video loading timeout')),
          15000
        )
      })

      const loadPromise = new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          if (loadTimeout) clearTimeout(loadTimeout)
          resolve()
        }
        video.onerror = () => {
          if (loadTimeout) clearTimeout(loadTimeout)
          reject(new Error('Failed to load video metadata'))
        }
        video.src = urlInput
      })

      await Promise.race([loadPromise, timeoutPromise])

      onVideoLoaded(urlInput, video.duration, undefined, 'direct')
      setUrlInput('')
      toast.success('Direct video URL loaded successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load video from URL'
      toast.error(message)
      console.error('URL video loading error:', error)
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
