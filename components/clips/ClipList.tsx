'use client'

import { useState } from 'react'
import { VideoClip } from '@/lib/types'
import { formatTime, getClipDuration, calculateTotalDuration } from '@/lib/videoUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

interface ClipListProps {
  clips: VideoClip[]
  selectedClipId?: string | null
  onClipSelect?: (clipId: string) => void
  onClipRemove?: (clipId: string) => void
  onClipReorder?: (clips: VideoClip[]) => void
  onClipUpdate?: (clip: VideoClip) => void
}

export function ClipList({
  clips,
  selectedClipId,
  onClipSelect,
  onClipRemove,
  onClipReorder,
  onClipUpdate,
}: ClipListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })

  const totalDuration = calculateTotalDuration(clips)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, clipId: string) => {
    setDraggedId(clipId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const draggedIndex = clips.findIndex(c => c.id === draggedId)
    const targetIndex = clips.findIndex(c => c.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newClips = [...clips]
    const [draggedClip] = newClips.splice(draggedIndex, 1)
    newClips.splice(targetIndex, 0, draggedClip)

    onClipReorder?.(newClips)
    setDraggedId(null)
    toast.success('Clips reordered')
  }

  const handleEditStart = (clip: VideoClip) => {
    setEditingId(clip.id)
    setEditValues({
      start: formatTime(clip.startTime),
      end: formatTime(clip.endTime),
    })
  }

  const handleEditSave = (clip: VideoClip) => {
    try {
      const parseTime = (timeStr: string): number => {
        const parts = timeStr.split(':').map(Number)
        if (parts.length === 2) {
          return parts[0] * 60 + parts[1]
        } else if (parts.length === 3) {
          return parts[0] * 3600 + parts[1] * 60 + parts[2]
        }
        return 0
      }

      const newStart = parseTime(editValues.start)
      const newEnd = parseTime(editValues.end)

      if (newStart >= newEnd) {
        toast.error('Start time must be before end time')
        return
      }

      onClipUpdate?.({
        ...clip,
        startTime: newStart,
        endTime: newEnd,
      })

      setEditingId(null)
      toast.success('Clip updated')
    } catch (error) {
      toast.error('Invalid time format')
    }
  }

  if (clips.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#c8d8ca] bg-[#f8fbf6] p-6 text-center">
        <p className="text-lg font-bold text-[#18231b]">No clips selected yet</p>
        <p className="mt-2 max-w-[300px] text-sm text-[#5e6d63]">
          Select clips on the timeline to get started or use the Add Clip button.
        </p>
        <p className="mt-3 text-xs text-[#7a887f]">
          This area will show your selected clips, durations, and reorder controls.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#dce5dc] bg-[#f8fbf6] p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#18231b]">Selected Clips ({clips.length})</h3>
        <div className="text-sm text-[#667069]">
          Total: {formatTime(totalDuration)}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {clips.map((clip, index) => (
          <div
            key={clip.id}
            draggable
            onDragStart={(e) => handleDragStart(e, clip.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, clip.id)}
            className={`p-3 rounded-xl border transition-all cursor-move min-h-[104px] ${
              selectedClipId === clip.id
                ? 'border-[#15803d] bg-[#edf7ef] ring-1 ring-[#15803d]/25'
                : draggedId === clip.id
                  ? 'border-[#86b38e] opacity-70'
                  : 'border-[#dce5dc] bg-white hover:border-[#86b38e]'
            }`}
            onClick={() => onClipSelect?.(clip.id)}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="text-muted-foreground mt-1 shrink-0">
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="min-w-0 w-full">
                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    {clip.thumbnailUrl ? (
                      <img
                        src={clip.thumbnailUrl}
                        alt={`Clip ${index + 1} thumbnail`}
                        className="w-20 h-12 rounded-lg border border-slate-600 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-12 rounded-lg border border-slate-600 bg-slate-900/25 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                        No thumbnail
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-slate-300 truncate">
                        {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}s
                      </p>
                    </div>
                  </div>

                  {editingId === clip.id ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Input
                          value={editValues.start}
                          onChange={(e) =>
                            setEditValues(v => ({ ...v, start: e.target.value }))
                          }
                          placeholder="00:00"
                          className="h-8 text-sm w-[120px] flex-1 min-w-[90px]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(clip)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <span className="text-muted-foreground text-sm mt-1">→</span>
                        <Input
                          value={editValues.end}
                          onChange={(e) =>
                            setEditValues(v => ({ ...v, end: e.target.value }))
                          }
                          placeholder="00:00"
                          className="h-8 text-sm w-[120px] flex-1 min-w-[90px]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(clip)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleEditSave(clip)}
                          className="h-8 text-xs"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:opacity-70 min-w-0"
                      onClick={() => handleEditStart(clip)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate">Clip {index + 1}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatTime(getClipDuration(clip))}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onClipRemove?.(clip.id)
                  toast.success('Clip removed')
                }}
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
