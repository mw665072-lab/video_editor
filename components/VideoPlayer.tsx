'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface VideoPlayerProps {
  src: Blob | string | null
  onTimeUpdate?: (time: number) => void
  onDurationUpdate?: (duration: number) => void
  onPlay?: () => void
  onPause?: () => void
  onBuffering?: (isBuffering: boolean) => void
  onError?: (error: Error) => void
  currentTime?: number
  muted?: boolean
  controls?: boolean
  clipStart?: number
  clipEnd?: number
  videoRef?: RefObject<HTMLVideoElement | null>
}

export function VideoPlayer({
  src,
  onTimeUpdate,
  onDurationUpdate,
  onPlay,
  onPause,
  onBuffering,
  onError,
  currentTime = 0,
  muted = false,
  controls = true,
  clipStart,
  clipEnd,
  videoRef: externalVideoRef,
}: VideoPlayerProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef ?? localVideoRef
  const lastReportedTimeRef = useRef(0)

  // Use refs for callbacks to avoid re-subscribing on every render
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onDurationUpdateRef = useRef(onDurationUpdate)
  const onPlayRef = useRef(onPlay)
  const onPauseRef = useRef(onPause)
  const onBufferingRef = useRef(onBuffering)
  const onErrorRef = useRef(onError)

  // Keep refs updated
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate
    onDurationUpdateRef.current = onDurationUpdate
    onPlayRef.current = onPlay
    onPauseRef.current = onPause
    onBufferingRef.current = onBuffering
    onErrorRef.current = onError
  })

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

  // Setup event listeners - only once, callbacks are accessed via refs
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      if (clipEnd !== undefined && video.currentTime >= clipEnd) {
        video.pause()
        video.currentTime = clipEnd
        onPauseRef.current?.()
        onTimeUpdateRef.current?.(clipEnd)
        return
      }

      if (clipStart !== undefined && video.currentTime < clipStart) {
        video.currentTime = clipStart
        return
      }

      onTimeUpdateRef.current?.(video.currentTime)
      lastReportedTimeRef.current = video.currentTime
    }

    const handleDurationChange = () => {
      onDurationUpdateRef.current?.(video.duration)
    }

    const handleLoadedMetadata = () => {
      handleDurationChange()
      if (clipStart !== undefined && clipStart <= video.duration) {
        video.currentTime = clipStart
      }
    }

    const handlePlay = () => {
      onPlayRef.current?.()
      onBufferingRef.current?.(false)
    }

    const handlePause = () => {
      onPauseRef.current?.()
    }

    const handleWaiting = () => {
      onBufferingRef.current?.(true)
    }

    const handleCanPlay = () => {
      onBufferingRef.current?.(false)
    }

    const handleError = () => {
      console.error('Video error:', video.error)
      let errorMessage = 'Video playback error'
      
      if (video.error) {
        switch (video.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading aborted'
            break
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading video'
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video decoding error'
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video source not supported or expired'
            break
        }
      }
      
      onErrorRef.current?.(new Error(errorMessage))
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('canplaythrough', handleCanPlay)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('canplaythrough', handleCanPlay)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('error', handleError)
    }
  }, [clipStart, clipEnd]) // Only re-subscribe if clip bounds change

  // Handle currentTime updates
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const driftFromLastReported = Math.abs(lastReportedTimeRef.current - currentTime)
    const seekThreshold = video.paused ? 0.1 : 2

    // Ignore the player's own time updates while actively playing; only honor
    // explicit external seeks such as timeline scrubs or clip jumps.
    if (driftFromLastReported < 0.35) {
      return
    }

    if (Math.abs(video.currentTime - currentTime) > seekThreshold) {
      video.currentTime = currentTime
      lastReportedTimeRef.current = currentTime
    }
  }, [currentTime])

  // Handle muted prop
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted
    }
  }, [muted])

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
      <div className="w-full min-h-[180px] max-h-[56vh] bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full max-h-[56vh] object-contain rounded-lg"
          controls={controls}
          crossOrigin="anonymous"
          preload="auto"
          playsInline
        />
      </div>
    </div>
  )
}
