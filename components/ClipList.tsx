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
      <div className="text-center py-8 text-muted-foreground">
        <p>No clips selected yet</p>
        <p className="text-xs mt-1">Select clips on the timeline to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Selected Clips ({clips.length})</h3>
        <div className="text-sm text-muted-foreground">
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
            className={`p-3 rounded-lg border-2 transition-all cursor-move ${
              selectedClipId === clip.id
                ? 'border-primary bg-primary/5'
                : draggedId === clip.id
                  ? 'border-primary/50 opacity-50'
                  : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onClipSelect?.(clip.id)}
          >
            <div className="flex items-start gap-3">
              <div className="text-muted-foreground mt-1">
                <GripVertical className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                {clip.thumbnailUrl ? (
                  <img
                    src={clip.thumbnailUrl}
                    alt={`Clip ${index + 1} thumbnail`}
                    className="w-16 h-10 rounded border border-border object-cover"
                  />
                ) : (
                  <div className="w-16 h-10 rounded border border-border bg-slate-900/20 flex items-center justify-center text-[10px] text-muted-foreground">
                    No thumbnail
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}s
                </div>
              </div>

              {editingId === clip.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={editValues.start}
                      onChange={(e) =>
                        setEditValues(v => ({ ...v, start: e.target.value }))
                      }
                      placeholder="00:00"
                      className="h-8 text-sm"
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
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(clip)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
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
                  className="flex-1 cursor-pointer hover:opacity-70"
                  onClick={() => handleEditStart(clip)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Clip {index + 1}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatTime(getClipDuration(clip))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
