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

import { VideoUpload } from './VideoUpload'
import { VideoPlayer } from './VideoPlayer'
import { SocialVideoPlayer } from './SocialVideoPlayer'
import { Timeline } from './Timeline'
import { ClipList } from './ClipList'
import { ExportDialog } from './ExportDialog'
import { ClipSuggestionPanel } from './ClipSuggestionPanel'
import { Trash2, FileDown, Wand2 } from 'lucide-react'



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

  // ── Platform detection ────────────────────────────────────────────────────

  // A source URL ending in .m3u8 is always an HLS stream (even if platform is 'proxy')
  const isHlsUrl =
    typeof playbackSource === 'string' &&
    (playbackSource.includes('/api/hls/') || playbackSource.endsWith('.m3u8'))

  // Only use the HLS player for actual HLS playlists. Tokenized proxy URLs should use VideoPlayer.
  const useSocialPlayer = isHlsUrl

  // Legacy proxy path: old /api/yt-clip?token=... streams — kept for backward compat
  const isProxyPlatform = !useSocialPlayer && (
    playbackSourceType === 'proxy'
  )

  // YouTube: use react-youtube iframe embed (same as before)
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

  // Exports and AI processing need a stable backend-readable URL, not a Blob or transient HLS/proxy URL.
  const isClipExportableSource =
    !!sourceForProcessing &&
    state.videoSourceType !== 'unknown' &&
    state.videoSourceType !== undefined

  // Backend proxy base URL — used to fall back when YouTube embedding fails
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
    
    // Check if this is a token expiration error (410 Gone)
    if (errorMessage.includes('expired') || errorMessage.includes('not supported')) {
      const currentUrl = typeof playbackSource === 'string' ? playbackSource : ''
      
      // Only try to refresh if we have a valid URL
      if (currentUrl && typeof currentUrl === 'string' && currentUrl.includes('/api/yt-clip')) {
        console.log('Token may have expired, attempting to refresh...')
        
        try {
          // Extract original URL from token-based URL or use existing source
          // For now, just show user-friendly message
          toast.error('Video session expired. Please reload the video URL.', {
            description: 'Long videos require refreshing the stream URL every few hours.',
            action: {
              label: 'Reload Video',
              onClick: () => {
                // User will need to re-paste the URL or refresh page
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

  // ── HLS Cleanup on Mount ──────────────────────────────────────────────────
  // Clears any stale transcoding jobs for THIS USER when they enter the editor
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

        // Usage is recorded server-side in the export endpoint for this flow.
        // Avoid calling recordDownload() here to prevent double count.
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

  return (
    <div className="  text-white overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 lg:py-3">
        {/* Header */}
        <div className="rounded-2xl mb-6 sm:mb-8 border border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/60 p-4 sm:p-5 md:p-6 backdrop-blur shadow-xl backdrop-saturate-150">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Video Editor</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Create short clips from your videos</p>
            </div>
            {canUseUrlWorkflow && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearVideo}
                className="rounded-lg border-slate-600 bg-slate-800/60 text-slate-100 hover:border-slate-400 hover:bg-slate-700 whitespace-nowrap"
              >
                Clear Video
              </Button>
            )}
          </div>
        </div>
       
      </div>

      {!state.videoSource ? (
        // Upload Step
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-700/70 bg-gradient-to-br from-slate-900/50 to-slate-950/60 p-3 sm:p-4 md:p-6 lg:p-8 backdrop-blur">
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
        </div>
      ) : (
        // Editor Layout
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-7">
            {/* Main Editor Area */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Video Player */}
            <div className="rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/40 p-4 sm:p-5 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-700/50">
                <h2 className="text-lg sm:text-xl font-semibold tracking-wide">Preview</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {isBuffering && (
                    <span className="text-xs text-yellow-400 animate-pulse">Buffering...</span>
                  )}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={handlePlaySequence}
                      disabled={!sortedClips.length || isSequencePlaying || isYouTubePlatform}
                      className="flex-1 sm:flex-none rounded-lg bg-gradient-to-r from-slate-800 to-blue-800 text-white shadow-md hover:from-cyan-400 hover:to-blue-400 font-semibold text-sm"
                    >
                      Play
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleStopSequence}
                      className="flex-1 sm:flex-none rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 hover:text-white bg-slate-900/60 font-semibold"
                    >
                      Stop
                    </Button>
                  </div>
                </div>
              </div>

              {isYouTubePlatform && youtubeVideoId ? (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 overflow-hidden shadow-inner">
                  {!showExternalPreview ? (
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                      <p className="mb-2 text-sm font-semibold text-slate-100">YouTube link detected</p>
                      <p className="text-xs text-slate-300 mb-4">
                        Preview loading for YouTube can generate many network requests.
                        Use this button to load the embedded player only when needed.
                      </p>
                      <Button
                        onClick={() => setShowExternalPreview(true)}
                        size="sm"
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                      >
                        Load YouTube Preview
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative w-full aspect-video sm:min-h-[300px] md:min-h-[380px] max-h-[70vh] overflow-hidden rounded-lg bg-black">
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
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-300 dark:border-blue-800">
                          <p className="text-sm font-medium">Loading YouTube preview...</p>
                          <p className="text-xs text-muted-foreground">
                            This may take a moment. Check your URL and network policy if loading fails.
                          </p>
                        </div>
                      )}
                      <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-500/10">
                        <p className="text-sm font-medium text-cyan-100">YouTube link detected</p>
                        <p className="text-xs text-cyan-100/90">
                          Clip sequence preview is enabled for YouTube; export stays disabled for external sources.
                        </p>
                      </div>
                      {state.videoDuration <= 0 && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className="text-sm">Set video duration (seconds)</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={1}
                              className="input input-bordered flex-1"
                              value={state.videoDuration || ''}
                              onChange={(e) => {
                                const value = Number(e.target.value)
                                if (!Number.isNaN(value) && value > 0) {
                                  setVideoDuration(value)
                                }
                              }}
                              placeholder="e.g., 600"
                            />
                            <span className="text-xs text-muted-foreground self-center">Recommended for timeline</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* ── HLS / Social platform player (Facebook, TikTok, Instagram, etc.) ── */}
                  {useSocialPlayer && typeof playbackSource === 'string' ? (
                    <>

                      <SocialVideoPlayer
                        hlsUrl={playbackSource}
                        currentTime={state.currentTime}
                        onTimeUpdate={handlePlayerTimeUpdate}
                        onDurationUpdate={(d) => { if (d && d > 0) setVideoDuration(d) }}
                        onPlay={() => {
                          setPlaying(true)
                          setBufferingState(false)
                          setProxyVideoReady(true)
                        }}
                        onPause={() => {
                          setPlaying(false)
                          setIsSequencePlaying(false)
                          setBufferingState(false)
                        }}
                        onBuffering={setBufferingState}
                        onError={handleVideoError}
                        clipStart={selectedClip?.startTime}
                        clipEnd={selectedClip?.endTime}
                        videoRef={htmlVideoRef}
                      />
                      {proxyVideoReady && (
                        <div className="mt-2 flex items-center gap-2 px-1">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                            HLS Stream — smooth playback, no full download
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                  <>
                  {/* ── Legacy proxy player (old /api/yt-clip?token= streams) ── */}
                  {isProxyPlatform && !proxyVideoReady && (
                    <div className="flex items-center gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 mb-2">
                      <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-cyan-100">Loading video via proxy…</p>
                        <p className="text-xs text-cyan-200/70">yt-dlp is extracting the stream URL. This takes ~5–10s then plays instantly.</p>
                      </div>
                    </div>
                  )}
                  <VideoPlayer
                    src={playbackSource}
                    currentTime={state.currentTime}
                    onTimeUpdate={handlePlayerTimeUpdate}
                    onDurationUpdate={(d) => { if (d && d > 0) setVideoDuration(d) }}
                    onPlay={() => {
                      setPlaying(true)
                      setBufferingState(false)
                      setProxyVideoReady(true)
                    }}
                    onPause={() => {
                      setPlaying(false)
                      setIsSequencePlaying(false)
                      setBufferingState(false)
                    }}
                    onBuffering={setBufferingState}
                    onError={handleVideoError}
                    clipStart={selectedClip?.startTime}
                    clipEnd={selectedClip?.endTime}
                    videoRef={htmlVideoRef}
                  />
                  </>
                  )}
                  {state.videoDuration <= 0 && (isProxyPlatform || useSocialPlayer) && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
                      <label className="text-sm text-slate-300">Set video duration (seconds)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none flex-1"
                          value={state.videoDuration || ''}
                          onChange={(e) => {
                            const value = Number(e.target.value)
                            if (!Number.isNaN(value) && value > 0) setVideoDuration(value)
                          }}
                          placeholder="e.g., 120"
                        />
                        <span className="text-xs text-slate-400 self-center">Needed for timeline</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/60 to-slate-950/40 p-4 sm:p-5 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-2 text-slate-400">
                <p className="text-xs hidden sm:block">Scrollable & draggable • Click to jump • Ctrl+wheel to zoom</p>
                <p className="text-xs sm:hidden">Scroll • Drag • Click to jump</p>
              </div>
              <div className="flex flex-col xs:flex-row xs:flex-wrap items-stretch xs:items-center justify-between gap-2 xs:gap-3">
                <h2 className="text-lg sm:text-xl font-semibold tracking-wide">Timeline</h2>
                {sortedClips.length === 0 && (
                  <Button size="sm" onClick={handleAddClip} className="bg-gradient-to-r from-primary to-cyan-500 text-white">
                    Add Clip
                  </Button>
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
                  if (clip) {
                    updateClip({ ...clip, startTime })
                  }
                }}
                onClipEndChange={(clipId, endTime) => {
                  const clip = sortedClips.find(c => c.id === clipId)
                  if (clip) {
                    updateClip({ ...clip, endTime })
                  }
                }}
              />
            </div>

            {/* Clip duration selector + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3 rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/60 to-slate-950/40 p-4 sm:p-4">
              <label className="text-sm font-semibold tracking-wide whitespace-nowrap">Clip length:</label>
              <select
                value={clipDurationSeconds}
                onChange={(e) => setClipDurationSeconds(Number(e.target.value))}
                className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm font-medium text-white outline-none transition hover:border-cyan-300 focus:border-cyan-400"
              >
                {[5, 10, 15, 20].map((sec) => (
                  <option key={sec} value={sec}>{sec}s</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 sm:ml-auto">Default for new clips</p>
            </div>

            {/* Quick Actions */}
            {sortedClips.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAddClip()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 font-semibold w-full"
                >
                  Add Clip at Current Time
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearClips()
                    selectClip(null)
                    toast.success('All clips cleared')
                  }}
                  className="text-destructive hover:text-destructive w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
          </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-5 md:space-y-6">
              {/* AI Suggestions Toggle */}
              {canUseUrlWorkflow && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAISuggestions(!showAISuggestions)}
                  className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 font-semibold"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {showAISuggestions ? 'Hide Suggestions' : 'AI Suggestions'}
                </Button>
              )}

              {/* AI Suggestions Panel */}
              {showAISuggestions && canUseUrlWorkflow && (
                <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/40 rounded-2xl border border-purple-500/30 p-4 sm:p-5 backdrop-blur-sm">
                  <ClipSuggestionPanel
                    videoUrl={sourceForProcessing || ''}
                    onClipAdd={(startTime, endTime) => {
                      addClip(startTime, endTime)
                    }}
                    onClipPreview={(startTime) => {
                      safeSeek(startTime)
                    }}
                  />
                </div>
              )}

              {/* Clips Panel */}
              <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/40 rounded-2xl border border-slate-700/50 p-4 sm:p-5 min-h-[300px] sm:min-h-[380px] backdrop-blur-sm">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-slate-100">Clips</h2>
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
                <>
                  <Separator className="my-4 sm:my-6" />
                  <div className="space-y-4 sm:space-y-5">
                    <Button
                      onClick={() => setExportDialogOpen(true)}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg font-semibold text-base sm:text-lg py-2.5 sm:py-3"
                      size="lg"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Export Video
                    </Button>

                    {exportDisabledReason && (
                      <p className="text-xs text-red-400/80 text-center bg-red-950/20 rounded-lg p-3 border border-red-800/30">
                        {exportDisabledReason}
                      </p>
                    )}

                    {!canUseUrlWorkflow && (
                      <p className="text-xs text-amber-300/80 text-center bg-amber-950/20 rounded-lg p-3 border border-amber-800/30">
                        Local uploads are best for preview and manual clipping. For the most reliable thumbnails, AI suggestions, and export, use a supported video URL.
                      </p>
                    )}

                    {previewUrl && (
                      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-200">Preview</p>
                        <video src={previewUrl} controls className="w-full max-h-[30vh] sm:max-h-[40vh] object-contain rounded-lg" />
                        <a
                          href={previewUrl}
                          download="clip-export.mp4"
                          className="inline-block text-sm font-medium text-cyan-400 hover:text-cyan-300 transition"
                        >
                          ↓ Download Video
                        </a>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 text-center">
                      Backend processing, streamed to your browser
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
