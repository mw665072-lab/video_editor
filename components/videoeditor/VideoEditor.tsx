'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useVideoEditorState } from '@/hooks/useVideoEditorState'
import { ExportProgress, VideoClip } from '@/lib/types'
import { exportVideo, getExportStatus, downloadExportedVideo, recordDownload, hlsCleanup, ytResolve } from '@/lib/api'
import { generateClipThumbnail, generateRemoteClipThumbnail, createThumbnailFromClip } from '@/lib/thumbnailUtils'
import { formatTime, getClipIndexAtTime, getYouTubeVideoId } from '@/lib/videoUtils'
import { toast } from 'sonner'
import YouTube, { YouTubePlayer } from 'react-youtube'

import { VideoUpload } from '../upload/VideoUpload'
import { VideoPlayer } from '../VideoPlayer'
import { SocialVideoPlayer } from '../SocialVideoPlayer'
import { Timeline } from '../timeline/Timeline'
import { ClipList } from '../clips/ClipList'
import { ExportDialog } from '../dialog/ExportDialog'
import { ClipSuggestionPanel } from '../clips/ClipSuggestionPanel'
import { Trash2, FileDown, Wand2, Play, Square } from 'lucide-react'



export function VideoEditor() {
  const {
    state,
    sortedClips,
    setVideo,
    clearVideo,
    setVideoDuration,
    setCurrentTime,
    setPlaying,
    addClip,
    removeClip,
    updateClip,
    reorderClips,
    selectClip,
    clearClips,
  } = useVideoEditorState()

  const [youtubeFallbackUrl, setYoutubeFallbackUrl] = useState<string | null>(null)
  const playbackSource = youtubeFallbackUrl ?? state.videoSource
  const playbackSourceType = youtubeFallbackUrl ? 'proxy' : state.videoSourceType
  const sourceForProcessing =
    state.videoOriginalSource ??
    (typeof state.videoSource === 'string' ? state.videoSource : undefined)
  const canUseUrlWorkflow = typeof sourceForProcessing === 'string' && sourceForProcessing.length > 0

  const isHlsUrl =
    typeof playbackSource === 'string' &&
    (playbackSource.includes('/api/hls/') || playbackSource.endsWith('.m3u8'))

  const useSocialPlayer = isHlsUrl

  const isProxyPlatform = !useSocialPlayer && (
    playbackSourceType === 'proxy'
  )

  const isYouTubePlatform =
    !useSocialPlayer &&
    !isProxyPlatform &&
    playbackSourceType === 'youtube' &&
    typeof playbackSource === 'string' &&
    getYouTubeVideoId(playbackSource) !== null

  const youtubeVideoId =
    isYouTubePlatform && typeof playbackSource === 'string'
      ? getYouTubeVideoId(playbackSource)
      : null

  const isClipExportableSource =
    !!sourceForProcessing &&
    state.videoSourceType !== 'unknown' &&
    state.videoSourceType !== undefined

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

  const selectedClip = state.selectedClipId
    ? sortedClips.find(c => c.id === state.selectedClipId)
    : undefined

  const exportDisabledReason = !isClipExportableSource
    ? 'Export needs a URL-based source. Paste a YouTube, Facebook, TikTok, Instagram, Vimeo, Twitter/X, or direct video URL.'
    : undefined

  const youtubePlayerRef = useRef<YouTubePlayer | null>(null)
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null)
  const playerTimeRef = useRef<number>(0)
  const lastSyncTimeRef = useRef<number>(0)
  const syncIntervalRef = useRef<number | null>(null)
  const activeClipIndexRef = useRef<number>(0)
  const bufferingTimerRef = useRef<number | null>(null)

  const [isYouTubeReady, setIsYouTubeReady] = useState(false)
  const [showYouTubeLoadingHint, setShowYouTubeLoadingHint] = useState(false)
  const [showExternalPreview, setShowExternalPreview] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)

  const clearSyncInterval = useCallback(() => {
    if (syncIntervalRef.current !== null) {
      window.clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }
  }, [])

  const setBufferingState = useCallback((buffering: boolean) => {
    if (bufferingTimerRef.current !== null) {
      window.clearTimeout(bufferingTimerRef.current)
      bufferingTimerRef.current = null
    }

    if (buffering) {
      bufferingTimerRef.current = window.setTimeout(() => {
        setIsBuffering(true)
      }, 300)
      return
    }

    setIsBuffering(false)
  }, [])

  const syncUIFromPlayerTime = useCallback(
    (time: number) => {
      playerTimeRef.current = time
      const now = performance.now()
      if (now - lastSyncTimeRef.current >= 250) {
        lastSyncTimeRef.current = now
        setCurrentTime(time)
      }
    },
    [setCurrentTime]
  )

  const getLivePlayerTime = useCallback((): number => {
    if (isYouTubePlatform && youtubePlayerRef.current && isYouTubeReady) {
      try {
        return youtubePlayerRef.current.getCurrentTime() ?? playerTimeRef.current
      } catch {
        return playerTimeRef.current
      }
    }
    if (htmlVideoRef.current) {
      return htmlVideoRef.current.currentTime
    }
    return playerTimeRef.current
  }, [isYouTubePlatform, isYouTubeReady])

  const safeSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, state.videoDuration || Number.MAX_VALUE))
      playerTimeRef.current = clamped

      if (isYouTubePlatform && youtubePlayerRef.current && isYouTubeReady) {
        try {
          const current = youtubePlayerRef.current.getCurrentTime() || 0
          if (Math.abs(current - clamped) > 0.5) {
            youtubePlayerRef.current.seekTo(clamped, true)
          }
        } catch {
          // ignore unavailable player state
        }
      } else if (htmlVideoRef.current) {
        const current = htmlVideoRef.current.currentTime
        if (Math.abs(current - clamped) > 0.5) {
          htmlVideoRef.current.currentTime = clamped
        }
      }

      setCurrentTime(clamped)
    },
    [isYouTubePlatform, isYouTubeReady, setCurrentTime, state.videoDuration]
  )

  const handleTimeChange = useCallback(
    (time: number) => {
      const trimmed = Math.max(0, Math.min(time, state.videoDuration))
      safeSeek(trimmed)
    },
    [safeSeek, state.videoDuration]
  )

  const youTubeOptions = useMemo(() => ({
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      disablekb: 0,
      iv_load_policy: 3,
      wmode: 'opaque',
      fs: 1,
      start: 0,
    },
  }), [])

  const handleYouTubeReady = useCallback(
    (event: { target: YouTubePlayer }) => {
      youtubePlayerRef.current = event.target
      setIsYouTubeReady(true)
      setShowYouTubeLoadingHint(false)

      const updateDuration = (attempts = 0) => {
        const duration = event.target.getDuration()
        if (duration && duration > 0 && duration !== state.videoDuration) {
          setVideoDuration(duration)
        }

        if ((!duration || duration === 0) && attempts < 10) {
          window.setTimeout(() => updateDuration(attempts + 1), 300)
        }
      }

      updateDuration()

      const initialTime = playerTimeRef.current > 0 ? playerTimeRef.current : state.currentTime
      if (initialTime > 0) {
        safeSeek(initialTime)
      }
    },
    [safeSeek, setVideoDuration, state.currentTime, state.videoDuration]
  )

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSequencePlaying, setIsSequencePlaying] = useState(false)
  const [exportPlatform, setExportPlatform] = useState<'tiktok' | 'shorts' | 'reels'>('tiktok')
  const [exportResizeMode, setExportResizeMode] = useState<'blur' | 'crop'>('blur')
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0)
  const [clipDurationSeconds, setClipDurationSeconds] = useState(10)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [proxyVideoReady, setProxyVideoReady] = useState(false)

  const handleYouTubeStateChange = useCallback(
    (event: { data: number; target: YouTubePlayer }) => {
      const player = event.target
      const playerState = event.data

      let current = playerTimeRef.current
      try {
        current = player.getCurrentTime() ?? current
      } catch {
        // ignore
      }

      playerTimeRef.current = current
      syncUIFromPlayerTime(current)

      if (playerState === 1) {
        setPlaying(true)
        setBufferingState(false)
      } else if (playerState === 2) {
        setPlaying(false)
        setBufferingState(false)
      } else if (playerState === 3) {
        setBufferingState(true)
      } else if (playerState === 0) {
        setPlaying(false)
        setBufferingState(false)

        if (isSequencePlaying && sortedClips.length > 0) {
          const nextIdx = activeClipIndexRef.current + 1
          if (sortedClips[nextIdx]) {
            activeClipIndexRef.current = nextIdx
            setActiveClipIndex(nextIdx)
            safeSeek(sortedClips[nextIdx].startTime)
            youtubePlayerRef.current?.playVideo()
          } else {
            setIsSequencePlaying(false)
          }
        }
      }
    },
    [isSequencePlaying, safeSeek, setCurrentTime, setPlaying, setBufferingState, sortedClips, syncUIFromPlayerTime]
  )

  const getEmbedUrl = () => {
    if (state.videoSourceType === 'facebook' && typeof state.videoSource === 'string') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(state.videoSource)}`
    }
    return ''
  }

  const handlePlayerTimeUpdate = useCallback(
    (time: number) => {
      playerTimeRef.current = time
      syncUIFromPlayerTime(time)
    },
    [syncUIFromPlayerTime]
  )

  const handleVideoError = useCallback(async (error: Error) => {
    console.error('Video playback error:', error)
    const errorMessage = error.message || 'Playback failed'
    const socialSourceType = state.videoSourceType
    const originalUrl = state.videoOriginalSource
    const canFallbackToProxy =
      typeof originalUrl === 'string' &&
      originalUrl.length > 0 &&
      (
        socialSourceType === 'facebook' ||
        socialSourceType === 'instagram' ||
        socialSourceType === 'tiktok' ||
        socialSourceType === 'twitter' ||
        socialSourceType === 'vimeo'
      )
    const shouldFallbackToProxy =
      canFallbackToProxy &&
      !youtubeFallbackUrl &&
      (
        errorMessage.includes('Timed out waiting for stream preparation') ||
        errorMessage.includes('Transcode failed') ||
        errorMessage.includes('Failed to get HLS status') ||
        errorMessage.includes('Playback failed')
      )

    if (shouldFallbackToProxy && originalUrl) {
      const resolved = await ytResolve(originalUrl)
      const fallbackUrl = resolved.streamUrl.startsWith('http')
        ? resolved.streamUrl
        : `${BACKEND_URL}${resolved.streamUrl}`
      setVideo(
        fallbackUrl,
        resolved.duration || state.videoDuration || 0,
        resolved.title || state.videoFileName,
        'proxy',
        originalUrl
      )
      setProxyVideoReady(false)
      toast.error('Preview preparation took too long. Switched to compatibility mode.', {
        description: 'The editor is using direct proxy playback for this URL so you can keep working.',
      })
      return
    }
    
    if (errorMessage.includes('expired') || errorMessage.includes('not supported')) {
      const currentUrl = typeof playbackSource === 'string' ? playbackSource : ''
      
      if (currentUrl && typeof currentUrl === 'string' && currentUrl.includes('/api/yt-clip')) {
        console.log('Token may have expired, attempting to refresh...')
        
        try {
          toast.error('Video session expired. Please reload the video URL.', {
            description: 'Long videos require refreshing the stream URL every few hours.',
            action: {
              label: 'Reload Video',
              onClick: () => {
                window.location.reload()
              }
            }
          })
        } catch (refreshError) {
          console.error('Failed to refresh video URL:', refreshError)
          toast.error('Failed to refresh video. Please reload the page.')
        }
      } else {
        toast.error(errorMessage)
      }
    } else {
      toast.error(errorMessage)
    }
  }, [
    BACKEND_URL,
    playbackSource,
    setVideo,
    state.videoDuration,
    state.videoFileName,
    state.videoOriginalSource,
    state.videoSourceType,
    youtubeFallbackUrl,
  ])

  const handlePlaySequence = useCallback(() => {
    if (!sortedClips.length || !playbackSource) {
      toast.error('Add clips to play sequence')
      return
    }

    const firstClip = sortedClips[0]
    setActiveClipIndex(0)
    setCurrentTime(firstClip.startTime)

    if (playbackSourceType === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(firstClip.startTime, true)
      youtubePlayerRef.current.playVideo()
    } else {
      setPlaying(true)
    }

    setIsSequencePlaying(true)
  }, [sortedClips, playbackSource, playbackSourceType, setCurrentTime, setPlaying])

  const handleStopSequence = useCallback(() => {
    if (playbackSourceType === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.pauseVideo()
    }

    if (htmlVideoRef.current) {
      htmlVideoRef.current.pause()
    }

    setPlaying(false)
    setIsSequencePlaying(false)
  }, [setPlaying, playbackSourceType])

  useEffect(() => {
    if (!playbackSource) {
      return
    }

    clearSyncInterval()

    syncIntervalRef.current = window.setInterval(() => {
      const current = getLivePlayerTime()
      playerTimeRef.current = current
      syncUIFromPlayerTime(current)

      if (!isSequencePlaying || !sortedClips.length) {
        return
      }

      const activeIndex = activeClipIndexRef.current
      const activeClip = sortedClips[activeIndex]

      if (!activeClip) {
        activeClipIndexRef.current = 0
        setActiveClipIndex(0)
        return
      }

      if (current < activeClip.startTime) {
        safeSeek(activeClip.startTime)
        return
      }

      if (current >= activeClip.endTime - 0.2) {
        const next = sortedClips[activeIndex + 1]

        if (next) {
          activeClipIndexRef.current = activeIndex + 1
          setActiveClipIndex(activeIndex + 1)
          safeSeek(next.startTime)

          if (playbackSourceType === 'youtube' && youtubePlayerRef.current) {
            youtubePlayerRef.current.playVideo()
          } else if (htmlVideoRef.current) {
            htmlVideoRef.current.play()
          }
        } else {
          handleStopSequence()
        }
      }
    }, 250)

    return () => {
      clearSyncInterval()
    }
  }, [playbackSource, getLivePlayerTime, syncUIFromPlayerTime, isSequencePlaying, sortedClips, safeSeek, playbackSourceType, handleStopSequence])

  useEffect(() => {
    hlsCleanup().then((res) => {
      if (res.success && res.cleanedCount > 0) {
        console.log(`[hls] Cleanup complete: removed ${res.cleanedCount} stale jobs.`)
      }
    }).catch(err => console.error('[hls] Initial cleanup failed:', err))
  }, [])

  const handleAddClip = useCallback(() => {
    if (state.videoDuration === 0) {
      toast.error('Please load a video first')
      return
    }

    const liveTime = getLivePlayerTime() || playerTimeRef.current || 0
    const start = Math.min(Math.max(0, liveTime), state.videoDuration)
    const end = Math.min(start + clipDurationSeconds, state.videoDuration)

    addClip(start, end)
    toast.success(`Clip added: ${formatTime(start)} → ${formatTime(end)} (${clipDurationSeconds}s)`)    
  }, [state.videoDuration, addClip, getLivePlayerTime, clipDurationSeconds])

  useEffect(() => {
    if (!selectedClip || !playbackSource || isYouTubePlatform) return
    safeSeek(selectedClip.startTime)
  }, [selectedClip?.id, selectedClip?.startTime, playbackSource, isYouTubePlatform, safeSeek])

  useEffect(() => {
    if (!isYouTubePlatform) {
      setShowExternalPreview(true)
      return
    }

    setIsYouTubeReady(false)
    setShowYouTubeLoadingHint(true)
    setShowExternalPreview(true)

    const hintTimer = window.setTimeout(() => {
      setShowYouTubeLoadingHint(false)
    }, 12000)

    return () => {
      clearTimeout(hintTimer)
      setShowYouTubeLoadingHint(false)
    }
  }, [isYouTubePlatform, playbackSource])

  useEffect(() => {
    setYoutubeFallbackUrl(null)
  }, [state.videoOriginalSource, state.videoSource])

  useEffect(() => {
    return () => {
      clearSyncInterval()
    }
  }, [clearSyncInterval])

  useEffect(() => {
    if (!playbackSource || !sortedClips.length) return

    const clipsNeedingThumbnail = sortedClips.filter(c => !c.thumbnailUrl)
    if (!clipsNeedingThumbnail.length) return

    let isCancelled = false

    ;(async () => {
      for (const clip of clipsNeedingThumbnail) {
        if (isCancelled) return
        try {
          const thumb =
            typeof sourceForProcessing === 'string'
              ? await generateRemoteClipThumbnail(sourceForProcessing, clip.startTime + 0.5)
              : await generateClipThumbnail(playbackSource as Blob | string, clip.startTime + 0.5)
          if (isCancelled) return
          updateClip({ ...clip, thumbnailUrl: thumb })
        } catch (error) {
          if (isCancelled) return
          updateClip({ ...clip, thumbnailUrl: createThumbnailFromClip(clip) })
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [playbackSource, sourceForProcessing, sortedClips, updateClip])

  const handleExport = useCallback(
    async (quality: string, platform: 'tiktok' | 'shorts' | 'reels', resizeMode: 'blur' | 'crop') => {
      if (sortedClips.length === 0) {
        toast.error('Please select clips to export')
        return
      }

      if (!playbackSource) {
        toast.error('No video loaded')
        return
      }

      if (!isClipExportableSource) {
        const message =
          exportDisabledReason ||
          'Export is unavailable for this source. Use a local file or direct video URL (MP4/WebM) instead.'
        setExportProgress({
          isExporting: false,
          progress: 0,
          error: message,
        })
        toast.error(message)
        return
      }

      setExportProgress({
        isExporting: true,
        progress: 0,
        currentStep: sortedClips.length > 1 ? 'Merging clips...' : 'Preparing...',
      })

      try {
        const sourceUrl = sourceForProcessing
        if (!sourceUrl) {
          throw new Error('This source cannot be exported yet because no backend-accessible URL is available.')
        }
        const clipsPayload = sortedClips.map((clip) => ({
          startTime: clip.startTime,
          endTime: clip.endTime,
          order: clip.order,
        }))

        const { jobId } = await exportVideo({
          videoSource: sourceUrl,
          originalSource: sourceUrl,
          clips: clipsPayload,
          platform,
          resizeMode,
        })

        const pollInterval = 1500
        let status = await getExportStatus(jobId)

        while (status.status === 'pending' || status.status === 'running') {
          setExportProgress({
            isExporting: true,
            progress: status.progress ?? 0,
            currentStep: status.step || 'Processing...',
          })

          await new Promise((resolve) => setTimeout(resolve, pollInterval))
          status = await getExportStatus(jobId)
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'Export failed')
        }

        const urls = status.downloadUrls || []
        if (status.status !== 'done' || urls.length === 0) {
          throw new Error('Export did not complete successfully')
        }

        setExportProgress({
          isExporting: true,
          progress: 98,
          currentStep: 'Downloading generated video(s)...',
        })

        for (let i = 0; i < urls.length; i++) {
          const url = urls[i]
          const blob = await downloadExportedVideo(url)
          const objectUrl = URL.createObjectURL(blob)
          setPreviewUrl(objectUrl)
          const fileName = `exported-video-${i + 1}-${Date.now()}.mp4`
          const link = document.createElement('a')
          link.href = objectUrl
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setExportProgress({
            isExporting: true,
            progress: 98 + Math.round((i / urls.length) * 2),
            currentStep: `Downloading clip ${i + 1}/${urls.length}...`,
          })
        }

        setExportProgress({
          isExporting: false,
          progress: 100,
          currentStep: 'Complete!',
        })

        toast.success('Video exported successfully')
        setExportDialogOpen(false)

        setTimeout(() => {
          setExportProgress({
            isExporting: false,
            progress: 0,
          })
        }, 4000)

        clearVideo()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setExportProgress({
          isExporting: false,
          progress: 0,
          error: errorMessage,
        })
        toast.error(errorMessage)
      }
    },
    [sortedClips, playbackSource, sourceForProcessing, clearVideo]
  )

  // ─── Shared panel style ───────────────────────────────────────────────────
  const panel =
    'rounded-2xl border border-[#2a2118] bg-[#13100c]/80 backdrop-blur-sm shadow-[0_4px_32px_rgba(0,0,0,0.5)]'

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #2d1800 0%, #0d0905 55%, #080604 100%)',
      }}
    >
      {/* Subtle grid texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fa6a00 1px, transparent 1px), linear-gradient(90deg, #fa6a00 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-3 sm:px-5 md:px-8 py-4 sm:py-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl mb-6 sm:mb-8 border border-[#2e1a06] p-4 sm:p-5 md:p-6"
          style={{
            background: 'linear-gradient(135deg, #1a0e05 0%, #0d0905 100%)',
            boxShadow: '0 0 0 1px rgba(250,106,0,0.08), 0 8px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              {/* Logo mark */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <polygon points="5,2 18,10 5,18" fill="white" />
                </svg>
              </div>
              <div>
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-none"
                  style={{
                    background: 'linear-gradient(90deg, #ffffff 0%, #fa6a00 60%, #ff8c38 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  CLIP<span style={{ WebkitTextFillColor: '#fa6a00' }}>AI</span>
                </h1>
                <p className="text-xs text-[#6b4e2e] mt-0.5 font-medium tracking-widest uppercase">
                  AI-Powered Clip Engine
                </p>
              </div>
            </div>

            {canUseUrlWorkflow && (
              <button
                onClick={clearVideo}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#3a2210] text-[#c07040] hover:border-[#fa6a00]/50 hover:text-[#fa6a00] hover:bg-[#fa6a00]/5 transition-all duration-200 whitespace-nowrap"
              >
                ✕ Clear Video
              </button>
            )}
          </div>
        </div>

        {!state.videoSource ? (
          // ── Upload Step ───────────────────────────────────────────────────
          <div
            className="flex-1 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center"
            style={{
              borderColor: '#2e1a06',
              background: 'radial-gradient(ellipse at center, #1a0e05 0%, #0d0905 100%)',
            }}
          >
            {/* Upload glow accent */}
            <div
              className="absolute w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl"
              style={{ background: '#fa6a00' }}
            />
            <VideoUpload
              onVideoLoaded={(source, duration, fileName, sourceType, originalSource) => {
                setVideo(source, duration, fileName, sourceType, originalSource)
                setYoutubeFallbackUrl(null)
                setProxyVideoReady(false)
                toast.success('Video loaded successfully')
              }}
              onDurationResolved={(duration, title) => {
                setVideoDuration(duration)
                if (title) toast.success(`Duration set: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s${title !== 'Untitled' ? ` — ${title}` : ''}`)
              }}
            />
          </div>
        ) : (
          // ── Editor Layout ─────────────────────────────────────────────────
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-7">

            {/* ── Main Editor Area ──────────────────────────────────────────── */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-5">

              {/* Video Player Panel */}
              <div className={panel + ' p-4 sm:p-5'}>
                {/* Panel header */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 mb-4"
                  style={{ borderBottom: '1px solid #2a1a08' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: '#fa6a00', boxShadow: '0 0 8px #fa6a00' }}
                    />
                    <h2 className="text-base sm:text-lg font-bold tracking-wide text-white/90">
                      Preview
                    </h2>
                    {isBuffering && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse"
                        style={{ background: '#2d1b00', color: '#fa6a00', border: '1px solid #fa6a00/30' }}
                      >
                        Buffering…
                      </span>
                    )}
                  </div>

                  {/* Play / Stop buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlaySequence}
                      disabled={!sortedClips.length || isSequencePlaying || isYouTubePlatform}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        boxShadow: '0 2px 12px rgba(250,106,0,0.35)',
                        color: 'white',
                      }}
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Play
                    </button>
                    <button
                      onClick={handleStopSequence}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-200 hover:border-[#fa6a00]/40 hover:text-[#fa6a00]"
                      style={{
                        border: '1px solid #2e1a06',
                        background: '#1a100600',
                        color: '#8a6040',
                      }}
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  </div>
                </div>

                {/* Player area */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid #2a1a08', background: '#080604' }}
                >
                  {isYouTubePlatform && youtubeVideoId ? (
                    <>
                      {!showExternalPreview ? (
                        <div className="p-6 text-center">
                          <p className="mb-2 text-sm font-semibold text-white/80">YouTube link detected</p>
                          <p className="text-xs text-white/40 mb-4">
                            Preview loading for YouTube can generate many network requests.
                          </p>
                          <button
                            onClick={() => setShowExternalPreview(true)}
                            className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                              color: 'white',
                            }}
                          >
                            Load YouTube Preview
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative w-full aspect-video sm:min-h-[300px] md:min-h-[380px] max-h-[70vh] overflow-hidden bg-black">
                            <YouTube
                              videoId={youtubeVideoId}
                              opts={youTubeOptions}
                              onReady={handleYouTubeReady}
                              onStateChange={handleYouTubeStateChange}
                              onError={() => {
                                setIsYouTubeReady(false)
                                const originalUrl = state.videoOriginalSource || (typeof state.videoSource === 'string' ? state.videoSource : '')
                                if (originalUrl) {
                                  toast.loading('YouTube player restricted — switching to stream proxy…', { id: 'yt-fallback' })
                                  ytResolve(originalUrl)
                                    .then((resolved) => {
                                      const proxyUrl = resolved.streamUrl.startsWith('http')
                                        ? resolved.streamUrl
                                        : `${BACKEND_URL}${resolved.streamUrl}`
                                      setYoutubeFallbackUrl(proxyUrl)
                                      toast.success('Loaded via stream proxy', { id: 'yt-fallback' })
                                    })
                                    .catch((fallbackError) => {
                                      console.error('Failed to resolve fallback stream:', fallbackError)
                                      toast.error('YouTube fallback failed — try a different video or URL', { id: 'yt-fallback' })
                                    })
                                } else {
                                  toast.error('YouTube player error — try a different video or URL')
                                }
                              }}
                              className="absolute inset-0 h-full w-full"
                            />
                          </div>
                          {!isYouTubeReady && (
                            <div
                              className="p-3 text-sm"
                              style={{ background: '#1a0e05', borderTop: '1px solid #2a1a08', color: '#fa6a00' }}
                            >
                              <p className="font-semibold">Loading YouTube preview…</p>
                              <p className="text-xs opacity-60 mt-0.5">Check your URL and network if loading fails.</p>
                            </div>
                          )}
                          <div
                            className="p-3"
                            style={{ background: '#1a0e05', borderTop: '1px solid #2a1a08' }}
                          >
                            <p className="text-xs font-semibold text-[#fa6a00]">● YouTube — clip preview enabled</p>
                            <p className="text-xs text-white/40 mt-0.5">Export stays disabled for embedded sources.</p>
                          </div>
                          {state.videoDuration <= 0 && (
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ borderTop: '1px solid #2a1a08' }}>
                              <label className="text-sm text-white/60">Set video duration (seconds)</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                                  style={{ background: '#1a0e05', border: '1px solid #3a2210' }}
                                  value={state.videoDuration || ''}
                                  onChange={(e) => {
                                    const value = Number(e.target.value)
                                    if (!Number.isNaN(value) && value > 0) setVideoDuration(value)
                                  }}
                                  placeholder="e.g., 600"
                                />
                                <span className="text-xs text-white/30 self-center">For timeline</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {useSocialPlayer && typeof playbackSource === 'string' ? (
                        <>
                          <SocialVideoPlayer
                            hlsUrl={playbackSource}
                            currentTime={state.currentTime}
                            onTimeUpdate={handlePlayerTimeUpdate}
                            onDurationUpdate={(d) => { if (d && d > 0) setVideoDuration(d) }}
                            onPlay={() => { setPlaying(true); setBufferingState(false); setProxyVideoReady(true) }}
                            onPause={() => { setPlaying(false); setIsSequencePlaying(false); setBufferingState(false) }}
                            onBuffering={setBufferingState}
                            onError={handleVideoError}
                            clipStart={selectedClip?.startTime}
                            clipEnd={selectedClip?.endTime}
                            videoRef={htmlVideoRef}
                          />
                          {proxyVideoReady && (
                            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderTop: '1px solid #2a1a08' }}>
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                style={{ background: '#1a0e05', border: '1px solid #fa6a00/30', color: '#fa6a00' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#fa6a00] animate-pulse" />
                                HLS Stream — live playback
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {isProxyPlatform && !proxyVideoReady && (
                            <div
                              className="flex items-center gap-3 px-4 py-3 m-3 rounded-lg"
                              style={{ background: '#1a0e05', border: '1px solid #3a2210' }}
                            >
                              <div
                                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                                style={{ borderColor: '#fa6a00', borderTopColor: 'transparent' }}
                              />
                              <div>
                                <p className="text-sm font-semibold" style={{ color: '#fa6a00' }}>Loading via proxy…</p>
                                <p className="text-xs opacity-60 mt-0.5">yt-dlp extracting stream URL (~5–10s)</p>
                              </div>
                            </div>
                          )}
                          <VideoPlayer
                            src={playbackSource}
                            currentTime={state.currentTime}
                            onTimeUpdate={handlePlayerTimeUpdate}
                            onDurationUpdate={(d) => { if (d && d > 0) setVideoDuration(d) }}
                            onPlay={() => { setPlaying(true); setBufferingState(false); setProxyVideoReady(true) }}
                            onPause={() => { setPlaying(false); setIsSequencePlaying(false); setBufferingState(false) }}
                            onBuffering={setBufferingState}
                            onError={handleVideoError}
                            clipStart={selectedClip?.startTime}
                            clipEnd={selectedClip?.endTime}
                            videoRef={htmlVideoRef}
                          />
                        </>
                      )}
                      {state.videoDuration <= 0 && (isProxyPlatform || useSocialPlayer) && (
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 px-4" style={{ borderTop: '1px solid #2a1a08' }}>
                          <label className="text-sm text-white/50">Set video duration (seconds)</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={1}
                              className="rounded-lg px-3 py-1.5 text-sm text-white outline-none flex-1"
                              style={{ background: '#1a0e05', border: '1px solid #3a2210' }}
                              value={state.videoDuration || ''}
                              onChange={(e) => {
                                const value = Number(e.target.value)
                                if (!Number.isNaN(value) && value > 0) setVideoDuration(value)
                              }}
                              placeholder="e.g., 120"
                            />
                            <span className="text-xs text-white/30 self-center">For timeline</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Timeline Panel */}
              <div className={panel + ' p-4 sm:p-5 space-y-3'}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-2" style={{ borderBottom: '1px solid #2a1a08' }}>
                  <h2 className="text-base sm:text-lg font-bold tracking-wide text-white/90">Timeline</h2>
                  <p className="text-xs text-[#4a3020]">Scroll · Drag · Click to jump · Ctrl+wheel to zoom</p>
                </div>

                <div className="flex flex-col xs:flex-row xs:flex-wrap items-stretch xs:items-center justify-between gap-2 xs:gap-3">
                  {sortedClips.length === 0 && (
                    <button
                      onClick={handleAddClip}
                      className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        color: 'white',
                        boxShadow: '0 2px 12px rgba(250,106,0,0.3)',
                      }}
                    >
                      + Add Clip
                    </button>
                  )}
                </div>

                <Timeline
                  duration={state.videoDuration}
                  clips={sortedClips}
                  currentTime={state.currentTime}
                  onTimeChange={handleTimeChange}
                  onClipSelect={selectClip}
                  selectedClipId={state.selectedClipId}
                  onClipStartChange={(clipId, startTime) => {
                    const clip = sortedClips.find(c => c.id === clipId)
                    if (clip) updateClip({ ...clip, startTime })
                  }}
                  onClipEndChange={(clipId, endTime) => {
                    const clip = sortedClips.find(c => c.id === clipId)
                    if (clip) updateClip({ ...clip, endTime })
                  }}
                />
              </div>

              {/* Clip length selector */}
              <div
                className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3 rounded-xl p-4"
                style={{ background: '#13100c', border: '1px solid #2a1a08' }}
              >
                <label className="text-sm font-bold text-white/70 tracking-wide whitespace-nowrap">Clip length:</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setClipDurationSeconds(sec)}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200"
                      style={
                        clipDurationSeconds === sec
                          ? {
                              background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                              color: 'white',
                              boxShadow: '0 2px 8px rgba(250,106,0,0.4)',
                            }
                          : {
                              background: '#1a100a',
                              color: '#6b4e2e',
                              border: '1px solid #2a1a08',
                            }
                      }
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#3a2810] sm:ml-auto">Default for new clips</p>
              </div>

              {/* Quick Actions */}
              {sortedClips.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAddClip()}
                    className="py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                      color: 'white',
                      boxShadow: '0 2px 16px rgba(250,106,0,0.3)',
                    }}
                  >
                    + Add Clip at Current Time
                  </button>
                  <button
                    onClick={() => {
                      clearClips()
                      selectClip(null)
                      toast.success('All clips cleared')
                    }}
                    className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:border-red-500/40 hover:text-red-400"
                    style={{
                      background: '#13100c',
                      border: '1px solid #2a1a08',
                      color: '#7a4030',
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* ── Sidebar ───────────────────────────────────────────────────── */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-5">

              {/* AI Suggestions Toggle */}
              {canUseUrlWorkflow && (
                <button
                  onClick={() => setShowAISuggestions(!showAISuggestions)}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200"
                  style={{
                    background: showAISuggestions
                      ? 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)'
                      : '#13100c',
                    border: showAISuggestions ? 'none' : '1px solid #2a1a08',
                    color: showAISuggestions ? 'white' : '#7a5030',
                    boxShadow: showAISuggestions ? '0 2px 16px rgba(250,106,0,0.3)' : 'none',
                  }}
                >
                  <Wand2 className="w-4 h-4" />
                  {showAISuggestions ? 'Hide AI Suggestions' : '✦ AI Suggestions'}
                </button>
              )}

              {/* AI Suggestions Panel */}
              {showAISuggestions && canUseUrlWorkflow && (
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    background: '#13100c',
                    border: '1px solid rgba(250,106,0,0.2)',
                    boxShadow: '0 0 0 1px rgba(250,106,0,0.05), 0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  <ClipSuggestionPanel
                    videoUrl={sourceForProcessing || ''}
                    onClipAdd={(startTime, endTime) => addClip(startTime, endTime)}
                    onClipPreview={(startTime) => safeSeek(startTime)}
                  />
                </div>
              )}

              {/* Clips Panel */}
              <div
                className="rounded-2xl p-4 sm:p-5 min-h-[300px] sm:min-h-[380px]"
                style={{
                  background: '#13100c',
                  border: '1px solid #2a1a08',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid #2a1a08' }}>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#fa6a00' }}
                  />
                  <h2 className="text-base sm:text-lg font-bold text-white/90">Clips</h2>
                  {sortedClips.length > 0 && (
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: '#2a1a08', color: '#fa6a00' }}
                    >
                      {sortedClips.length}
                    </span>
                  )}
                </div>
                <ClipList
                  clips={sortedClips}
                  selectedClipId={state.selectedClipId}
                  onClipSelect={selectClip}
                  onClipRemove={removeClip}
                  onClipReorder={reorderClips}
                  onClipUpdate={updateClip}
                />
              </div>

              {/* Export Panel */}
              {sortedClips.length > 0 && (
                <div className="space-y-3">
                  <div style={{ borderTop: '1px solid #2a1a08', paddingTop: '1rem' }}>
                    <button
                      onClick={() => setExportDialogOpen(true)}
                      className="w-full py-3.5 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        color: 'white',
                        boxShadow: '0 4px 24px rgba(250,106,0,0.45)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <FileDown className="w-5 h-5" />
                      EXPORT VIDEO
                    </button>
                  </div>

                  {exportDisabledReason && (
                    <div
                      className="rounded-lg p-3 text-xs text-center"
                      style={{
                        background: '#1a0808',
                        border: '1px solid #3a1010',
                        color: '#c05050',
                      }}
                    >
                      {exportDisabledReason}
                    </div>
                  )}

                  {!canUseUrlWorkflow && (
                    <div
                      className="rounded-lg p-3 text-xs text-center"
                      style={{
                        background: '#1a1206',
                        border: '1px solid #3a2a10',
                        color: '#c09050',
                      }}
                    >
                      Local uploads are best for preview. Use a supported URL for AI suggestions and export.
                    </div>
                  )}

                  {previewUrl && (
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: '#13100c', border: '1px solid #2a1a08' }}
                    >
                      <p className="text-sm font-semibold text-white/80">Preview</p>
                      <video src={previewUrl} controls className="w-full max-h-[30vh] sm:max-h-[40vh] object-contain rounded-lg" />
                      <a
                        href={previewUrl}
                        download="clip-export.mp4"
                        className="inline-block text-sm font-bold transition-all"
                        style={{ color: '#fa6a00' }}
                      >
                        ↓ Download Video
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-center" style={{ color: '#3a2810' }}>
                    Backend processing · streamed to browser
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        clips={sortedClips}
        onExport={handleExport}
        progress={exportProgress}
        isExportAllowed={isClipExportableSource}
        exportDisabledReason={exportDisabledReason}
      />
    </div>
  )
}