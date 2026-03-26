'use client'

import { useEffect, useRef } from 'react'

interface VideoPlayerProps {
  src: Blob | string | null
  onTimeUpdate?: (time: number) => void
  onDurationUpdate?: (duration: number) => void
  onPlay?: () => void
  onPause?: () => void
  onBuffering?: (isBuffering: boolean) => void
  currentTime?: number
  muted?: boolean
  controls?: boolean
  clipStart?: number
  clipEnd?: number
}

export function VideoPlayer({
  src,
  onTimeUpdate,
  onDurationUpdate,
  onPlay,
  onPause,
  onBuffering,
  currentTime = 0,
  muted = false,
  controls = true,
  clipStart,
  clipEnd,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle source changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (src instanceof Blob) {
      const url = URL.createObjectURL(src)
      video.src = url

      return () => {
        URL.revokeObjectURL(url)
      }
    } else if (typeof src === 'string') {
      video.src = src
    }
  }, [src])

  // Setup event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      if (clipEnd !== undefined && video.currentTime >= clipEnd) {
        video.pause()
        video.currentTime = clipEnd
        onPause?.()
        onTimeUpdate?.(clipEnd)
        return
      }

      if (clipStart !== undefined && video.currentTime < clipStart) {
        video.currentTime = clipStart
        return
      }

      onTimeUpdate?.(video.currentTime)
    }

    const handleDurationChange = () => {
      onDurationUpdate?.(video.duration)
    }

    const handleLoadedMetadata = () => {
      onDurationChange()
      if (clipStart !== undefined && clipStart <= video.duration) {
        video.currentTime = clipStart
      }
    }

    const handlePlay = () => {
      onPlay?.()
      onBuffering?.(false)
    }

    const handlePause = () => {
      onPause?.()
    }

    const handleWaiting = () => {
      onBuffering?.(true)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('waiting', handleWaiting)
    }
  }, [onTimeUpdate, onDurationUpdate, onPlay, onPause, clipStart, clipEnd])

  // Handle currentTime updates
  useEffect(() => {
    const video = videoRef.current
    if (video && Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime
    }
  }, [currentTime])

  // Handle muted prop
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted
    }
  }, [muted])

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden">
      <div className="aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls={controls}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  )
}
