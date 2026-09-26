'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
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
const SNAP_INTERVAL = 0.1

function snapTimeToFrame(time: number): number {
  return Number((Math.round(time / SNAP_INTERVAL) * SNAP_INTERVAL).toFixed(3))
}

function TimelineComponent({
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
  const trackRef = useRef<HTMLDivElement>(null)
  const translateXRef = useRef(0)
  const containerWidthRef = useRef(0)
  const clipDragRef = useRef<{
    clipId: string
    startTime: number
    endTime: number
    startPointerX: number
  } | null>(null)
  const [scale, setScale] = useState(PIXELS_PER_SECOND)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedHandle, setDraggedHandle] = useState<{
    clipId: string
    side: 'start' | 'end'
  } | null>(null)

  const totalWidth = timeToPixels(duration, scale)

  const visibleClips = useMemo(() => {
    const containerWidth = containerWidthRef.current || 0
    const left = translateXRef.current
    const right = left + containerWidth

    if (containerWidth === 0) return clips

    return clips.filter((clip) => {
      const start = timeToPixels(clip.startTime, scale)
      const end = timeToPixels(clip.endTime, scale)
      return end >= left - 80 && start <= right + 80
    })
  }, [clips, scale])

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedHandle) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left + translateXRef.current
    const time = snapTimeToFrame(pixelsToTime(x, scale))
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

  const handleClipDragStart = (e: React.PointerEvent<HTMLDivElement>, clip: VideoClip) => {
    if (draggedHandle) return

    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    clipDragRef.current = {
      clipId: clip.id,
      startTime: clip.startTime,
      endTime: clip.endTime,
      startPointerX: e.clientX,
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !draggedHandle) return

      const container = containerRef.current
      const track = trackRef.current
      if (!container || !track || !draggedHandle) return

      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left + translateXRef.current
      const time = snapTimeToFrame(Math.max(0, Math.min(pixelsToTime(x, scale), duration)))

      const dragClip = clipDragRef.current
      if (dragClip) {
        const clipObject = clips.find(c => c.id === dragClip.clipId)
        if (!clipObject) return

        const deltaTime = (e.clientX - dragClip.startPointerX) / scale
        let nextStart = dragClip.startTime + deltaTime
        let nextEnd = dragClip.endTime + deltaTime

        const sorted = [...clips].sort((a, b) => a.order - b.order)
        const idx = sorted.findIndex((c) => c.id === clipObject.id)
        const prevClip = sorted[idx - 1]
        const nextClip = sorted[idx + 1]

        const minStart = prevClip ? prevClip.endTime : 0
        const maxEnd = nextClip ? nextClip.startTime : duration

        if (nextStart - nextEnd === 0) return

        const clipLength = clipObject.endTime - clipObject.startTime
        nextStart = Math.max(minStart, Math.min(nextStart, maxEnd - clipLength))
        nextEnd = nextStart + clipLength

        onClipStartChange?.(clipObject.id, snapTimeToFrame(nextStart))
        onClipEndChange?.(clipObject.id, snapTimeToFrame(nextEnd))
        return
      }

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
      clipDragRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, draggedHandle, clips, duration, onClipStartChange, onClipEndChange, scale])

  useEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track) return

    containerWidthRef.current = container.clientWidth

    const resizeObserver = new ResizeObserver(() => {
      containerWidthRef.current = container.clientWidth
      // trigger immediate scroll update
      const cw = containerWidthRef.current
      const playheadPx = currentTime * scale
      const maxTransform = Math.max(0, totalWidth - cw)
      const desired = Math.min(maxTransform, Math.max(0, playheadPx - cw * 0.45))
      if (Math.abs(desired - translateXRef.current) > 0.5) {
        translateXRef.current = desired
        track.style.transform = `translateX(-${desired}px)`
      }
    })

    resizeObserver.observe(container)

    const cw = containerWidthRef.current || container.clientWidth
    const playheadPx = currentTime * scale
    const maxTransform = Math.max(0, totalWidth - cw)
    const desired = Math.min(maxTransform, Math.max(0, playheadPx - cw * 0.45))
    if (Math.abs(desired - translateXRef.current) > 0.5) {
      translateXRef.current = desired
      track.style.transform = `translateX(-${desired}px)`
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [currentTime, scale, totalWidth])

  const handleZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setScale((prev) => Math.max(10, Math.min(300, prev * factor)))
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-[#dce5dc] bg-[#f8fbf6] p-3 shadow-sm">
      <div className="flex justify-between items-center px-2">
        <span className="text-xs font-semibold text-[#526159]">{formatTime(currentTime)}</span>
        <span className="text-xs font-semibold text-[#526159]">{formatTime(duration)}</span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-[#dce5dc] bg-white shadow-inner">
        {/* Timeline track */}
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          onWheel={handleZoom}
          className="relative h-40 cursor-pointer overflow-x-auto overflow-y-hidden pr-1"
          style={{ width: '100%', scrollBehavior: 'smooth' }}
        >
          <div
            ref={trackRef}
            className="relative h-full"
            style={{
              width: `${totalWidth}px`,
              transform: 'translateX(0px)',
              transition: 'transform 0.1s ease-out',
            }}
          >
            {/* Playback cursor */}
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-30 w-0.5 bg-[#eab308]"
              style={{
                left: `${timeToPixels(currentTime, scale)}px`,
              }}
            />

          {/* Clips visualization */}
          {visibleClips.map((clip) => {
            const startPixels = timeToPixels(clip.startTime, scale)
            const endPixels = timeToPixels(clip.endTime, scale)
            const widthPixels = endPixels - startPixels
            const isSelected = selectedClipId === clip.id

            return (
              <div
                key={clip.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onClipSelect?.(clip.id)
                }}
                onPointerDown={(e) => handleClipDragStart(e, clip)}
                className={`absolute top-4 h-20 rounded-2xl border-2 transition-all duration-200 ease-in-out shadow-sm ${
                  isSelected
                    ? 'border-[#15803d] bg-[#dcf3df] ring-2 ring-[#15803d]/20'
                    : 'border-[#a9c8ad] bg-[#edf7ef] hover:border-[#15803d] hover:bg-[#e4f4e7]'
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
          <div className="absolute bottom-0 left-0 right-0 flex h-6 border-t border-[#dce5dc] bg-[#eef4ec]">
            {Array.from({
              length: Math.floor(duration / 10) + 1,
            }).map((_, i) => {
              const time = i * 10
              const pixels = timeToPixels(time, scale)
              return (
                <div
                  key={i}
                  className="absolute text-[10px] font-medium text-[#526159]"
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
      </div>

      {clips.length > 0 && (
        <p className="text-xs text-muted-foreground px-2">
          {clips.length} clip{clips.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}

export const Timeline = React.memo(TimelineComponent)

