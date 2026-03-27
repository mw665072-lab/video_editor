'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useVideoEditorState } from '@/hooks/useVideoEditorState'
import { ExportProgress, VideoClip } from '@/lib/types'
import { processClips, downloadBlob } from '@/lib/ffmpegUtils'
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

  const isClipExportableSource = !!state.videoSource

  const selectedClip = state.selectedClipId
    ? sortedClips.find(c => c.id === state.selectedClipId)
    : undefined

  const exportDisabledReason = !isClipExportableSource
    ? 'No video source is loaded. Upload or paste a direct or platform URL to export.'
    : undefined

  const youtubePlayerRef = useRef<YouTubePlayer | null>(null)
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null)
  const youtubeTimeUpdaterRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const [isYouTubeReady, setIsYouTubeReady] = useState(false)
  const [showYouTubeLoadingHint, setShowYouTubeLoadingHint] = useState(false)

  const clearYouTubeTimeUpdater = useCallback(() => {
    if (youtubeTimeUpdaterRef.current !== null) {
      window.clearInterval(youtubeTimeUpdaterRef.current)
      youtubeTimeUpdaterRef.current = null
    }
  }, [])

  const syncYouTubePlayerTime = useCallback(
    (time: number) => {
      const player = youtubePlayerRef.current
      if (!player) return

      try {
        const playerTime = player.getCurrentTime()
        if (Math.abs(playerTime - time) > 0.5) {
          player.seekTo(time, true)
        }
      } catch {
        // ignore unavailable player state until ready
      }
    },
    []
  )

  const youTubeOptions: any = {
    width: '100%',
    height: '400',
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      // Keep start fixed so frequent currentTime updates don't cause YouTube re-initialization/re-seek
      start: 0,
    },
  }

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

      if (state.currentTime > 0) {
        event.target.seekTo(state.currentTime, true)
      }
    },
    [setVideoDuration, state.currentTime, state.videoDuration]
  )

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
  })
  const [isSequencePlaying, setIsSequencePlaying] = useState(false)
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0)

  const handleYouTubeStateChange = useCallback(
    (event: { data: number; target: YouTubePlayer }) => {
      const player = event.target
      const playerState = event.data
      console.log('YouTube state change', { playerState })

      if (playerState === 1) {
        setPlaying(true)
        clearYouTubeTimeUpdater()
        youtubeTimeUpdaterRef.current = window.setInterval(() => {
          const current = player.getCurrentTime()
          setCurrentTime(current)
        }, 200)
      } else if (playerState === 2) {
        setPlaying(false)
        clearYouTubeTimeUpdater()
      } else if (playerState === 0) {
        const current = player.getCurrentTime()
        setCurrentTime(current)
        if (isSequencePlaying) {
          // sequence manager useEffect will advance clip
        }
      }
    },
    [setCurrentTime, setPlaying, clearYouTubeTimeUpdater, isSequencePlaying]
  )

  const getEmbedUrl = () => {
    if (state.videoSourceType === 'facebook' && typeof state.videoSource === 'string') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(state.videoSource)}`
    }
    return ''
  }


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
      clearYouTubeTimeUpdater()
    }

    setPlaying(false)
    setIsSequencePlaying(false)
  }, [setPlaying, state.videoSourceType, clearYouTubeTimeUpdater])

  useEffect(() => {
    if (!state.isPlaying || !htmlVideoRef.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const step = () => {
      const video = htmlVideoRef.current
      if (!video) return

      const playbackTime = video.currentTime
      if (Math.abs(playbackTime - state.currentTime) > 0.05) {
        setCurrentTime(playbackTime)
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [state.isPlaying, state.currentTime, setCurrentTime])

  const handleAddClip = useCallback(() => {
    if (state.videoDuration === 0) {
      toast.error('Please load a video first')
      return
    }

    const videoCurrentTime = htmlVideoRef.current?.currentTime ?? state.currentTime ?? 0
    const clampedStart = Math.min(Math.max(0, videoCurrentTime), state.videoDuration)
    const defaultDuration = 10
    const clampedEnd = Math.min(clampedStart + defaultDuration, state.videoDuration)

    addClip(clampedStart, clampedEnd)
    toast.success(`Clip added: ${formatTime(clampedStart)} → ${formatTime(clampedEnd)}`)
  }, [state.videoDuration, state.currentTime, addClip])

  useEffect(() => {
    if (!isSequencePlaying || !state.isPlaying || !sortedClips.length) return

    const idx = getClipIndexAtTime(sortedClips, state.currentTime)

    if (idx === -1) {
      const firstClip = sortedClips[0]
      const lastClip = sortedClips[sortedClips.length - 1]

      if (state.currentTime < firstClip.startTime) {
        setCurrentTime(firstClip.startTime)
        setActiveClipIndex(0)
        return
      }

      if (state.currentTime >= lastClip.endTime) {
        handleStopSequence()
        return
      }

      const nextClipIndex = sortedClips.findIndex(c => c.startTime > state.currentTime)
      if (nextClipIndex !== -1) {
        setActiveClipIndex(nextClipIndex)
        setCurrentTime(sortedClips[nextClipIndex].startTime)
        return
      }

      handleStopSequence()
      return
    }

    if (idx !== activeClipIndex) {
      setActiveClipIndex(idx)
    }

    const clip = sortedClips[idx]

    if (state.currentTime >= clip.endTime - 0.08) {
      const nextClip = sortedClips[idx + 1]
      if (nextClip) {
        setCurrentTime(nextClip.startTime)
        setActiveClipIndex(idx + 1)
      } else {
        handleStopSequence()
      }
    }
  }, [isSequencePlaying, state.currentTime, state.isPlaying, sortedClips, activeClipIndex, setCurrentTime, handleStopSequence])

  useEffect(() => {
    if (!isYouTubePlatform || !youtubePlayerRef.current) return

    syncYouTubePlayerTime(state.currentTime)
  }, [isYouTubePlatform, state.currentTime, syncYouTubePlayerTime])

  useEffect(() => {
    if (!selectedClip || !state.videoSource || isYouTubePlatform || isFacebookPlatform) return

    setCurrentTime(selectedClip.startTime)
  }, [selectedClip?.id, selectedClip?.startTime, state.videoSource, isYouTubePlatform, isFacebookPlatform, setCurrentTime])

  useEffect(() => {
    if (!isYouTubePlatform) return

    setIsYouTubeReady(false)
    setShowYouTubeLoadingHint(true)

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
      clearYouTubeTimeUpdater()
    }
  }, [clearYouTubeTimeUpdater])

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
    async (quality: string) => {
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
        currentStep: 'Preparing...',
      })

      try {
        const outputBlob = await processClips(
          state.videoSource,
          sortedClips,
          quality as 'fast' | 'medium' | 'slow',
          (progress, step) => {
            setExportProgress({
              isExporting: true,
              progress,
              currentStep: step,
              error: undefined,
            })
          }
        )

        await downloadBlob(outputBlob, 'final-output')

        setExportProgress({
          isExporting: false,
          progress: 100,
          currentStep: 'Complete!',
        })

        toast.success('Video exported successfully')
        setExportDialogOpen(false)

        // Reset progress after a delay
        setTimeout(() => {
          setExportProgress({
            isExporting: false,
            progress: 0,
          })
        }, 2000)
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
    [sortedClips, state.videoSource, state.videoFileName]
  )

  return (
    <div className="w-full h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Video Editor</h1>
        {state.videoSource && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearVideo}
            className="text-destructive hover:text-destructive"
          >
            Clear Video
          </Button>
        )}
      </div>

      {!state.videoSource ? (
        // Upload Step
        <div className="flex-1 flex flex-col items-center justify-center">
          <VideoUpload
            onVideoLoaded={(source, duration, fileName, sourceType) => {
              setVideo(source, duration, fileName, sourceType)
              toast.success('Video loaded successfully')
            }}
          />
        </div>
      ) : (
        // Editor Layout
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Preview</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handlePlaySequence}
                    disabled={!sortedClips.length || isSequencePlaying || isFacebookPlatform}
                  >
                    Play Sequence
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStopSequence}
                    disabled={!isSequencePlaying}
                  >
                    Stop
                  </Button>
                </div>
              </div>

              {isYouTubePlatform && youtubeVideoId ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <YouTube
                    videoId={youtubeVideoId}
                    opts={youTubeOptions}
                    onReady={handleYouTubeReady}
                    onStateChange={handleYouTubeStateChange}
                    onError={() => {
                      setIsYouTubeReady(false)
                      toast.error('YouTube player error: unable to load video')
                    }}
                  />
                  {!isYouTubeReady && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-300 dark:border-blue-800">
                      <p className="text-sm font-medium">Loading YouTube preview...</p>
                      <p className="text-xs text-muted-foreground">
                        This may take a moment. Check your URL and network policy if loading fails.
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-950/20 rounded-lg border border-yellow-300 dark:border-yellow-800">
                    <p className="text-sm font-medium">YouTube link detected.</p>
                    <p className="text-xs text-muted-foreground">
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
                </div>
              ) : isFacebookPlatform ? (
                <div className="rounded-lg border border-border overflow-hidden">
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
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-950/20 rounded-lg border border-yellow-300 dark:border-yellow-800">
                    <p className="text-sm font-medium">Facebook link detected.</p>
                    <p className="text-xs text-muted-foreground">
                      Clip selection preview is available, but export is disabled until you provide a direct video source.
                    </p>
                  </div>
                </div>
              ) : (
                <VideoPlayer
                  src={state.videoSource}
                  currentTime={state.currentTime}
                  onTimeUpdate={setCurrentTime}
                  onPlay={() => setPlaying(true)}
                  onPause={() => {
                    setPlaying(false)
                    setIsSequencePlaying(false)
                  }}
                  clipStart={selectedClip?.startTime}
                  clipEnd={selectedClip?.endTime}
                  videoRef={htmlVideoRef}
                />
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Timeline</h2>
                {sortedClips.length === 0 && (
                  <Button size="sm" onClick={handleAddClip}>
                    Add Clip
                  </Button>
                )}
              </div>
              <Timeline
                duration={state.videoDuration}
                clips={sortedClips}
                currentTime={state.currentTime}
                onTimeChange={setCurrentTime}
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

            {/* Quick Actions */}
            {sortedClips.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newClip = {
                      ...sortedClips[sortedClips.length - 1],
                      startTime: state.currentTime,
                      endTime: Math.min(state.currentTime + 10, state.videoDuration),
                    }
                    addClip(newClip.startTime, newClip.endTime)
                    toast.success('New clip added')
                  }}
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
          <div className="space-y-4">
            {/* Clips Panel */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h2 className="text-lg font-semibold mb-4">Clips</h2>
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
                    disabled={exportProgress.isExporting || !isClipExportableSource}
                    className="w-full"
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

                  <p className="text-xs text-muted-foreground text-center">
                    All processing happens locally in your browser
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
