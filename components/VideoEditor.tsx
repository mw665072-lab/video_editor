'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useVideoEditorState } from '@/hooks/useVideoEditorState'
import { ExportProgress, VideoClip } from '@/lib/types'
import { exportVideo, getExportStatus, downloadExportedVideo, recordDownload } from '@/lib/api'
import { generateClipThumbnail, createThumbnailFromClip } from '@/lib/thumbnailUtils'
import { formatTime, getClipIndexAtTime, getYouTubeVideoId } from '@/lib/videoUtils'
import { toast } from 'sonner'
import YouTube, { YouTubePlayer } from 'react-youtube'

import { VideoUpload } from './VideoUpload'
import { VideoPlayer } from './VideoPlayer'
import { Timeline } from './Timeline'
import { ClipList } from './ClipList'
import { ExportDialog } from './ExportDialog'
import { Trash2, FileDown } from 'lucide-react'

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

  const isFacebookPlatform = state.videoSourceType === 'facebook'
  const isYouTubePlatform =
    state.videoSourceType === 'youtube' ||
    (typeof state.videoSource === 'string' && getYouTubeVideoId(state.videoSource) !== null)
  const isExternalPlatform = isFacebookPlatform || isYouTubePlatform
  const youtubeVideoId =
    isYouTubePlatform && typeof state.videoSource === 'string'
      ? getYouTubeVideoId(state.videoSource)
      : null

  const isClipExportableSource =
    !!state.videoSource &&
    state.videoSourceType !== 'file' &&
    state.videoSourceType !== 'unknown'

  const selectedClip = state.selectedClipId
    ? sortedClips.find(c => c.id === state.selectedClipId)
    : undefined

  const exportDisabledReason = !isClipExportableSource
    ? 'No video source is loaded. Upload or paste a direct or platform URL to export.'
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

  const handlePlaySequence = useCallback(() => {
    if (!sortedClips.length || !state.videoSource) {
      toast.error('Add clips to play sequence')
      return
    }

    const firstClip = sortedClips[0]
    setActiveClipIndex(0)
    setCurrentTime(firstClip.startTime)

    if (state.videoSourceType === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(firstClip.startTime, true)
      youtubePlayerRef.current.playVideo()
    } else {
      setPlaying(true)
    }

    setIsSequencePlaying(true)
  }, [sortedClips, state.videoSource, state.videoSourceType, setCurrentTime, setPlaying])

  const handleStopSequence = useCallback(() => {
    if (state.videoSourceType === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.pauseVideo()
    }

    if (htmlVideoRef.current) {
      htmlVideoRef.current.pause()
    }

    setPlaying(false)
    setIsSequencePlaying(false)
  }, [setPlaying, state.videoSourceType])

  useEffect(() => {
    if (!state.videoSource) {
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

          if (state.videoSourceType === 'youtube' && youtubePlayerRef.current) {
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
  }, [state.videoSource, getLivePlayerTime, syncUIFromPlayerTime, isSequencePlaying, sortedClips, safeSeek, state.videoSourceType, handleStopSequence])

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
    if (!selectedClip || !state.videoSource || isYouTubePlatform || isFacebookPlatform) return

    safeSeek(selectedClip.startTime)
  }, [selectedClip?.id, selectedClip?.startTime, state.videoSource, isYouTubePlatform, isFacebookPlatform, safeSeek])

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
  }, [isYouTubePlatform, state.videoSource])

  useEffect(() => {
    return () => {
      clearSyncInterval()
    }
  }, [clearSyncInterval])

  useEffect(() => {
    if (!state.videoSource || !sortedClips.length) return

    const clipsNeedingThumbnail = sortedClips.filter(c => !c.thumbnailUrl)
    if (!clipsNeedingThumbnail.length) return

    let isCancelled = false

    ;(async () => {
      for (const clip of clipsNeedingThumbnail) {
        if (isCancelled) return
        try {
          const thumb = await generateClipThumbnail(state.videoSource as Blob | string, clip.startTime + 0.5)
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
  }, [state.videoSource, sortedClips, updateClip])

  const handleExport = useCallback(
    async (quality: string, platform: 'tiktok' | 'shorts' | 'reels', resizeMode: 'blur' | 'crop') => {
      if (sortedClips.length === 0) {
        toast.error('Please select clips to export')
        return
      }

      if (!state.videoSource) {
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
        const sourceUrl = String(state.videoSource || '')
        const clipsPayload = sortedClips.map((clip) => ({
          startTime: clip.startTime,
          endTime: clip.endTime,
          order: clip.order,
        }))

        const { jobId } = await exportVideo({
          videoSource: sourceUrl,
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
    [sortedClips, state.videoSource, state.videoFileName, clearVideo]
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="mx-auto max-w-[1340px] space-y-5">
        {/* Header */}
        <div className="rounded-2xl mb-4 border border-slate-800/70 bg-slate-900/70 p-4 backdrop-blur shadow-xl backdrop-saturate-150">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Video Editor</h1>
            {state.videoSource && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearVideo}
                className="rounded-lg border-slate-600 bg-slate-800/60 text-slate-100 hover:border-slate-400 hover:bg-slate-700"
              >
                Clear Video
              </Button>
            )}
          </div>
        </div>
       
      </div>

      {!state.videoSource ? (
        // Upload Step
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/70 p-8">
          <VideoUpload
            onVideoLoaded={(source, duration, fileName, sourceType) => {
              setVideo(source, duration, fileName, sourceType)
              toast.success('Video loaded successfully')
            }}
          />
        </div>
      ) : (
        // Editor Layout
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Editor Area */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-4">
            {/* Video Player */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700">
                <h2 className="text-lg font-semibold tracking-wide">Preview</h2>
                <div className="flex items-center gap-2">
                  {isBuffering && (
                    <span className="text-xs text-warning">Buffering...</span>
                  )}
                  <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handlePlaySequence}
                    disabled={!sortedClips.length || isSequencePlaying || isFacebookPlatform}
                    className="rounded-lg bg-gradient-to-r from-slate-800 to-blue-800 text-white shadow-md hover:from-cyan-400 hover:to-blue-400"
                  >
                    Play Sequence
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStopSequence}
                    // disabled={!isSequencePlaying}
                    className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 hover:text-white bg-slate-900/60 font-semibold"
                  >
                    Stop
                  </Button>
                </div>
              </div>
            </div>

              {isYouTubePlatform && youtubeVideoId ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 overflow-hidden shadow-inner">
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
                      <div className="relative w-full min-h-[220px] sm:min-h-[280px] md:min-h-[340px] max-h-[66vh] overflow-hidden rounded-lg bg-black">
                        <YouTube
                          videoId={youtubeVideoId}
                          opts={youTubeOptions}
                          onReady={handleYouTubeReady}
                          onStateChange={handleYouTubeStateChange}
                          onError={() => {
                            setIsYouTubeReady(false)
                            toast.error('YouTube player error: unable to load video')
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
              ) : isFacebookPlatform ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 overflow-hidden shadow-inner">
                  <iframe
                    title="External video preview"
                    src={getEmbedUrl()}
                    width="100%"
                    height="400"
                    frameBorder="0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    className="w-full"
                  />
                  <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-500/10">
                    <p className="text-sm font-medium text-cyan-100">Facebook link detected</p>
                    <p className="text-xs text-cyan-100/90">
                      Clip selection preview is available, but export is disabled until you provide a direct video source.
                    </p>
                  </div>
                </div>
              ) : (
                <VideoPlayer
                  src={state.videoSource}
                  currentTime={state.currentTime}
                  onTimeUpdate={handlePlayerTimeUpdate}
                  onPlay={() => {
                    setPlaying(true)
                    setBufferingState(false)
                  }}
                  onPause={() => {
                    setPlaying(false)
                    setIsSequencePlaying(false)
                    setBufferingState(false)
                  }}
                  onBuffering={setBufferingState}
                  clipStart={selectedClip?.startTime}
                  clipEnd={selectedClip?.endTime}
                  videoRef={htmlVideoRef}
                />
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
              <div className="flex justify-between items-center pb-2">
                <p className="text-xs text-slate-400">Timeline is scrollable and draggable. Click to jump.</p>
                <p className="text-xs text-slate-400">Zoom with ctrl + mouse wheel</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-wide">Timeline</h2>
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
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
              <label className="text-sm font-medium tracking-wide">Clip length</label>
              <select
                value={clipDurationSeconds}
                onChange={(e) => setClipDurationSeconds(Number(e.target.value))}
                className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm font-medium text-white outline-none transition hover:border-cyan-300"
              >
                {[5, 10, 15, 20].map((sec) => (
                  <option key={sec} value={sec}>{sec} seconds</option>
                ))}
              </select>
              <p className="text-xs text-slate-400">Choose default duration for new clips</p>
            </div>

            {/* Quick Actions */}
            {sortedClips.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAddClip()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
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
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4">
            {/* Clips Panel */}
            <div className="bg-slate-900/70 rounded-lg border border-slate-700 p-4 min-h-[340px]">
              <h2 className="text-lg font-semibold mb-4 text-slate-100">Clips</h2>
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
                <Separator />
                <div className="space-y-3">
                  <Button
                    onClick={() => setExportDialogOpen(true)}
                    // disabled={exportProgress.isExporting || !isClipExportableSource}
                    className="w-full whitespace-nowrap bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg"
                    size="lg"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export Video
                  </Button>

                  {exportDisabledReason && (
                    <p className="text-xs text-red-600 dark:text-red-300 text-center">
                      {exportDisabledReason}
                    </p>
                  )}

                  {previewUrl && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                      <p className="text-sm text-slate-200 mb-2">Clipped preview</p>
                      <video src={previewUrl} controls className="w-full rounded-md" />
                      <a
                        href={previewUrl}
                        download="clip-export.mp4"
                        className="mt-2 inline-block text-sm text-cyan-300 hover:text-cyan-200"
                      >
                        Download clipped video
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    All processing happens on the backend server and result is streamed to browser.
                  </p>
                </div>
              </>
            )}
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
