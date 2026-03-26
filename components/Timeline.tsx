'use client'

import { useRef, useEffect, useState } from 'react'
import { formatTime, pixelsToTime, timeToPixels } from '@/lib/videoUtils'
import { VideoClip } from '@/lib/types'

interface TimelineProps {
  duration: number
  clips: VideoClip[]
  currentTime: number
  onTimeChange: (time: number) => void
  onClipSelect?: (clipId: string) => void
  selectedClipId?: string | null
  onClipStartChange?: (clipId: string, startTime: number) => void
  onClipEndChange?: (clipId: string, endTime: number) => void
}

const PIXELS_PER_SECOND = 50
const FRAME_RATE = 30

function snapTimeToFrame(time: number): number {
  return Number((Math.round(time * FRAME_RATE) / FRAME_RATE).toFixed(3))
}

export function Timeline({
  duration,
  clips,
  currentTime,
  onTimeChange,
  onClipSelect,
  selectedClipId,
  onClipStartChange,
  onClipEndChange,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedHandle, setDraggedHandle] = useState<{
    clipId: string
    side: 'start' | 'end'
  } | null>(null)

  const totalWidth = timeToPixels(duration, PIXELS_PER_SECOND)

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedHandle) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const time = snapTimeToFrame(pixelsToTime(x, PIXELS_PER_SECOND))
    onTimeChange(Math.max(0, Math.min(time, duration)))
  }

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    clipId: string,
    side: 'start' | 'end'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDraggedHandle({ clipId, side })
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !draggedHandle) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const time = snapTimeToFrame(Math.max(0, Math.min(pixelsToTime(x, PIXELS_PER_SECOND), duration)))

      const clip = clips.find(c => c.id === draggedHandle.clipId)
      if (!clip) return

      if (draggedHandle.side === 'start') {
        if (time < clip.endTime) {
          onClipStartChange?.(clip.id, time)
        }
      } else {
        if (time > clip.startTime) {
          onClipEndChange?.(clip.id, time)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setDraggedHandle(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, draggedHandle, clips, duration, onClipStartChange, onClipEndChange])

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center px-2">
        <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
        <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
      </div>

      <div className="relative bg-slate-100 dark:bg-slate-900 rounded-lg border border-border overflow-hidden">
        {/* Timeline track */}
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className="relative h-32 cursor-pointer overflow-x-auto"
          style={{ width: totalWidth > 600 ? totalWidth : '100%' }}
        >
          {/* Playback cursor */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none transition-all"
            style={{
              left: `${timeToPixels(currentTime, PIXELS_PER_SECOND)}px`,
            }}
          />

          {/* Clips visualization */}
          {clips.map((clip) => {
            const startPixels = timeToPixels(clip.startTime, PIXELS_PER_SECOND)
            const endPixels = timeToPixels(clip.endTime, PIXELS_PER_SECOND)
            const widthPixels = endPixels - startPixels
            const isSelected = selectedClipId === clip.id

            return (
              <div
                key={clip.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onClipSelect?.(clip.id)
                }}
                className={`absolute top-4 h-20 rounded cursor-move border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/20'
                    : 'border-primary/50 bg-primary/10 hover:border-primary'
                }`}
                style={{
                  left: `${startPixels}px`,
                  width: `${Math.max(2, widthPixels)}px`,
                }}
              >
                {/* Start handle */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, clip.id, 'start')}
                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary hover:bg-primary/80 cursor-ew-resize rounded-l"
                />

                {/* End handle */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, clip.id, 'end')}
                  className="absolute right-0 top-0 bottom-0 w-1 bg-primary hover:bg-primary/80 cursor-ew-resize rounded-r"
                />

                {/* Clip info */}
                {widthPixels > 40 && (
                  <div className="absolute inset-1 flex flex-col justify-center items-center overflow-hidden pointer-events-none">
                    <p className="text-xs font-semibold text-foreground truncate">
                      Clip {clip.order + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(clip.endTime - clip.startTime)}
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Time markers */}
          <div className="absolute bottom-0 left-0 right-0 flex border-t border-border/50 h-6">
            {Array.from({
              length: Math.floor(duration / 10) + 1,
            }).map((_, i) => {
              const time = i * 10
              const pixels = timeToPixels(time, PIXELS_PER_SECOND)
              return (
                <div
                  key={i}
                  className="absolute text-[10px] text-muted-foreground"
                  style={{
                    left: `${pixels}px`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {formatTime(time)}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {clips.length > 0 && (
        <p className="text-xs text-muted-foreground px-2">
          {clips.length} clip{clips.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
