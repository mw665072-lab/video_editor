'use client'

/**
 * SocialVideoPlayer.tsx
 *
 * HLS-based video player for social media sources (Facebook, TikTok, Instagram, etc.)
 *
 * Uses hls.js — the same library used internally by browsers for HLS streams.
 * This gives smooth, buffer-free playback identical to YouTube's react-youtube embed:
 *   - Video is split into 6-second segments on the backend
 *   - hls.js preloads the next 2-3 segments ahead of current time automatically
 *   - Seeking loads only the needed segment, not a giant range request
 *   - Long videos (1hr+) play perfectly — no buffering every second
 */

import { useEffect, useRef, useCallback, useState, type RefObject } from 'react'
import Hls, { Events, ErrorData, HlsConfig, ErrorTypes } from 'hls.js'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 90000 // 90 seconds timeout

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '')



interface SocialVideoPlayerProps {
  /** Full HLS playlist URL: /api/hls/:jobId/index.m3u8 */
  hlsUrl: string
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

export function SocialVideoPlayer({
  hlsUrl,
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
}: SocialVideoPlayerProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = (externalVideoRef ?? localVideoRef) as RefObject<HTMLVideoElement>
  const hlsRef = useRef<Hls | null>(null)

  const [isInitializing, setIsInitializing] = useState(true)
  const [isPollReady, setIsPollReady] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [pollStatus, setPollStatus] = useState<'idle' | 'polling' | 'ready' | 'error'>('idle')


  // Keep stable callback refs
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onDurationUpdateRef = useRef(onDurationUpdate)
  const onPlayRef = useRef(onPlay)
  const onPauseRef = useRef(onPause)
  const onBufferingRef = useRef(onBuffering)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate
    onDurationUpdateRef.current = onDurationUpdate
    onPlayRef.current = onPlay
    onPauseRef.current = onPause
    onBufferingRef.current = onBuffering
    onErrorRef.current = onError
  })

  /**
   * Extract jobId from HLS URL (format: /api/hls/:jobId/index.m3u8)
   */
  const getJobId = useCallback((url: string) => {
    const match = url.match(/\/api\/hls\/([^/]+)\//)
    return match ? match[1] : null
  }, [])

  /**
   * Poll the backend until the HLS playlist and first segments are ready
   */
  const waitUntilReady = useCallback(async (jobId: string): Promise<boolean> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    setPollStatus('polling')

    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/hls-status/${jobId}`)
        if (!res.ok) throw new Error('Status check failed')


        const data = await res.json()
        if (data.status === 'error') {
          setErrorMessage(data.errorMessage || 'Transcode failed')
          setPollStatus('error')
          return false
        }

        if (data.playlistReady) {
          setPollStatus('ready')
          setIsPollReady(true)
          return true
        }
      } catch (err) {
        console.warn('[SocialVideoPlayer] Polling error, retrying...', err)
      }

      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    }

    setErrorMessage('Timed out waiting for stream preparation (90s)')
    setPollStatus('error')
    return false
  }, [])


  // ── 1. Wait for stream readiness (polling) ────────────────────────────────
  useEffect(() => {
    if (!hlsUrl) return
    setIsPollReady(false)
    setErrorMessage(null)

    const jobId = getJobId(hlsUrl)
    if (!jobId) {
      // Direct URL, assume ready
      setIsPollReady(true)
      return
    }

    let isMounted = true
    const checkAndPoll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/hls-status/${jobId}`)
        if (res.ok) {

          const data = await res.json()
          if (data.playlistReady) {
            if (isMounted) setIsPollReady(true)
            return
          }
        }
        // Not ready or fetch failed, start polling
        if (isMounted) await waitUntilReady(jobId)
      } catch {
        if (isMounted) await waitUntilReady(jobId)
      }
    }

    checkAndPoll()
    return () => { isMounted = false }
  }, [hlsUrl, getJobId, waitUntilReady])

  // ── 2. Attach hls.js once ready ───────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !hlsUrl || !isPollReady) return

    // Destroy any previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hlsConfig: Partial<HlsConfig> = {
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 40,
        manifestLoadingRetryDelay: 3000,
        manifestLoadingMaxRetryTimeout: 10000,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 500,
        fragLoadingMaxRetryTimeout: 8000,
        startLevel: -1,
        abrEwmaDefaultEstimate: 5000000,
        debug: false,
      }

      const hls = new Hls(hlsConfig)
      hlsRef.current = hls

      hls.loadSource(hlsUrl)
      hls.attachMedia(video)

      hls.on(Events.MANIFEST_PARSED, () => {
        setIsInitializing(false)
        setErrorMessage(null)
        if (video.duration && video.duration > 0) {
          onDurationUpdateRef.current?.(video.duration)
        }
      })

      hls.on(Events.LEVEL_LOADED, (_, data) => {
        setIsInitializing(false)
        setErrorMessage(null)
        const duration = data.details.totalduration
        if (duration > 0) {
          onDurationUpdateRef.current?.(duration)
        }
      })

      hls.on(Events.ERROR, (_, data: ErrorData) => {
        if (data.details === 'manifestLoadError' || data.details === 'manifestLoadTimeOut') {
          setRetryCount(prev => prev + 1)
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              setErrorMessage(data.details || 'Playback failed')
              onErrorRef.current?.(new Error(data.details || 'HLS playback error'))
              break
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [hlsUrl, isPollReady])


  // ── Video element event listeners ──────────────────────────────────────────
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
    }

    const handleDurationChange = () => {
      if (video.duration > 0) {
        onDurationUpdateRef.current?.(video.duration)
      }
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
      setIsBuffering(false)
    }

    const handlePause = () => {
      onPauseRef.current?.()
    }

    const handleWaiting = () => {
      onBufferingRef.current?.(true)
      setIsBuffering(true)
    }

    const handleCanPlay = () => {
      onBufferingRef.current?.(false)
      setIsBuffering(false)
    }

    const handleError = () => {
      const code = video.error?.code
      let message = 'Video playback error'
      if (code === MediaError.MEDIA_ERR_NETWORK) message = 'Network error'
      else if (code === MediaError.MEDIA_ERR_DECODE) message = 'Video decode error'
      else if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) message = 'Video format not supported'
      onErrorRef.current?.(new Error(message))
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [clipStart, clipEnd])

  // ── Sync currentTime prop (e.g. from timeline scrub) ──────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (video && Math.abs(video.currentTime - currentTime) > 0.3) {
      video.currentTime = currentTime
    }
  }, [currentTime])

  // ── Sync muted prop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted
    }
  }, [muted])

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg relative group">
      <div className="w-full min-h-[180px] max-h-[56vh] bg-black flex items-center justify-center relative">
        <video
          ref={videoRef as RefObject<HTMLVideoElement>}
          className="w-full max-h-[56vh] object-contain rounded-lg"
          controls={controls}
          crossOrigin="anonymous"
          playsInline
        />

        {/* ── Loading / Buffering Overlays ── */}
        {(isInitializing || isBuffering) && !errorMessage && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-500 animate-in fade-in">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse" />
              <Loader2 className="h-14 w-14 animate-spin text-purple-400 relative z-10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-purple-500 animate-ping" />
              </div>
            </div>
            
            <div className="text-center space-y-2 relative z-10">
              <p className="text-lg font-semibold bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent">
                {pollStatus === 'polling' ? 'Preparing your stream…' : (isInitializing ? 'Optimizing video quality…' : 'Buffering segments…')}
              </p>
              
              <div className="flex items-center justify-center gap-2.5 text-sm text-purple-200/50">
                <RefreshCw className="h-4 w-4 animate-reverse-spin" />
                <span>Synchronizing with social media provider</span>
              </div>

              {retryCount > 0 && (
                <div className="pt-4">
                  <div className="h-1 w-32 bg-slate-800 rounded-full mx-auto overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-1000" 
                      style={{ width: `${(retryCount / 40) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-purple-400/40 font-bold">
                    Reconnection Attempt {retryCount} of 40
                  </p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ── Error Overlay ── */}
        {errorMessage && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 p-6">
            <div className="bg-slate-900 border border-red-900/50 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-4 max-w-[320px]">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <div>
                <p className="text-white font-semibold">Playback Error</p>
                <p className="text-slate-400 text-sm mt-1">{errorMessage}</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg border border-red-500/20 transition-all"
              >
                Retry Player
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
