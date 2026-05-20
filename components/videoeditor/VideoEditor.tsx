'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useVideoEditorState } from '@/hooks/useVideoEditorState'
import { ExportProgress, VideoClip } from '@/lib/types'
import { exportVideo, getExportStatus, downloadExportedVideo, recordDownload, ytResolve, ClipSuggestionResponse, VideoSubtitleSegment, VideoSubtitlesResponse, VideoSummaryResponse } from '@/lib/api'
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
import { EditorAiTools } from './EditorAiTools'

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
  const thumbnailJobsRef = useRef<Set<string>>(new Set())

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

  const seekToSubtitle = useCallback(
    (time: number) => {
      safeSeek(time)
      setIsSequencePlaying(false)

      if (isYouTubePlatform && youtubePlayerRef.current && isYouTubeReady) {
        try {
          youtubePlayerRef.current.seekTo(time, true)
          youtubePlayerRef.current.playVideo()
        } catch {
          // Player may not be ready; safeSeek already updated editor time.
        }
        return
      }

      if (htmlVideoRef.current) {
        htmlVideoRef.current.currentTime = time
        htmlVideoRef.current.play().catch(() => undefined)
      } else {
        setPlaying(true)
      }
    },
    [isYouTubePlatform, isYouTubeReady, safeSeek, setPlaying]
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
  const [videoSummary, setVideoSummary] = useState<VideoSummaryResponse | null>(null)
  const [videoSummaryError, setVideoSummaryError] = useState<string | null>(null)
  const [videoSubtitles, setVideoSubtitles] = useState<VideoSubtitlesResponse | null>(null)
  const [videoSubtitlesError, setVideoSubtitlesError] = useState<string | null>(null)
  const [videoTranscript, setVideoTranscript] = useState<VideoSubtitlesResponse | null>(null)
  const [videoTranscriptError, setVideoTranscriptError] = useState<string | null>(null)
  const [viralMoments, setViralMoments] = useState<ClipSuggestionResponse | null>(null)
  const [viralMomentsError, setViralMomentsError] = useState<string | null>(null)
  const [aiClipCandidates, setAiClipCandidates] = useState<ClipSuggestionResponse | null>(null)
  const [aiClipCandidatesError, setAiClipCandidatesError] = useState<string | null>(null)
  const [showReframePanel, setShowReframePanel] = useState(false)
  const [reframeAspect, setReframeAspect] = useState<'vertical' | 'horizontal' | 'square'>('vertical')
  const [reframeSafeArea, setReframeSafeArea] = useState(true)
  const [selectedToolFromSidebar, setSelectedToolFromSidebar] = useState<string | null>(null)

  const searchParams = useSearchParams()

  // Handle tool selection from sidebar query parameter
  useEffect(() => {
    const tool = searchParams.get('tool')
    if (tool) {
      setSelectedToolFromSidebar(tool)
    }
  }, [searchParams])

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

    const clipsNeedingThumbnail = sortedClips.filter(c => !c.thumbnailUrl && !thumbnailJobsRef.current.has(c.id))
    if (!clipsNeedingThumbnail.length) return

    let isCancelled = false

    ;(async () => {
      for (const clip of clipsNeedingThumbnail) {
        if (isCancelled) return
        thumbnailJobsRef.current.add(clip.id)
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
        } finally {
          thumbnailJobsRef.current.delete(clip.id)
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
    'rounded-2xl border border-white/10 bg-[#100a2f]/85 backdrop-blur-sm shadow-[0_4px_32px_rgba(38,24,103,0.35)]'

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{
        backgroundColor: '#12072f',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(145,85,255,0.16) 0%, transparent 28%), radial-gradient(circle at 80% 18%, rgba(255,179,44,0.08) 0%, transparent 24%)',
      }}
    >
      {/* Subtle grid texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(145,85,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,179,44,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-3 sm:px-5 md:px-8 py-4 sm:py-6">

        {canUseUrlWorkflow && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                clearVideo()
                setVideoSummary(null)
                setVideoSummaryError(null)
                setVideoSubtitles(null)
                setVideoSubtitlesError(null)
                setVideoTranscript(null)
                setVideoTranscriptError(null)
                setViralMoments(null)
                setViralMomentsError(null)
                setAiClipCandidates(null)
                setAiClipCandidatesError(null)
                setShowReframePanel(false)
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/10 text-purple-100 hover:border-purple-400/50 hover:text-white hover:bg-purple-500/10 transition-all duration-200 whitespace-nowrap"
            >
              Clear Video
            </button>
          </div>
        )}

        {!state.videoSource ? (
          // ── Upload Step ───────────────────────────────────────────────────
          <div
            className="flex-1 flex flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed p-5 text-center sm:p-8"
            
          >
            {/* Upload glow accent */}
            <div
              className="absolute w-64 h-64 rounded-full pointer-events-none opacity-15 blur-3xl"
              style={{ background: 'rgba(123,97,255,0.35)' }}
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
                      style={{ background: '#8b5cf6', boxShadow: '0 0 8px rgba(139,92,246,0.7)' }}
                    />
                    <h2 className="text-base sm:text-lg font-bold tracking-wide text-white/90">
                      Preview
                    </h2>
                    {isBuffering && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse"
                        style={{ background: 'rgba(123,97,255,0.14)', color: '#d8c4ff', border: '1px solid rgba(123,97,255,0.25)' }}
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
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
                        color: 'white',
                      }}
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Play
                    </button>
                    <button
                      onClick={handleStopSequence}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-200 hover:border-purple-400/40 hover:text-purple-200"
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: '#150b40',
                        color: '#d8c4ff',
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
                              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
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
                                  toast.loading('We’re preparing your video for playback…', { id: 'stream-fallback' });
                                  ytResolve(originalUrl)
                                    .then((resolved) => {
                                      const proxyUrl = resolved.streamUrl.startsWith('http')
                                        ? resolved.streamUrl
                                        : `${BACKEND_URL}${resolved.streamUrl}`
                                      setYoutubeFallbackUrl(proxyUrl)
                                      toast.success('Loaded via stream proxy', { id: 'stream-fallback' })
                                    })
                                    .catch((fallbackError) => {
                                      console.error('Failed to resolve fallback stream:', fallbackError)
                                      toast.error('YouTube fallback failed — try a different video or URL', { id: 'stream-fallback' })
                                    })
                                } else {
                                  toast.error('YouTube player error — try a different video or URL', { id: 'stream-fallback' })
                                }
                              }}
                              className="absolute inset-0 h-full w-full"
                            />
                          </div>
                          {!isYouTubeReady && (
                            <div
                              className="p-3 text-sm"
                              style={{ background: '#150b40', borderTop: '1px solid rgba(255,255,255,0.08)', color: '#d8c4ff' }}
                            >
                              <p className="font-semibold">Loading YouTube preview…</p>
                              <p className="text-xs opacity-60 mt-0.5 text-purple-200/70">Check your URL and network if loading fails.</p>
                            </div>
                          )}
                          <div
                            className="p-3"
                            style={{ background: '#150b40', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <p className="text-xs font-semibold text-purple-200">● YouTube — clip preview enabled</p>
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
                                style={{ background: '#150b40', border: '1px solid rgba(139,92,246,0.25)', color: '#d8c4ff' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
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
                                style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }}
                              />
                              <div>
                                <p className="text-sm font-semibold text-purple-200">Loading via proxy…</p>
                                <p className="text-xs opacity-60 mt-0.5">yt-dlp extracting stream URL (~5–10s)</p>
                              </div>
                            </div>
                          )}
                          <VideoPlayer
                            src={playbackSource}
                            currentTime={state.currentTime}
                            onTimeUpdate={handlePlayerTimeUpdate}
                            onDurationUpdate={(d) => {
                              if (d && d > 0) {
                                setVideoDuration(d)
                                setProxyVideoReady(true)
                              }
                            }}
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
                  <p className="text-xs text-purple-200/60">Scroll · Drag · Click to jump · Ctrl+wheel to zoom</p>
                </div>

                <div className="flex flex-col xs:flex-row xs:flex-wrap items-stretch xs:items-center justify-between gap-2 xs:gap-3">
                  {sortedClips.length === 0 && (
                    <button
                      onClick={handleAddClip}
                      className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        color: 'white',
                        boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
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
                <div className="flex flex-wrap gap-2">
                  {[5, 7, 10, 15, 20].map((sec) => {
                    const isActive = clipDurationSeconds === sec
                    return (
                      <button
                        key={sec}
                        onClick={() => setClipDurationSeconds(sec)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                          isActive
                            ? 'text-white shadow-[0_2px_8px_rgba(124,58,237,0.4)]'
                            : 'text-purple-200 border border-white/10 hover:bg-[#150b40] hover:text-white'
                        }`}
                        style={
                          isActive
                            ? {
                                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                              }
                            : {
                                background: '#150b40',
                              }
                        }
                      >
                        {sec}s
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={clipDurationSeconds}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      if (!Number.isNaN(value) && value > 0) {
                        setClipDurationSeconds(value)
                      }
                    }}
                    className="w-20 rounded-lg border border-white/10 bg-[#150b40] px-3 py-1.5 text-sm font-semibold text-white outline-none transition-colors duration-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/20"
                  />
                  <span className="text-xs text-purple-200/70">seconds</span>
                </div>
                <p className="text-xs text-purple-200/70 sm:ml-auto">Default for new clips</p>
              </div>

              {/* Quick Actions */}
              {sortedClips.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAddClip()}
                    className="py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                      color: 'white',
                      boxShadow: '0 2px 16px rgba(124,58,237,0.3)',
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
                    className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:border-purple-400/40 hover:text-purple-200"
                    style={{
                      background: '#150b40',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#d8c4ff',
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
              {showReframePanel && (
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    background: '#150b40',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 32px rgba(15,8,52,0.45)',
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">AI Reframe</p>
                      <h2 className="mt-1 text-lg font-black text-white">Resize for every platform</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReframePanel(false)}
                      className="rounded-lg border border-white/10 bg-[#100a2f] px-2.5 py-1.5 text-xs font-black text-purple-200 hover:border-purple-400/40 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2 text-sm font-black text-white">Aspect ratio</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'vertical' as const, label: 'Vertical', sub: '9:16', platform: 'tiktok' as const },
                          { id: 'horizontal' as const, label: 'Wide', sub: '16:9', platform: 'shorts' as const },
                          { id: 'square' as const, label: 'Square', sub: '1:1', platform: 'reels' as const },
                        ].map((option) => {
                          const active = reframeAspect === option.id
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setReframeAspect(option.id)
                                setExportPlatform(option.platform)
                              }}
                              className={`rounded-2xl border p-3 text-left transition ${
                                active
                                  ? 'border-purple-400/60 bg-purple-500/20 text-white'
                                  : 'border-white/10 bg-[#100a2f]/90 text-purple-100 hover:border-purple-400/40'
                              }`}
                            >
                              <span className="block text-sm font-black">{option.label}</span>
                              <span className="mt-1 block text-xs opacity-70">{option.sub}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-black text-white">Fit mode</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'blur' as const, label: 'Blur Fill', desc: 'Keep full frame with blurred background.' },
                          { id: 'crop' as const, label: 'Smart Crop', desc: 'Fill canvas with tighter center crop.' },
                        ].map((option) => {
                          const active = exportResizeMode === option.id
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setExportResizeMode(option.id)}
                              className={`rounded-2xl border p-3 text-left transition ${
                                active
                                  ? 'border-purple-400/60 bg-purple-500/20 text-white'
                                  : 'border-white/10 bg-[#100a2f]/90 text-purple-100 hover:border-purple-400/40'
                              }`}
                            >
                              <span className="block text-sm font-black">{option.label}</span>
                              <span className="mt-1 block text-xs leading-5 opacity-70">{option.desc}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#100a2f]/90 p-3">
                      <span>
                        <span className="block text-sm font-black text-white">Safe area guide</span>
                        <span className="mt-1 block text-xs leading-5 text-purple-100/65">Use this while framing Shorts/Reels/TikTok UI overlays.</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={reframeSafeArea}
                        onChange={(event) => setReframeSafeArea(event.target.checked)}
                        className="h-5 w-5 accent-purple-500"
                      />
                    </label>

                    <div className="rounded-2xl border border-white/10 bg-[#100a2f]/90 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-200">Current Setup</p>
                      <p className="mt-2 text-sm leading-6 text-purple-100/80">
                        Export will use <strong className="text-white">{reframeAspect}</strong> framing with <strong className="text-white">{exportResizeMode}</strong> mode.
                        {reframeSafeArea ? ' Keep the subject centered inside the safe area.' : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExportDialogOpen(true)}
                      disabled={sortedClips.length === 0}
                      className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-500 px-4 py-3 text-sm font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Export Reframed Video
                    </button>
                  </div>
                </div>
              )}

              {(aiClipCandidates || aiClipCandidatesError) && (
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    background: '#150b40',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 32px rgba(15,8,52,0.45)',
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">AI Clipping</p>
                      <h2 className="mt-1 text-lg font-black text-white">Ready-to-cut clips</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAiClipCandidates(null)
                        setAiClipCandidatesError(null)
                      }}
                      className="rounded-lg border border-white/10 bg-[#100a2f] px-2.5 py-1.5 text-xs font-black text-purple-200 hover:border-purple-400/40 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>

                  {aiClipCandidatesError ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                      {aiClipCandidatesError}
                    </div>
                  ) : aiClipCandidates ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-xs leading-5 text-purple-100/70">
                        {aiClipCandidates.data.suggestions.length} AI clips generated. Add the best ones, or add all and export.
                      </div>
                      {aiClipCandidates.data.suggestions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            aiClipCandidates.data.suggestions.forEach((candidate) => addClip(candidate.startTime, candidate.endTime))
                            toast.success('All AI clips added')
                          }}
                          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 px-4 py-2.5 text-sm font-black text-white transition hover:scale-[1.01]"
                        >
                          Add All Clips
                        </button>
                      )}
                      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                        {aiClipCandidates.data.suggestions.map((candidate, index) => (
                          <div key={`${candidate.startTime}-${candidate.endTime}-${index}`} className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-xs font-black text-purple-100">
                                Clip {index + 1}
                              </span>
                              <span className="rounded-full border border-white/10 bg-[#150b40] px-2.5 py-1 text-xs font-black text-purple-100">
                                {formatTime(candidate.startTime)} - {formatTime(candidate.endTime)}
                              </span>
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-100">
                                {Math.round(candidate.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-sm font-black leading-6 text-white">{candidate.reason}</p>
                            {candidate.transcriptSegment && (
                              <p className="mt-2 text-xs leading-5 text-purple-100/65">{candidate.transcriptSegment}</p>
                            )}
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => seekToSubtitle(candidate.startTime)}
                                className="rounded-xl border border-white/10 bg-[#150b40] px-3 py-2 text-xs font-black text-purple-100 transition hover:border-purple-400/50 hover:text-white"
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  addClip(candidate.startTime, candidate.endTime)
                                  toast.success(`Clip ${index + 1} added`)
                                }}
                                className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-400"
                              >
                                Add Clip
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {(viralMoments || viralMomentsError) && (
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    background: '#150b40',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 32px rgba(15,8,52,0.45)',
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">Find Moments</p>
                      <h2 className="mt-1 text-lg font-black text-white">Viral clip candidates</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setViralMoments(null)
                        setViralMomentsError(null)
                      }}
                      className="rounded-lg border border-white/10 bg-[#100a2f] px-2.5 py-1.5 text-xs font-black text-purple-200 hover:border-purple-400/40 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>

                  {viralMomentsError ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                      {viralMomentsError}
                    </div>
                  ) : viralMoments ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-xs leading-5 text-purple-100/70">
                        {viralMoments.data.suggestions.length} moments found from {viralMoments.data.platform}. Preview a moment or add it to your clips.
                      </div>
                      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                        {viralMoments.data.suggestions.map((moment, index) => (
                          <div key={`${moment.startTime}-${moment.endTime}-${index}`} className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-xs font-black text-purple-100">
                                {formatTime(moment.startTime)} - {formatTime(moment.endTime)}
                              </span>
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-100">
                                {Math.round(moment.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-sm font-black leading-6 text-white">{moment.reason}</p>
                            {moment.transcriptSegment && (
                              <p className="mt-2 text-xs leading-5 text-purple-100/65">{moment.transcriptSegment}</p>
                            )}
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => seekToSubtitle(moment.startTime)}
                                className="rounded-xl border border-white/10 bg-[#150b40] px-3 py-2 text-xs font-black text-purple-100 transition hover:border-purple-400/50 hover:text-white"
                              >
                                Preview Moment
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  addClip(moment.startTime, moment.endTime)
                                  toast.success('Moment added to clips')
                                }}
                                className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 px-3 py-2 text-xs font-black text-white transition hover:scale-[1.01]"
                              >
                                Add Clip
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {(videoTranscript || videoTranscriptError) && (
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    background: '#150b40',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 32px rgba(15,8,52,0.45)',
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">Video Transcript</p>
                      <h2 className="mt-1 text-lg font-black text-white">Full spoken transcript</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoTranscript(null)
                        setVideoTranscriptError(null)
                      }}
                      className="rounded-lg border border-white/10 bg-[#100a2f] px-2.5 py-1.5 text-xs font-black text-purple-200 hover:border-purple-400/40 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>

                  {videoTranscriptError ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                      {videoTranscriptError}
                    </div>
                  ) : videoTranscript ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-xs leading-5 text-purple-100/70">
                        {videoTranscript.segments.length} transcript segments generated. Click any segment to play that part.
                      </div>
                      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {videoTranscript.segments.map((segment) => (
                          <button
                            key={segment.id}
                            type="button"
                            onClick={() => seekToSubtitle(segment.start)}
                            className="w-full rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-left transition hover:border-purple-400/40"
                          >
                            <span className="mb-2 inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-xs font-black text-purple-100">
                              {formatTime(segment.start)} - {formatTime(segment.end)}
                            </span>
                            <p className="text-sm leading-6 text-purple-100/85">{segment.text}</p>
                          </button>
                        ))}
                      </div>
                      <details className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-sm text-purple-100/75">
                        <summary className="cursor-pointer font-black text-white">Plain transcript</summary>
                        <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap leading-6">{videoTranscript.transcript}</p>
                      </details>
                    </div>
                  ) : null}
                </div>
              )}

              {(videoSubtitles || videoSubtitlesError) && (
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    background: '#150b40',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 32px rgba(15,8,52,0.45)',
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">AI Subtitles</p>
                      <h2 className="mt-1 text-lg font-black text-white">Editable transcript timeline</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoSubtitles(null)
                        setVideoSubtitlesError(null)
                      }}
                      className="rounded-lg border border-white/10 bg-[#100a2f] px-2.5 py-1.5 text-xs font-black text-purple-200 hover:border-purple-400/40 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>

                  {videoSubtitlesError ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                      {videoSubtitlesError}
                    </div>
                  ) : videoSubtitles ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-xs leading-5 text-purple-100/70">
                        {videoSubtitles.segments.length} subtitle lines generated. Click any timestamp to move the video to that exact part, then edit the text inline.
                      </div>
                      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {videoSubtitles.segments.map((subtitle, index) => (
                          <div key={subtitle.id} className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3">
                            <button
                              type="button"
                              onClick={() => seekToSubtitle(subtitle.start)}
                              className="mb-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-xs font-black text-purple-100 transition hover:border-purple-300/50 hover:text-white"
                            >
                              {formatTime(subtitle.start)} - {formatTime(subtitle.end)}
                            </button>
                            <textarea
                              value={subtitle.text}
                              onClick={() => seekToSubtitle(subtitle.start)}
                              onFocus={() => seekToSubtitle(subtitle.start)}
                              onChange={(event) => {
                                const nextSegments: VideoSubtitleSegment[] = videoSubtitles.segments.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, text: event.target.value } : item
                                )
                                setVideoSubtitles({
                                  ...videoSubtitles,
                                  segments: nextSegments,
                                  transcript: nextSegments.map((item) => item.text).join(' '),
                                })
                              }}
                              className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-[#150b40] p-3 text-sm leading-6 text-white outline-none transition focus:border-purple-400/60"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {(videoSummary || videoSummaryError) && (
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    background: '#150b40',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 32px rgba(15,8,52,0.45)',
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">Video Summary</p>
                      <h2 className="mt-1 text-lg font-black text-white">AI generated overview</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoSummary(null)
                        setVideoSummaryError(null)
                      }}
                      className="rounded-lg border border-white/10 bg-[#100a2f] px-2.5 py-1.5 text-xs font-black text-purple-200 hover:border-purple-400/40 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>

                  {videoSummaryError ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                      {videoSummaryError}
                    </div>
                  ) : videoSummary ? (
                    <div className="space-y-4">
                      <p className="text-sm leading-6 text-purple-100/85">{videoSummary.overview}</p>

                      {videoSummary.keyPoints.length > 0 && (
                        <div>
                          <h3 className="text-sm font-black text-white">Key points</h3>
                          <div className="mt-2 grid gap-2">
                            {videoSummary.keyPoints.map((point, index) => (
                              <div key={`${point}-${index}`} className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-sm leading-6 text-purple-100/80">
                                <span className="mr-2 font-black text-purple-200">{index + 1}.</span>
                                {point}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {videoSummary.chapters.length > 0 && (
                        <div>
                          <h3 className="text-sm font-black text-white">Chapters</h3>
                          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                            {videoSummary.chapters.map((chapter, index) => (
                              <button
                                key={`${chapter.startTime}-${index}`}
                                type="button"
                                onClick={() => safeSeek(chapter.startTime)}
                                className="w-full rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-left transition hover:border-purple-400/40"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-sm font-black text-white">
                                  <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-1 text-xs text-purple-100">
                                    {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                                  </span>
                                  {chapter.title}
                                </div>
                                <p className="mt-2 text-xs leading-5 text-purple-100/70">{chapter.summary}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {(videoSummary.transcript || videoSummary.transcriptPreview) && (
                        <details className="rounded-xl border border-white/10 bg-[#100a2f]/90 p-3 text-sm text-purple-100/75">
                          <summary className="cursor-pointer font-black text-white">Full transcript</summary>
                          <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap leading-6">
                            {videoSummary.transcript || videoSummary.transcriptPreview}
                          </p>
                        </details>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* AI Suggestions Toggle */}
              {canUseUrlWorkflow && (
                <button
                  onClick={() => setShowAISuggestions(!showAISuggestions)}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200"
                  style={{
                    background: showAISuggestions
                      ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
                      : '#150b40',
                    border: showAISuggestions ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    color: showAISuggestions ? 'white' : '#d8c4ff',
                    boxShadow: showAISuggestions ? '0 2px 16px rgba(124,58,237,0.3)' : 'none',
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
                    background: '#150b40',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 0 1px rgba(123,97,255,0.08), 0 8px 32px rgba(15,8,52,0.45)',
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
                  background: '#150b40',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 32px rgba(15,8,52,0.45)',
                }}
              >
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid #2a1a08' }}>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#8b5cf6' }}
                  />
                  <h2 className="text-base sm:text-lg font-bold text-white/90">Clips</h2>
                  {sortedClips.length > 0 && (
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(123,97,255,0.12)', color: '#d8c4ff' }}
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
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        color: 'white',
                        boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
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
                        background: '#150b40',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#d8c4ff',
                      }}
                    >
                      {exportDisabledReason}
                    </div>
                  )}

                  {!canUseUrlWorkflow && (
                    <div
                      className="rounded-lg p-3 text-xs text-center"
                      style={{
                        background: '#150b40',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#d8c4ff',
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
                        style={{ color: '#d8c4ff' }}
                      >
                        ↓ Download Video
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-center text-purple-200/70">
                    Backend processing · streamed to browser
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* AI Tools Modal Handler - triggered from sidebar */}
      <EditorAiTools
        hideToolGrid={true}
        selectedToolSlug={selectedToolFromSidebar}
        onCloseTool={() => {
          setSelectedToolFromSidebar(null)
          // Remove the tool query parameter from URL
          const url = new URL(window.location.href)
          url.searchParams.delete('tool')
          window.history.replaceState({}, '', url.toString())
        }}
        onVideoLoaded={(source, duration, fileName, sourceType, originalSource) => {
          setVideo(source, duration, fileName, sourceType, originalSource)
          setYoutubeFallbackUrl(null)
          setProxyVideoReady(false)
          setSelectedToolFromSidebar(null)
          toast.success('Video loaded successfully')
        }}
        onDurationResolved={(duration) => {
          setVideoDuration(duration)
        }}
        onSummaryGenerated={(summary) => {
          setVideoSummary(summary)
          setVideoSummaryError(null)
          setSelectedToolFromSidebar(null)
          toast.success('Video summary generated')
        }}
        onSummaryFailed={(message) => {
          setVideoSummary(null)
          setVideoSummaryError(message)
          setSelectedToolFromSidebar(null)
          toast.error(message)
        }}
        onSubtitlesGenerated={(subtitles) => {
          setVideoSubtitles(subtitles)
          setVideoSubtitlesError(null)
          setSelectedToolFromSidebar(null)
          toast.success('AI subtitles generated')
        }}
        onSubtitlesFailed={(message) => {
          setVideoSubtitles(null)
          setVideoSubtitlesError(message)
          setSelectedToolFromSidebar(null)
          toast.error(message)
        }}
        onTranscriptGenerated={(transcript) => {
          setVideoTranscript(transcript)
          setVideoTranscriptError(null)
          setSelectedToolFromSidebar(null)
          toast.success('Video transcript generated')
        }}
        onTranscriptFailed={(message) => {
          setVideoTranscript(null)
          setVideoTranscriptError(message)
          setSelectedToolFromSidebar(null)
          toast.error(message)
        }}
        onMomentsGenerated={(moments) => {
          setViralMoments(moments)
          setViralMomentsError(null)
          setSelectedToolFromSidebar(null)
          toast.success('Viral moments found')
        }}
        onMomentsFailed={(message) => {
          setViralMoments(null)
          setViralMomentsError(message)
          setSelectedToolFromSidebar(null)
          toast.error(message)
        }}
        onAiClipsGenerated={(clips) => {
          setAiClipCandidates(clips)
          setAiClipCandidatesError(null)
          setSelectedToolFromSidebar(null)
          toast.success('AI clip candidates generated')
        }}
        onAiClipsFailed={(message) => {
          setAiClipCandidates(null)
          setAiClipCandidatesError(message)
          setSelectedToolFromSidebar(null)
          toast.error(message)
        }}
        onReframeRequested={() => {
          setShowReframePanel(true)
          setExportPlatform('tiktok')
          setExportResizeMode('blur')
          setReframeAspect('vertical')
          setSelectedToolFromSidebar(null)
          toast.success('AI Reframe tools opened')
        }}
      />

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
