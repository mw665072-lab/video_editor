'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Scissors,
  Plus,
  X,
  GripVertical,
  Play,
  Pause,
  Download,
  Film,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { trimSegment, concatSegments, loadFFmpegCut } from '@/lib/ffmpeg-cut'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CutSegmentItem {
  id: string
  file: File
  objectUrl: string
  duration: number       // full source duration (seconds)
  startTime: number      // trim start (seconds into the source)
  trimDuration: number   // how many seconds to take
  label: string
  thumbnail: string      // data-URL from canvas; empty string if failed
  status: 'idle' | 'processing' | 'done' | 'error'
  error?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEG_GRADIENTS = [
  'from-green-600 to-emerald-600',
  'from-cyan-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600',
  'from-green-500 to-emerald-600',
  'from-green-600 to-emerald-600',
  'from-green-600 to-emerald-600',
  'from-yellow-500 to-orange-500',
]

const SEG_SOLID = [
  '#15803d', '#0891b2', '#ea580c', '#e11d48',
  '#16a34a', '#0f766e', '#65a30d', '#d97706',
]

const QUICK_DURATIONS = [1, 2, 3, 5, 10, 15, 30, 60]

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function fmtTimecode(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00.0'
  const m   = Math.floor(s / 60)
  const sec = (s % 60).toFixed(1)
  return `${m}:${sec.padStart(4, '0')}`
}

function uid(): string {
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Seek a hidden <video> element to a frame and capture it onto a canvas.
 * Returns a data-URL (JPEG) or '' on failure.
 */
async function extractThumbnail(objectUrl: string): Promise<string> {
  return new Promise<string>(resolve => {
    const video = document.createElement('video')
    video.muted       = true
    video.playsInline = true
    video.preload     = 'metadata'

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, video.duration * 0.1)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = 192
        canvas.height = 108
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, 192, 108)
          resolve(canvas.toDataURL('image/jpeg', 0.75))
        } else {
          resolve('')
        }
      } catch {
        resolve('')
      }
    }
    video.onerror = () => resolve('')
    video.src = objectUrl
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ─── SegmentCard ──────────────────────────────────────────────────────────────

interface SegmentCardProps {
  seg: CutSegmentItem
  idx: number
  isSelected: boolean
  isDragOver: boolean
  onSelect: () => void
  onRemove: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

function SegmentCard({
  seg, idx, isSelected, isDragOver,
  onSelect, onRemove, onDragStart, onDragOver, onDrop, onDragEnd,
}: SegmentCardProps) {
  const grad  = SEG_GRADIENTS[idx % SEG_GRADIENTS.length]
  const solid = SEG_SOLID[idx % SEG_SOLID.length]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={[
        'relative rounded-xl border cursor-pointer select-none overflow-hidden group transition-all duration-150',
        isSelected
          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
          : 'border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800/80',
        isDragOver ? 'border-cyan-400 scale-[0.97] opacity-60' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        {/* Drag handle */}
        <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0 cursor-grab active:cursor-grabbing group-hover:text-slate-400 transition-colors" />

        {/* Thumbnail */}
        <div className="relative w-[72px] h-10 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 shadow-md">
          {seg.thumbnail ? (
            <img src={seg.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-4 h-4 text-slate-600" />
            </div>
          )}
          {/* Colour strip */}
          <div className={`absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r ${grad}`} />
          {/* Index badge */}
          <div
            className="absolute top-1 left-1 w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: solid }}
          >
            {idx + 1}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{seg.label}</p>
          <p className="text-[10px] text-slate-500 truncate leading-tight">{seg.file.name}</p>
          <p className="text-[10px] font-mono text-emerald-300 mt-0.5 leading-tight">
            {fmtTimecode(seg.startTime)}
            {' + '}
            <span className="text-cyan-300">{seg.trimDuration.toFixed(1)}s</span>
          </p>
        </div>

        {/* Status / Remove */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {seg.status === 'processing' && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
          {seg.status === 'done'       && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
          {seg.status === 'error'      && <AlertCircle  className="w-3.5 h-3.5 text-red-400" />}
          <button
            onClick={e => { e.stopPropagation(); onRemove() }}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Processing overlay */}
      {seg.status === 'processing' && (
        <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-[1px] flex items-center justify-center rounded-xl pointer-events-none">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      )}
    </div>
  )
}

// ─── EmptyDropZone ────────────────────────────────────────────────────────────

interface EmptyDropZoneProps {
  isDraggingOver: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onClickAdd: () => void
}

function EmptyDropZone({ isDraggingOver, onDrop, onDragOver, onDragLeave, onClickAdd }: EmptyDropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClickAdd}
      className={[
        'flex flex-col items-center justify-center min-h-[55vh] rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer',
        isDraggingOver
          ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
          : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60',
      ].join(' ')}
    >
      <div className="text-center space-y-5 px-8 pointer-events-none">
        {/* Icon */}
        <div className={[
          'w-20 h-20 rounded-2xl mx-auto flex items-center justify-center transition-all',
          isDraggingOver
            ? 'bg-emerald-500/25 border-2 border-emerald-400'
            : 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/15 border border-slate-700',
        ].join(' ')}>
          <Scissors className={`w-9 h-9 transition-all ${isDraggingOver ? 'text-emerald-300 scale-110' : 'text-emerald-400'}`} />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-2">Multi-Video Cut Tool</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Drop multiple video files here, or click to browse.<br />
            Set a custom duration from each clip and export as one seamless video.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          <Button
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold gap-2 hover:opacity-90 px-6"
            onClick={e => { e.stopPropagation(); onClickAdd() }}
          >
            <Plus className="w-4 h-4" /> Add Videos
          </Button>
          <p className="text-slate-600 text-xs">MP4 · MOV · WebM · AVI · MKV supported</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CutTool() {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [segments,       setSegments]       = useState<CutSegmentItem[]>([])
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [isPlaying,      setIsPlaying]      = useState(false)
  const [currentTime,    setCurrentTime]    = useState(0)

  // ── Export state ────────────────────────────────────────────────────────────
  const [isExporting,    setIsExporting]    = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStep,     setExportStep]     = useState('')
  const [quality,        setQuality]        = useState<'high' | 'medium' | 'low'>('medium')

  // ── UI state ────────────────────────────────────────────────────────────────
  const [dragOverId,        setDragOverId]        = useState<string | null>(null)
  const [isDropZoneDragging, setIsDropZoneDragging] = useState(false)
  const [ffmpegReady,       setFfmpegReady]       = useState(false)

  // ── Refs ────────────────────────────────────────────────────────────────────
  const videoRef    = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragItemId  = useRef<string | null>(null)

  const selectedSegment = segments.find(s => s.id === selectedId) ?? null
  const totalDuration   = segments.reduce((a, s) => a + s.trimDuration, 0)

  // ── Pre-load FFmpeg engine in background ─────────────────────────────────
  useEffect(() => {
    loadFFmpegCut()
      .then(() => setFfmpegReady(true))
      .catch((err: unknown) => console.error('[CutTool] FFmpeg init failed:', err))
  }, [])

  // ── Sync preview player when selected segment changes ────────────────────
  useEffect(() => {
    if (!videoRef.current || !selectedSegment) return
    videoRef.current.src         = selectedSegment.objectUrl
    videoRef.current.currentTime = selectedSegment.startTime
    setCurrentTime(selectedSegment.startTime)
    setIsPlaying(false)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Playback ────────────────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !selectedSegment) return
    const t = videoRef.current.currentTime
    setCurrentTime(t)
    // Auto-stop at trim end
    if (t >= selectedSegment.startTime + selectedSegment.trimDuration) {
      videoRef.current.pause()
      videoRef.current.currentTime = selectedSegment.startTime
      setIsPlaying(false)
    }
  }, [selectedSegment])

  const togglePlay = useCallback(() => {
    if (!videoRef.current || !selectedSegment) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      const ct = videoRef.current.currentTime
      if (ct < selectedSegment.startTime || ct >= selectedSegment.startTime + selectedSegment.trimDuration) {
        videoRef.current.currentTime = selectedSegment.startTime
      }
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying, selectedSegment])

  // ── Add videos ──────────────────────────────────────────────────────────────
  const addVideos = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const VALID_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/ogg', 'video/mkv']
    const VALID_EXT   = /\.(mp4|webm|mov|avi|mkv|ogv|m4v)$/i
    const videoFiles  = arr.filter(f => VALID_TYPES.includes(f.type) || VALID_EXT.test(f.name))

    if (videoFiles.length === 0) { toast.error('No valid video files detected'); return }

    const toastId = toast.loading(`Loading ${videoFiles.length} video${videoFiles.length > 1 ? 's' : ''}…`)

    const newItems: CutSegmentItem[] = []
    for (let i = 0; i < videoFiles.length; i++) {
      const file      = videoFiles[i]
      const objectUrl = URL.createObjectURL(file)
      const id        = uid()
      const labelNum  = segments.length + newItems.length + 1

      // Detect duration
      const duration = await new Promise<number>(resolve => {
        const v = document.createElement('video')
        v.preload       = 'metadata'
        v.onloadedmetadata = () => resolve(isFinite(v.duration) ? v.duration : 0)
        v.onerror          = () => resolve(0)
        v.src = objectUrl
      })

      const thumbnail = await extractThumbnail(objectUrl)

      newItems.push({
        id, file, objectUrl, duration,
        startTime:    0,
        trimDuration: Math.min(10, duration > 0 ? duration : 10),
        label:        `Video ${labelNum}`,
        thumbnail,
        status:       'idle',
      })
    }

    toast.dismiss(toastId)
    toast.success(`Added ${newItems.length} video${newItems.length > 1 ? 's' : ''}`)

    setSegments(prev => [...prev, ...newItems])
    setSelectedId(prev => prev ?? (newItems.length > 0 ? newItems[0].id : null))
  }, [segments.length])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addVideos(e.target.files)
    e.target.value = ''
  }, [addVideos])

  // ── Remove segment ──────────────────────────────────────────────────────────
  const removeSegment = useCallback((id: string) => {
    setSegments(prev => {
      const seg  = prev.find(s => s.id === id)
      if (seg) URL.revokeObjectURL(seg.objectUrl)
      return prev
        .filter(s => s.id !== id)
        .map((s, i) => ({ ...s, label: `Video ${i + 1}` }))
    })
    setSelectedId(prev => prev === id ? null : prev)
  }, [])

  // ── Update a field on one segment ────────────────────────────────────────────
  const updateSegment = useCallback((id: string, patch: Partial<CutSegmentItem>) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [])

  // ── Trim: Start Time ─────────────────────────────────────────────────────────
  const handleSetStart = useCallback((val: number) => {
    if (!selectedSegment) return
    const clamped    = Math.max(0, Math.min(selectedSegment.duration - 0.1, val))
    const remaining  = selectedSegment.duration - clamped
    updateSegment(selectedSegment.id, {
      startTime:    clamped,
      trimDuration: Math.min(selectedSegment.trimDuration, remaining),
    })
    if (videoRef.current) {
      videoRef.current.currentTime = clamped
      setCurrentTime(clamped)
    }
  }, [selectedSegment, updateSegment])

  // ── Trim: Duration ───────────────────────────────────────────────────────────
  const handleSetDuration = useCallback((val: number) => {
    if (!selectedSegment) return
    const maxDur = selectedSegment.duration - selectedSegment.startTime
    updateSegment(selectedSegment.id, {
      trimDuration: Math.max(0.1, Math.min(maxDur, val)),
    })
  }, [selectedSegment, updateSegment])

  // ── Snap start to current playhead ──────────────────────────────────────────
  const snapStartToPlayhead = useCallback(() => {
    if (!videoRef.current || !selectedSegment) return
    handleSetStart(videoRef.current.currentTime)
    toast.success('Start time snapped to playhead')
  }, [selectedSegment, handleSetStart])

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((id: string) => { dragItemId.current = id }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (dragItemId.current !== targetId) setDragOverId(targetId)
  }, [])

  const handleDrop = useCallback((targetId: string) => {
    const fromId = dragItemId.current
    if (!fromId || fromId === targetId) { setDragOverId(null); return }
    setSegments(prev => {
      const fromIdx = prev.findIndex(s => s.id === fromId)
      const toIdx   = prev.findIndex(s => s.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next.map((s, i) => ({ ...s, label: `Video ${i + 1}` }))
    })
    setDragOverId(null)
    dragItemId.current = null
  }, [])

  // ── Global drop-zone for adding more videos ──────────────────────────────────
  const handleZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDropZoneDragging(false)
    if (e.dataTransfer.files.length) addVideos(e.dataTransfer.files)
  }, [addVideos])

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (segments.length === 0) { toast.error('Add at least one video segment'); return }
    if (!ffmpegReady)          { toast.error('FFmpeg engine is still loading, please wait'); return }

    setIsExporting(true)
    setExportProgress(0)
    setExportStep('Initialising FFmpeg…')
    setSegments(prev => prev.map(s => ({ ...s, status: 'idle' as const })))

    try {
      const trimmedBlobs: Blob[] = []
      const segShare = 80 / segments.length         // 80 % of progress bar for trimming

      for (let i = 0; i < segments.length; i++) {
        const seg      = segments[i]
        const base     = i * segShare

        setExportStep(`Trimming ${seg.label}… (${i + 1} / ${segments.length})`)
        updateSegment(seg.id, { status: 'processing' })

        const width = videoRef.current?.videoWidth || 1280
        const height = videoRef.current?.videoHeight || 720
        const fps = 30
        const blob = await trimSegment(
          seg.file,
          seg.startTime,
          seg.trimDuration,
          i,
          width,
          height,
          fps,
          pct => setExportProgress(Math.round(base + (pct / 100) * segShare)),
        )
        trimmedBlobs.push(blob)
        updateSegment(seg.id, { status: 'done' })
      }

      let finalBlob: Blob
      if (trimmedBlobs.length === 1) {
        setExportStep('Finalising output…')
        setExportProgress(90)
        finalBlob = trimmedBlobs[0]
      } else {
        setExportStep(`Merging ${trimmedBlobs.length} segments…`)
        setExportProgress(82)
        finalBlob = await concatSegments(trimmedBlobs, pct => {
          setExportProgress(82 + Math.round((pct / 100) * 15))
        })
      }

      setExportProgress(100)
      setExportStep('Done! Downloading…')

      triggerDownload(finalBlob, `cutpro-cut-${Date.now()}.mp4`)
      toast.success('Export complete — file downloading!')
      setSegments(prev => prev.map(s => ({ ...s, status: 'idle' as const })))

    } catch (err) {
      console.error('[CutTool] Export error:', err)
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setSegments(prev => prev.map(s => ({ ...s, status: 'idle' as const })))
    } finally {
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
        setExportStep('')
      }, 1500)
    }
  }, [segments, ffmpegReady, updateSegment])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* ─── Empty state: full-width drop zone ─── */}
      {segments.length === 0 ? (
        <EmptyDropZone
          isDraggingOver={isDropZoneDragging}
          onDrop={handleZoneDrop}
          onDragOver={e => { e.preventDefault(); setIsDropZoneDragging(true) }}
          onDragLeave={() => setIsDropZoneDragging(false)}
          onClickAdd={() => fileInputRef.current?.click()}
        />
      ) : (

        /* ─── Main 3-column editor layout ─── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ══ LEFT — Segment list ══ */}
          <div className="lg:col-span-3 space-y-2">

            {/* List header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                Segments — {segments.length}
              </span>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-6 px-2 text-[11px] bg-emerald-600/80 hover:bg-emerald-600 text-white gap-1 rounded-lg"
              >
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>

            {/* Cards */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5 scrollbar-thin">
              {segments.map((seg, idx) => (
                <SegmentCard
                  key={seg.id}
                  seg={seg}
                  idx={idx}
                  isSelected={seg.id === selectedId}
                  isDragOver={dragOverId === seg.id}
                  onSelect={() => setSelectedId(seg.id)}
                  onRemove={() => removeSegment(seg.id)}
                  onDragStart={() => handleDragStart(seg.id)}
                  onDragOver={e => handleDragOver(e, seg.id)}
                  onDrop={() => handleDrop(seg.id)}
                  onDragEnd={() => setDragOverId(null)}
                />
              ))}
            </div>

            {/* Drop-more zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDropZoneDragging(true) }}
              onDragLeave={() => setIsDropZoneDragging(false)}
              onDrop={handleZoneDrop}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'h-10 rounded-xl border border-dashed flex items-center justify-center text-xs transition-all cursor-pointer gap-1',
                isDropZoneDragging
                  ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400',
              ].join(' ')}
            >
              <Plus className="w-3 h-3" /> Drop or click to add more videos
            </div>
          </div>

          {/* ══ CENTER — Preview + Trim controls ══ */}
          <div className="lg:col-span-6 space-y-3">
            {selectedSegment ? (
              <>
                {/* ── Video player ── */}
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    preload="auto"
                  />

                  {/* Segment badge */}
                  <div
                    className="absolute top-3 left-3 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow"
                    style={{ background: SEG_SOLID[segments.findIndex(s => s.id === selectedId) % SEG_SOLID.length] }}
                  >
                    {selectedSegment.label}
                  </div>

                  {/* Player overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-10">

                    {/* Seek bar */}
                    <div
                      className="relative h-1.5 rounded-full mb-3 cursor-pointer bg-white/15"
                      onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const pct  = (e.clientX - rect.left) / rect.width
                        const t    = pct * (selectedSegment.duration || 1)
                        if (videoRef.current) videoRef.current.currentTime = t
                        setCurrentTime(t)
                      }}
                    >
                      {/* Trim region */}
                      <div
                        className="absolute top-0 bottom-0 bg-emerald-400/30 border-x border-emerald-400/60"
                        style={{
                          left:  `${selectedSegment.duration > 0 ? (selectedSegment.startTime / selectedSegment.duration) * 100 : 0}%`,
                          width: `${selectedSegment.duration > 0 ? (selectedSegment.trimDuration / selectedSegment.duration) * 100 : 0}%`,
                        }}
                      />
                      {/* Trim start / end markers */}
                      <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-emerald-400 rounded-full"
                        style={{ left: `${selectedSegment.duration > 0 ? (selectedSegment.startTime / selectedSegment.duration) * 100 : 0}%` }}
                      />
                      <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-cyan-400 rounded-full"
                        style={{ left: `${selectedSegment.duration > 0 ? ((selectedSegment.startTime + selectedSegment.trimDuration) / selectedSegment.duration) * 100 : 0}%` }}
                      />
                      {/* Progress fill */}
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                        style={{ width: `${selectedSegment.duration > 0 ? (currentTime / selectedSegment.duration) * 100 : 0}%` }}
                      />
                      {/* Playhead dot */}
                      <div
                        className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                        style={{
                          left:      `${selectedSegment.duration > 0 ? (currentTime / selectedSegment.duration) * 100 : 0}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center hover:bg-emerald-500 transition-colors flex-shrink-0"
                      >
                        {isPlaying
                          ? <Pause className="w-3.5 h-3.5 text-white" />
                          : <Play  className="w-3.5 h-3.5 text-white ml-0.5" />}
                      </button>

                      <span className="text-xs text-white/70 tabular-nums">
                        {fmtTimecode(currentTime)} / {fmtTimecode(selectedSegment.duration)}
                      </span>

                      <span className="ml-auto text-[10px] font-mono">
                        <span className="text-slate-400">Trim: </span>
                        <span className="text-white">{fmtTimecode(selectedSegment.startTime)}</span>
                        <span className="text-slate-500"> → </span>
                        <span className="text-cyan-300">{fmtTimecode(selectedSegment.startTime + selectedSegment.trimDuration)}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-emerald-300">{selectedSegment.trimDuration.toFixed(1)}s</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Trim controls card ── */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-5">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Trim Controls</span>
                    <span className="text-xs text-slate-500">· {selectedSegment.label}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={snapStartToPlayhead}
                      className="ml-auto h-6 text-[10px] border-slate-700 text-slate-300 hover:text-white px-2 gap-1"
                    >
                      📍 Snap to Playhead
                    </Button>
                  </div>

                  {/* ─ Start Time ─ */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-slate-400">Start Time</Label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetStart(selectedSegment.startTime - 0.5)}
                          className="w-5 h-5 rounded text-slate-500 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={selectedSegment.startTime.toFixed(1)}
                          min={0}
                          max={Math.max(0, selectedSegment.duration - 0.1)}
                          step={0.1}
                          onChange={e => handleSetStart(parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-800 border border-slate-700 rounded-lg text-xs text-center text-white py-1 px-1 focus:border-emerald-500 outline-none"
                        />
                        <span className="text-slate-500 text-[10px] w-3">s</span>
                        <button
                          onClick={() => handleSetStart(selectedSegment.startTime + 0.5)}
                          className="w-5 h-5 rounded text-slate-500 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <span className="text-slate-600 text-[10px] ml-2 tabular-nums">
                          max {selectedSegment.duration.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                    <Slider
                      value={[selectedSegment.startTime]}
                      min={0}
                      max={Math.max(0.1, selectedSegment.duration - 0.1)}
                      step={0.1}
                      onValueChange={([v]) => handleSetStart(v)}
                    />
                  </div>

                  {/* ─ Duration ─ */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-slate-400">Duration to Cut</Label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetDuration(selectedSegment.trimDuration - 0.5)}
                          className="w-5 h-5 rounded text-slate-500 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={selectedSegment.trimDuration.toFixed(1)}
                          min={0.1}
                          max={selectedSegment.duration - selectedSegment.startTime}
                          step={0.1}
                          onChange={e => handleSetDuration(parseFloat(e.target.value) || 0.1)}
                          className="w-16 bg-slate-800 border border-slate-700 rounded-lg text-xs text-center text-white py-1 px-1 focus:border-cyan-500 outline-none"
                        />
                        <span className="text-slate-500 text-[10px] w-3">s</span>
                        <button
                          onClick={() => handleSetDuration(selectedSegment.trimDuration + 0.5)}
                          className="w-5 h-5 rounded text-slate-500 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <span className="text-slate-600 text-[10px] ml-2 tabular-nums">
                          max {(selectedSegment.duration - selectedSegment.startTime).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                    <Slider
                      value={[selectedSegment.trimDuration]}
                      min={0.1}
                      max={Math.max(0.1, selectedSegment.duration - selectedSegment.startTime)}
                      step={0.1}
                      onValueChange={([v]) => handleSetDuration(v)}
                    />
                  </div>

                  {/* ─ Quick presets ─ */}
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">
                      Quick Duration
                    </Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {QUICK_DURATIONS.map(d => {
                        const maxDur   = selectedSegment.duration - selectedSegment.startTime
                        const isActive = Math.abs(selectedSegment.trimDuration - d) < 0.05
                        const disabled = d > maxDur
                        return (
                          <button
                            key={d}
                            disabled={disabled}
                            onClick={() => handleSetDuration(d)}
                            className={[
                              'h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all',
                              isActive  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                              : disabled ? 'border-slate-800 bg-slate-900/50 text-slate-700 cursor-not-allowed'
                              :            'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-white',
                            ].join(' ')}
                          >
                            {d >= 60 ? `${d / 60}m` : `${d}s`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="aspect-video bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600 gap-3">
                <Film className="w-12 h-12 opacity-40" />
                <p className="text-sm">Select a segment from the left panel to preview &amp; trim</p>
              </div>
            )}
          </div>

          {/* ══ RIGHT — Summary + Timeline + Export ══ */}
          <div className="lg:col-span-3 space-y-3">

            {/* ── Output summary ── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">Output Summary</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-white tabular-nums">{segments.length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Clips</p>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-cyan-400 tabular-nums">{totalDuration.toFixed(1)}s</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Total</p>
                </div>
              </div>

              {/* Visual timeline */}
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Timeline</Label>
                {totalDuration > 0 ? (
                  <>
                    <div className="flex rounded-xl overflow-hidden h-7 gap-0.5">
                      {segments.map((seg, idx) => (
                        <div
                          key={seg.id}
                          onClick={() => setSelectedId(seg.id)}
                          title={`${seg.label}: ${seg.trimDuration.toFixed(1)}s`}
                          className={[
                            'relative flex-shrink-0 cursor-pointer transition-all bg-gradient-to-r',
                            SEG_GRADIENTS[idx % SEG_GRADIENTS.length],
                            seg.id === selectedId
                              ? 'ring-2 ring-white ring-inset opacity-100'
                              : 'opacity-70 hover:opacity-90',
                          ].join(' ')}
                          style={{ flex: seg.trimDuration / totalDuration }}
                        >
                          {(seg.trimDuration / totalDuration) > 0.12 && (
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold pointer-events-none">
                              {seg.trimDuration.toFixed(0)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-600 mt-1 tabular-nums">
                      <span>0s</span>
                      <span>{totalDuration.toFixed(1)}s</span>
                    </div>
                  </>
                ) : (
                  <div className="h-7 bg-slate-800/60 rounded-xl" />
                )}
              </div>
            </div>

            {/* ── Output order ── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
              <Label className="text-[10px] text-slate-500 uppercase tracking-widest block">Output Order</Label>
              <div className="space-y-1">
                {segments.map((seg, idx) => (
                  <button
                    key={seg.id}
                    onClick={() => setSelectedId(seg.id)}
                    className={[
                      'w-full flex items-center gap-2 text-left text-xs rounded-lg px-2 py-1.5 transition-all',
                      seg.id === selectedId
                        ? 'bg-emerald-500/10 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
                    ].join(' ')}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: SEG_SOLID[idx % SEG_SOLID.length] }}
                    />
                    <span className="flex-1 truncate">{seg.label}</span>
                    <span className="tabular-nums text-slate-600 font-mono text-[10px]">
                      {seg.trimDuration.toFixed(1)}s
                    </span>
                    {seg.status === 'processing' && <Loader2    className="w-3 h-3 text-emerald-400 animate-spin" />}
                    {seg.status === 'done'       && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                    {seg.status === 'error'      && <AlertCircle  className="w-3 h-3 text-red-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Export panel ── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Export</span>
              </div>

              {/* Quality selector */}
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Quality</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['high', 'medium', 'low'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={[
                        'py-1.5 rounded-lg text-[11px] font-semibold border transition-all capitalize',
                        quality === q
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200',
                      ].join(' ')}
                    >
                      {q === 'high' ? '🔥 High' : q === 'medium' ? '⚡ Med' : '💾 Low'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress bar */}
              {isExporting && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate">{exportStep}</span>
                    <span className="text-emerald-400 font-bold ml-2 tabular-nums">{exportProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* FFmpeg loading notice */}
              {!ffmpegReady && !isExporting && (
                <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  <span>Loading FFmpeg engine in background…</span>
                </div>
              )}

              {/* Export button */}
              <Button
                onClick={handleExport}
                disabled={isExporting || segments.length === 0 || !ffmpegReady}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold hover:opacity-90 disabled:opacity-40 transition-opacity gap-2"
              >
                {isExporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><Download className="w-4 h-4" /> Export &amp; Download</>
                }
              </Button>

              <div className="text-center space-y-0.5">
                <p className="text-[10px] text-slate-600">100% client-side · no upload required</p>
                <p className="text-[10px] text-slate-700">Powered by FFmpeg.wasm</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
