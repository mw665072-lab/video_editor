'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useVideoEditorState } from '@/hooks/useVideoEditorState'
import { ExportProgress, VideoClip } from '@/lib/types'
import {
  exportVideo,
  getExportStatus,
  downloadExportedVideo,
  recordDownload,
  ytResolve,
  importYouTubeVideo,
  getYouTubeImportStatus,
  ClipSuggestionResponse,
  VideoSubtitleSegment,
  VideoSubtitlesResponse,
  VideoSummaryResponse,
  YouTubeImportResult,
  YouTubeImportStartResponse,
} from '@/lib/api'
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
import { Trash2, FileDown, Wand2, Play, Square, Plus, RotateCcw, Scissors, Sparkles } from 'lucide-react'
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

  const getCompletedYouTubeImport = useCallback(async (url: string): Promise<YouTubeImportResult> => {
    const extractResult = (payload: YouTubeImportStartResponse): YouTubeImportResult | null => {
      if (payload.result?.streamUrl) return payload.result
      if (payload.streamUrl && payload.importId && payload.title && payload.expiresAt) {
        return {
          importId: payload.importId,
          title: payload.title,
          duration: payload.duration ?? 0,
          streamUrl: payload.streamUrl,
          storageProvider: payload.storageProvider ?? 'local',
          r2Key: payload.r2Key,
          r2Url: payload.r2Url,
          cloudinaryUrl: payload.cloudinaryUrl,
          expiresAt: payload.expiresAt,
        }
      }
      return null
    }

    setExportProgress({
      isExporting: true,
      progress: 5,
      currentStep: 'Importing YouTube video...',
    })

    const started = await importYouTubeVideo(url)
    const immediateResult = extractResult(started)
    if (immediateResult) return immediateResult

    const importJobId = started.importJobId || started.jobId
    const importJobToken = started.importJobToken || started.jobToken
    if (!importJobId) {
      throw new Error(started.error || started.failedReason || 'YouTube import did not return a job id')
    }

    const pollInterval = 1500
    let status = started
    while (['pending', 'waiting', 'delayed', 'active'].includes(status.status)) {
      setExportProgress({
        isExporting: true,
        progress: status.status === 'active' ? 20 : 10,
        currentStep: 'Importing YouTube video...',
      })
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      status = await getYouTubeImportStatus(importJobId, status.importJobToken || status.jobToken || importJobToken)
    }

    if (status.status === 'failed') {
      throw new Error(status.error || status.failedReason || 'YouTube import failed')
    }

    const completedResult = extractResult(status)
    if (!completedResult) {
      throw new Error('YouTube import completed without a stream URL')
    }

    return completedResult
  }, [])

  const getFriendlyExportError = useCallback((error: unknown): string => {
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    const normalized = message.toLowerCase()

    if (
      normalized.includes('youtube import capacity is temporarily full') ||
      normalized.includes('import queue is full')
    ) {
      return 'YouTube connections are temporarily unavailable while the server switches proxies. Wait about one minute, then click Export again. You do not need to refresh or change tabs.'
    }

    return message
  }, [])

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
        let exportPlaybackSource = typeof playbackSource === 'string'
          ? playbackSource
          : sourceForProcessing
        const exportOriginalSource = sourceForProcessing ?? exportPlaybackSource

        if (!exportPlaybackSource) {
          throw new Error('This source cannot be exported yet because no backend-accessible URL is available.')
        }

        if (state.videoSourceType === 'youtube' && exportOriginalSource) {
          const imported = await getCompletedYouTubeImport(exportOriginalSource)
          exportPlaybackSource = imported.streamUrl.startsWith('http')
            ? imported.streamUrl
            : `${BACKEND_URL}${imported.streamUrl}`
          if (imported.duration > 0 && imported.duration !== state.videoDuration) {
            setVideoDuration(imported.duration)
          }
        }

        const clipsPayload = sortedClips.map((clip) => ({
          startTime: clip.startTime,
          endTime: clip.endTime,
          order: clip.order,
        }))

        const { jobId, jobToken } = await exportVideo({
          videoSource: exportPlaybackSource,
          originalSource: exportOriginalSource,
          clips: clipsPayload,
          platform,
          resizeMode,
        })

        const pollInterval = 1500
        let status = await getExportStatus(jobId, jobToken)

        while (status.status === 'pending' || status.status === 'running') {
          setExportProgress({
            isExporting: true,
            progress: status.progress ?? 0,
            currentStep: status.step || 'Processing...',
          })

          await new Promise((resolve) => setTimeout(resolve, pollInterval))
          status = await getExportStatus(jobId, status.jobToken || jobToken)
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
        const errorMessage = getFriendlyExportError(error)
        setExportProgress({
          isExporting: false,
          progress: 0,
          error: errorMessage,
        })
        toast.error(errorMessage)
      }
    },
    [
      BACKEND_URL,
      clearVideo,
      exportDisabledReason,
      getFriendlyExportError,
      getCompletedYouTubeImport,
      isClipExportableSource,
      playbackSource,
      setVideoDuration,
      sortedClips,
      sourceForProcessing,
      state.videoDuration,
      state.videoSourceType,
    ]
  )

  // ─── Shared panel style ───────────────────────────────────────────────────
  const panel =
    'editor-surface rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_10px_30px_rgba(88,66,237,0.04)]'

  return (
    <div className="clip-editor-theme w-full text-[#110d2e]">
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-1 sm:px-2 py-1">

        {state.videoSource && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-[#e4e6f2] px-5 py-3 shadow-[0_4px_20px_rgba(88,66,237,0.03)]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0eeff] border border-[#ded7fb] text-[#5842ed]">
                <Scissors className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-[#110d2e]">Clip Editor Studio</h1>
                  <span className="rounded-full bg-[#f0eeff] border border-[#ded7fb] px-2 py-0.5 text-[10px] font-bold text-[#5842ed]">
                    {isYouTubePlatform ? 'YouTube' : 'Video loaded'}
                  </span>
                </div>
                <p className="text-xs text-[#5e6578]">Set trim markers, reframe, generate captions, and export clips</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-[#e4e6f2] bg-white text-[#5e6578] hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed] transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Change Video
              </button>
              {sortedClips.length > 0 && (
                <button
                  onClick={() => setExportDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#5842ed] hover:bg-[#4730df] text-white shadow-xs transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Export ({sortedClips.length})
                </button>
              )}
            </div>
          </div>
        )}

        {!state.videoSource ? (
          // ── Upload Step ───────────────────────────────────────────────────
          <div
            className="relative flex min-h-[560px] flex-1 flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed border-[#ded7fb] bg-white/80 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-8"
            
          >
            {/* Upload glow accent */}
            <div
              className="absolute w-64 h-64 rounded-full pointer-events-none opacity-15 blur-3xl"
              style={{ background: 'rgba(88,66,237,0.15)' }}
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
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 mb-4 border-b border-[#e4e6f2]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse bg-[#5842ed] shadow-[0_0_8px_rgba(88,66,237,0.7)]"
                    />
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#110d2e]">
                      Preview
                    </h2>
                    {isBuffering && (
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-semibold animate-pulse border border-[#ded7fb] bg-[#f0eeff] text-[#5842ed]"
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
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#5842ed] shadow-sm transition-all duration-200 hover:bg-[#4730df] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Play
                    </button>
                    <button
                      onClick={handleStopSequence}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#e4e6f2] bg-white text-[#5e6578] transition-all duration-200 hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  </div>
                </div>

                {/* Player area */}
                <div
                  className="rounded-2xl border border-[#e4e6f2] bg-[#0c0d14] overflow-hidden shadow-sm"
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
                              background: 'linear-gradient(135deg, #5842ed 0%, #7c3aed 100%)',
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
                              className="px-4 py-3 text-xs bg-[#f8f9fd] border-t border-[#e4e6f2] text-[#5e6578]"
                            >
                              <p className="font-bold text-[#110d2e]">Loading YouTube preview…</p>
                              <p className="text-[11px] text-[#94a3b8] mt-0.5">Check your URL and network if loading takes longer.</p>
                            </div>
                          )}
                          <div
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 px-4 py-2.5 bg-[#f8f9fd] border-t border-[#e4e6f2] text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#5842ed] animate-pulse" />
                              <span className="font-bold text-[#110d2e]">YouTube Stream Preview</span>
                              <span className="text-[#5e6578]">· Interactive trim & scrub active</span>
                            </div>
                            <span className="text-[11px] font-medium text-[#94a3b8]">Exports directly to MP4/WebM</span>
                          </div>
                          {state.videoDuration <= 0 && (
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#e4e6f2] bg-[#f8f9fd]">
                              <label className="text-xs font-semibold text-[#5e6578]">Set video duration (seconds)</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  className="flex-1 rounded-xl px-3 py-1.5 text-xs text-[#110d2e] bg-white border border-[#e4e6f2] outline-none focus:border-[#5842ed]"
                                  value={state.videoDuration || ''}
                                  onChange={(e) => {
                                    const value = Number(e.target.value)
                                    if (!Number.isNaN(value) && value > 0) setVideoDuration(value)
                                  }}
                                  placeholder="e.g., 600"
                                />
                                <span className="text-[11px] text-[#94a3b8] self-center">For timeline</span>
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
                            <div className="px-4 py-2.5 flex items-center gap-2 border-t border-white/10 bg-black/40">
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#5842ed]/20 border border-[#5842ed]/30 text-white"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#5842ed] animate-pulse" />
                                HLS Stream — live playback
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {isProxyPlatform && !proxyVideoReady && (
                            <div
                              className="flex items-center gap-3 px-4 py-3 m-3 rounded-xl bg-white/5 border border-white/10 text-white"
                            >
                              <div
                                className="w-4 h-4 rounded-full border-2 border-[#5842ed] border-t-transparent animate-spin shrink-0"
                              />
                              <div>
                                <p className="text-sm font-semibold text-white">Loading via proxy…</p>
                                <p className="text-xs text-white/60 mt-0.5">yt-dlp extracting stream URL (~5–10s)</p>
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
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 border-t border-white/10 bg-black/30">
                          <label className="text-sm text-white/70">Set video duration (seconds)</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={1}
                              className="rounded-lg px-3 py-1.5 text-sm text-white bg-white/10 border border-white/15 outline-none flex-1 focus:border-[#5842ed]"
                              value={state.videoDuration || ''}
                              onChange={(e) => {
                                const value = Number(e.target.value)
                                if (!Number.isNaN(value) && value > 0) setVideoDuration(value)
                              }}
                              placeholder="e.g., 120"
                            />
                            <span className="text-xs text-white/50 self-center">For timeline</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Timeline Panel */}
              <div className={panel + ' p-4 sm:p-5 space-y-4'}>
                {/* Timeline Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-3 border-b border-[#e4e6f2]">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#110d2e]">Timeline</h2>
                    <p className="text-xs text-[#5e6578]">Click to jump playhead · Drag clip handles to trim</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddClip}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#5842ed] hover:bg-[#4730df] shadow-sm shadow-[#5842ed]/25 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Clip
                    </button>
                    {sortedClips.length > 0 && (
                      <button
                        onClick={() => {
                          clearClips()
                          selectClip(null)
                          toast.success('All clips cleared')
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#e4e6f2] bg-white text-[#5e6578] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear All
                      </button>
                    )}
                  </div>
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

                {/* Integrated Clip length & quick controls bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[#e4e6f2] text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#110d2e]">Default clip length:</span>
                    {[5, 7, 10, 15, 20].map((sec) => {
                      const isActive = clipDurationSeconds === sec
                      return (
                        <button
                          key={sec}
                          onClick={() => setClipDurationSeconds(sec)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            isActive
                              ? 'bg-[#5842ed] text-white shadow-xs'
                              : 'border border-[#e4e6f2] bg-[#f8f9fd] text-[#5e6578] hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]'
                          }`}
                        >
                          {sec}s
                        </button>
                      )
                    })}
                    <div className="flex items-center gap-1 ml-1">
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
                        className="w-14 rounded-lg border border-[#e4e6f2] bg-[#f8f9fd] px-2 py-1 text-center font-bold text-[#110d2e] outline-none focus:border-[#5842ed] focus:bg-white"
                      />
                      <span className="text-[#5e6578]">sec</span>
                    </div>
                  </div>
                  <span className="text-[#94a3b8] hidden md:inline">Ctrl + scroll to zoom</span>
                </div>
              </div>
            </div>

            {/* ── Sidebar ───────────────────────────────────────────────────── */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-5">
              {showReframePanel && (
                <div
                  className="rounded-2xl border border-[#e4e6f2] bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(88,66,237,0.04)] text-[#110d2e]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e4e6f2] pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5842ed]">AI Reframe</p>
                      <h2 className="mt-0.5 text-lg font-bold text-[#110d2e]">Resize for every platform</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReframePanel(false)}
                      className="rounded-xl border border-[#e4e6f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#5e6578] transition hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                    >
                      Hide
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#110d2e]">Aspect ratio</h3>
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
                                  ? 'border-[#5842ed] bg-[#f0eeff] text-[#5842ed] shadow-sm'
                                  : 'border-[#e4e6f2] bg-[#f8f9fd] text-[#5e6578] hover:border-[#5842ed]/40 hover:text-[#110d2e]'
                              }`}
                            >
                              <span className="block text-sm font-bold">{option.label}</span>
                              <span className="mt-1 block text-xs opacity-70">{option.sub}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#110d2e]">Fit mode</h3>
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
                                  ? 'border-[#5842ed] bg-[#f0eeff] text-[#5842ed] shadow-sm'
                                  : 'border-[#e4e6f2] bg-[#f8f9fd] text-[#5e6578] hover:border-[#5842ed]/40 hover:text-[#110d2e]'
                              }`}
                            >
                              <span className="block text-sm font-bold">{option.label}</span>
                              <span className="mt-1 block text-xs leading-5 opacity-70">{option.desc}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#e4e6f2] bg-[#f8f9fd] p-3">
                      <span>
                        <span className="block text-sm font-bold text-[#110d2e]">Safe area guide</span>
                        <span className="mt-0.5 block text-xs text-[#5e6578]">Use this while framing Shorts/Reels/TikTok UI overlays.</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={reframeSafeArea}
                        onChange={(event) => setReframeSafeArea(event.target.checked)}
                        className="h-4 w-4 rounded accent-[#5842ed]"
                      />
                    </label>

                    <div className="rounded-2xl border border-[#ded7fb] bg-[#f0eeff]/60 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5842ed]">Current Setup</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#5e6578]">
                        Export will use <strong className="text-[#110d2e]">{reframeAspect}</strong> framing with <strong className="text-[#110d2e]">{exportResizeMode}</strong> mode.
                        {reframeSafeArea ? ' Keep the subject centered inside the safe area.' : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExportDialogOpen(true)}
                      disabled={sortedClips.length === 0}
                      className="w-full rounded-2xl bg-[#5842ed] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#5842ed]/25 transition hover:bg-[#4730df] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Export Reframed Video
                    </button>
                  </div>
                </div>
              )}

              {(aiClipCandidates || aiClipCandidatesError) && (
                <div
                  className="rounded-2xl border border-[#e4e6f2] bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(88,66,237,0.04)] text-[#110d2e]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e4e6f2] pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5842ed]">AI Clipping</p>
                      <h2 className="mt-0.5 text-lg font-bold text-[#110d2e]">Ready-to-cut clips</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAiClipCandidates(null)
                        setAiClipCandidatesError(null)
                      }}
                      className="rounded-xl border border-[#e4e6f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#5e6578] transition hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                    >
                      Hide
                    </button>
                  </div>

                  {aiClipCandidatesError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-600">
                      {aiClipCandidatesError}
                    </div>
                  ) : aiClipCandidates ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[#ded7fb] bg-[#f0eeff]/60 p-3 text-xs leading-relaxed text-[#5842ed]">
                        {aiClipCandidates.data.suggestions.length} AI clips generated. Add the best ones, or add all and export.
                      </div>
                      {aiClipCandidates.data.suggestions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            aiClipCandidates.data.suggestions.forEach((candidate) => addClip(candidate.startTime, candidate.endTime))
                            toast.success('All AI clips added')
                          }}
                          className="w-full rounded-xl bg-[#5842ed] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4730df]"
                        >
                          Add All Clips
                        </button>
                      )}
                      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                        {aiClipCandidates.data.suggestions.map((candidate, index) => (
                          <div key={`${candidate.startTime}-${candidate.endTime}-${index}`} className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-[#ded7fb] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#5842ed]">
                                Clip {index + 1}
                              </span>
                              <span className="rounded-full border border-[#e4e6f2] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#5e6578]">
                                {formatTime(candidate.startTime)} - {formatTime(candidate.endTime)}
                              </span>
                              <span className="rounded-full border border-[#ded7fb] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#5842ed]">
                                {Math.round(candidate.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-sm font-bold leading-relaxed text-[#110d2e]">{candidate.reason}</p>
                            {candidate.transcriptSegment && (
                              <p className="mt-1 text-xs leading-relaxed text-[#5e6578]">{candidate.transcriptSegment}</p>
                            )}
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => seekToSubtitle(candidate.startTime)}
                                className="rounded-xl border border-[#e4e6f2] bg-white px-3 py-1.5 text-xs font-semibold text-[#5e6578] transition hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  addClip(candidate.startTime, candidate.endTime)
                                  toast.success(`Clip ${index + 1} added`)
                                }}
                                className="rounded-xl bg-[#5842ed] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4730df]"
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
                  className="rounded-2xl border border-[#e4e6f2] bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(88,66,237,0.04)] text-[#110d2e]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e4e6f2] pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5842ed]">Find Moments</p>
                      <h2 className="mt-0.5 text-lg font-bold text-[#110d2e]">Viral clip candidates</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setViralMoments(null)
                        setViralMomentsError(null)
                      }}
                      className="rounded-xl border border-[#e4e6f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#5e6578] transition hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                    >
                      Hide
                    </button>
                  </div>

                  {viralMomentsError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-600">
                      {viralMomentsError}
                    </div>
                  ) : viralMoments ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[#ded7fb] bg-[#f0eeff]/60 p-3 text-xs leading-relaxed text-[#5842ed]">
                        {viralMoments.data.suggestions.length} moments found from {viralMoments.data.platform}. Preview a moment or add it to your clips.
                      </div>
                      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                        {viralMoments.data.suggestions.map((moment, index) => (
                          <div key={`${moment.startTime}-${moment.endTime}-${index}`} className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-[#ded7fb] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#5842ed]">
                                {formatTime(moment.startTime)} - {formatTime(moment.endTime)}
                              </span>
                              <span className="rounded-full border border-[#ded7fb] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#5842ed]">
                                {Math.round(moment.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-sm font-bold leading-relaxed text-[#110d2e]">{moment.reason}</p>
                            {moment.transcriptSegment && (
                              <p className="mt-1 text-xs leading-relaxed text-[#5e6578]">{moment.transcriptSegment}</p>
                            )}
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => seekToSubtitle(moment.startTime)}
                                className="rounded-xl border border-[#e4e6f2] bg-white px-3 py-1.5 text-xs font-semibold text-[#5e6578] transition hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                              >
                                Preview Moment
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  addClip(moment.startTime, moment.endTime)
                                  toast.success('Moment added to clips')
                                }}
                                className="rounded-xl bg-[#5842ed] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4730df]"
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
                  className="rounded-2xl border border-[#e4e6f2] bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(88,66,237,0.04)] text-[#110d2e]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e4e6f2] pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5842ed]">Video Transcript</p>
                      <h2 className="mt-0.5 text-lg font-bold text-[#110d2e]">Full spoken transcript</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoTranscript(null)
                        setVideoTranscriptError(null)
                      }}
                      className="rounded-xl border border-[#e4e6f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#5e6578] transition hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                    >
                      Hide
                    </button>
                  </div>

                  {videoTranscriptError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-600">
                      {videoTranscriptError}
                    </div>
                  ) : videoTranscript ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[#ded7fb] bg-[#f0eeff]/60 p-3 text-xs leading-relaxed text-[#5842ed]">
                        {videoTranscript.segments.length} transcript segments generated. Click any segment to play that part.
                      </div>
                      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {videoTranscript.segments.map((segment) => (
                          <button
                            key={segment.id}
                            type="button"
                            onClick={() => seekToSubtitle(segment.start)}
                            className="w-full rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3 text-left transition hover:border-[#5842ed]/50 hover:bg-[#f0eeff]/50"
                          >
                            <span className="mb-2 inline-flex rounded-full border border-[#ded7fb] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#5842ed]">
                              {formatTime(segment.start)} - {formatTime(segment.end)}
                            </span>
                            <p className="text-sm leading-relaxed text-[#110d2e]">{segment.text}</p>
                          </button>
                        ))}
                      </div>
                      <details className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3 text-sm text-[#5e6578]">
                        <summary className="cursor-pointer font-bold text-[#110d2e]">Plain transcript</summary>
                        <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed text-xs">{videoTranscript.transcript}</p>
                      </details>
                    </div>
                  ) : null}
                </div>
              )}

              {(videoSubtitles || videoSubtitlesError) && (
                <div
                  className="rounded-2xl border border-[#e4e6f2] bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(88,66,237,0.04)] text-[#110d2e]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e4e6f2] pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5842ed]">AI Subtitles</p>
                      <h2 className="mt-0.5 text-lg font-bold text-[#110d2e]">Editable transcript timeline</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoSubtitles(null)
                        setVideoSubtitlesError(null)
                      }}
                      className="rounded-xl border border-[#e4e6f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#5e6578] transition hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                    >
                      Hide
                    </button>
                  </div>

                  {videoSubtitlesError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-600">
                      {videoSubtitlesError}
                    </div>
                  ) : videoSubtitles ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[#ded7fb] bg-[#f0eeff]/60 p-3 text-xs leading-relaxed text-[#5842ed]">
                        {videoSubtitles.segments.length} subtitle lines generated. Click any timestamp to move the video to that exact part, then edit the text inline.
                      </div>
                      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {videoSubtitles.segments.map((subtitle, index) => (
                          <div key={subtitle.id} className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3">
                            <button
                              type="button"
                              onClick={() => seekToSubtitle(subtitle.start)}
                              className="mb-2 rounded-full border border-[#ded7fb] bg-white px-2.5 py-1 text-xs font-semibold text-[#5842ed] transition hover:bg-[#5842ed] hover:text-white"
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
                              className="min-h-20 w-full resize-y rounded-xl border border-[#e4e6f2] bg-white p-3 text-sm leading-relaxed text-[#110d2e] outline-none transition focus:border-[#5842ed] focus:ring-2 focus:ring-[#5842ed]/10"
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
                  className="rounded-2xl border border-[#e4e6f2] bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(88,66,237,0.04)] text-[#110d2e]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e4e6f2] pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5842ed]">Video Summary</p>
                      <h2 className="mt-0.5 text-lg font-bold text-[#110d2e]">AI generated overview</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoSummary(null)
                        setVideoSummaryError(null)
                      }}
                      className="rounded-xl border border-[#e4e6f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#5e6578] transition hover:border-[#5842ed]/40 hover:bg-[#f0eeff] hover:text-[#5842ed]"
                    >
                      Hide
                    </button>
                  </div>

                  {videoSummaryError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-600">
                      {videoSummaryError}
                    </div>
                  ) : videoSummary ? (
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed text-[#5e6578]">{videoSummary.overview}</p>

                      {videoSummary.keyPoints.length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#110d2e]">Key points</h3>
                          <div className="mt-2 grid gap-2">
                            {videoSummary.keyPoints.map((point, index) => (
                              <div key={`${point}-${index}`} className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3 text-xs leading-relaxed text-[#110d2e]">
                                <span className="mr-2 font-bold text-[#5842ed]">{index + 1}.</span>
                                {point}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {videoSummary.chapters.length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#110d2e]">Chapters</h3>
                          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                            {videoSummary.chapters.map((chapter, index) => (
                              <button
                                key={`${chapter.startTime}-${index}`}
                                type="button"
                                onClick={() => safeSeek(chapter.startTime)}
                                className="w-full rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3 text-left transition hover:border-[#5842ed]/50 hover:bg-[#f0eeff]/50"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#110d2e]">
                                  <span className="rounded-full border border-[#ded7fb] bg-white px-2 py-0.5 text-xs font-semibold text-[#5842ed]">
                                    {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                                  </span>
                                  {chapter.title}
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-[#5e6578]">{chapter.summary}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {(videoSummary.transcript || videoSummary.transcriptPreview) && (
                        <details className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3 text-sm text-[#5e6578]">
                          <summary className="cursor-pointer font-bold text-[#110d2e]">Full transcript</summary>
                          <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed text-xs">
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
                  className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                    showAISuggestions
                      ? 'bg-[#5842ed] text-white shadow-md shadow-[#5842ed]/25 ring-2 ring-[#5842ed]/20'
                      : 'border border-[#ded7fb] bg-[#f0eeff] text-[#5842ed] hover:bg-[#5842ed] hover:text-white shadow-xs'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {showAISuggestions ? 'Hide AI Suggestions' : 'Auto-Find Moments & AI Suggestions'}
                </button>
              )}

              {/* AI Suggestions Panel */}
              {showAISuggestions && canUseUrlWorkflow && (
                <div
                  className="rounded-2xl border border-[#e4e6f2] bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(88,66,237,0.04)]"
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
                className="rounded-2xl border border-[#e4e6f2] bg-white p-4 sm:p-5 min-h-[300px] sm:min-h-[380px] shadow-[0_10px_30px_rgba(88,66,237,0.04)]"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e4e6f2]">
                  <span
                    className="w-2 h-2 rounded-full bg-[#5842ed]"
                  />
                  <h2 className="text-base sm:text-lg font-bold text-[#110d2e]">Clips</h2>
                  {sortedClips.length > 0 && (
                    <span
                      className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold border border-[#ded7fb] bg-[#f0eeff] text-[#5842ed]"
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
                  <div className="border-t border-[#e4e6f2] pt-4">
                    <button
                      onClick={() => setExportDialogOpen(true)}
                      className="w-full py-3.5 rounded-2xl bg-[#5842ed] hover:bg-[#4730df] text-white text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#5842ed]/25 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <FileDown className="w-5 h-5" />
                      EXPORT VIDEO
                    </button>
                  </div>

                  {exportDisabledReason && (
                    <div
                      className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3 text-xs text-center text-[#5e6578]"
                    >
                      {exportDisabledReason}
                    </div>
                  )}

                  {!canUseUrlWorkflow && (
                    <div
                      className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3 text-xs text-center text-[#5e6578]"
                    >
                      Local uploads are best for preview. Use a supported URL for AI suggestions and export.
                    </div>
                  )}

                  {previewUrl && (
                    <div
                      className="rounded-2xl border border-[#e4e6f2] bg-[#f8f9fd] p-4 space-y-3 shadow-sm"
                    >
                      <p className="text-sm font-bold text-[#110d2e]">Preview</p>
                      <video src={previewUrl} controls className="w-full max-h-[30vh] sm:max-h-[40vh] object-contain rounded-xl border border-[#e4e6f2]" />
                      <a
                        href={previewUrl}
                        download="clip-export.mp4"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5842ed] hover:underline"
                      >
                        ↓ Download Video
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-center text-[#5e6578]">
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
