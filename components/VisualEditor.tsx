'use client'

import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import { List } from 'react-window'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useEditorStore,
  Caption,
  VideoFilters,
  VideoTransform,
  defaultFilters,
  defaultTransform,
  Keyframe,
  Segment,
} from '@/store/editorStore'
import { VideoUpload } from '@/components/VideoUpload'
import { toast } from 'sonner'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
  Plus,
  SkipBack,
  SkipForward,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Scissors,
  Layers,
  Film,
  X,
  PlusCircle,
  ChevronUp,
  ChevronDown,
  Repeat,
  Gauge,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  AlignLeft,
  Move,
  Crop,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ExtendedCaption extends Caption {
  fontSize?: number
  color?: string
  fontStyle?: 'normal' | 'bold' | 'italic' | 'shadow'
  bgEnabled?: boolean
  align?: 'left' | 'center' | 'right'
}

// ─── LUT Presets ──────────────────────────────────────────────────────────────
const LUT_PRESETS = [
  { id: 'none', label: 'Original', filters: defaultFilters },
  { id: 'vibrant', label: 'Vibrant', filters: { ...defaultFilters, saturation: 1.4, contrast: 1.1 } },
  { id: 'noir', label: 'Noir', filters: { ...defaultFilters, grayscale: 1, contrast: 1.3 } },
  { id: 'warm', label: 'Warm', filters: { ...defaultFilters, sepia: 30, brightness: 1.05 } },
  { id: 'dramatic', label: 'Dramatic', filters: { ...defaultFilters, contrast: 1.5, brightness: 0.9 } },
  { id: 'faded', label: 'Faded', filters: { ...defaultFilters, brightness: 1.1, contrast: 0.8, saturation: 0.8 } },
]

const EXPORT_FORMATS = [
  { id: 'mp4', label: 'MP4 (H.264)', description: 'Best compatibility', badge: 'HD Pro', badgeColor: '#6366f1' },
  { id: 'webm', label: 'WebM (VP9)', description: 'Best for Web', badge: 'Ultra', badgeColor: '#06b6d4' },
]

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid(): string {
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function extractThumbnail(objectUrl: string, time: number = 1): Promise<string> {
  return new Promise<string>((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(time, video.duration)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 192
        canvas.height = 108
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, 192, 108)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
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

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function buildFilterString(f: VideoFilters): string {
  return [
    `brightness(${f.brightness})`,
    `contrast(${f.contrast})`,
    `saturate(${f.saturation})`,
    `hue-rotate(${f.hue}deg)`,
    `blur(${f.blur}px)`,
    `sepia(${f.sepia / 100})`,
    `grayscale(${f.grayscale})`,
    `invert(${f.invert / 100})`,
  ].join(' ')
}

function interpolateKeyframes<T extends number>(
  keyframes: Keyframe<T>[] | undefined,
  time: number,
  defaultValue: T
): T {
  if (!keyframes || keyframes.length === 0) return defaultValue
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  if (time <= sorted[0].time) return sorted[0].value
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time)
      // Linear interpolation (you can extend with easing functions)
      return (a.value * (1 - t) + b.value * t) as T
    }
  }
  return defaultValue
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function FilterSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  displayValue,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  displayValue: string
  onChange: (v: number[]) => void
}) {
  return (
    <div className="space-y-1 mb-3">
      <div className="flex justify-between items-center">
        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</Label>
        <span className="text-[10px] text-slate-400 tabular-nums font-mono">{displayValue}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={onChange} className="h-1" />
    </div>
  )
}

function ExportModal({
  open,
  onClose,
  onExport,
  isExporting,
  exportProgress,
  exportStep,
}: {
  open: boolean
  onClose: () => void
  onExport: (format: string, quality: string) => void
  isExporting: boolean
  exportProgress: number
  exportStep: string
}) {
  const [format, setFormat] = useState('mp4')
  const [quality, setQuality] = useState('medium')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Export Composition</h2>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-slate-400 text-xs mb-6">Process all clips and merge into final masterpiece.</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                format === f.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
              }`}
            >
              <span
                className="inline-block text-[8px] font-black px-1.5 py-0.5 rounded-sm text-white mb-2 uppercase tracking-tighter"
                style={{ background: f.badgeColor }}
              >
                {f.badge}
              </span>
              <div className="text-xs font-bold text-white">{f.label}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{f.description}</div>
            </button>
          ))}
        </div>

        <div className="space-y-4 mb-8">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Video Quality</Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="high">High (1080p · Optimized)</SelectItem>
                <SelectItem value="medium">Balanced (720p)</SelectItem>
                <SelectItem value="low">Fast Draft (480p)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isExporting && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-[11px] font-bold text-indigo-400">
              <span className="animate-pulse">{exportStep}</span>
              <span>{exportProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300 shadow-glow"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-slate-700 text-slate-400 hover:text-white rounded-xl h-11"
          >
            Cancel
          </Button>
          <Button
            className="flex-[2] bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold hover:opacity-90 rounded-xl h-11 shadow-lg shadow-indigo-500/20"
            onClick={() => onExport(format, quality)}
            disabled={isExporting}
          >
            {isExporting ? (
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 animate-spin" /> Processing...
              </div>
            ) : (
              'Start Final Export'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Virtualized clip list row
const ClipRow = memo(
  ({
    index,
    style,
    segments,
    selectedIds,
    toggleSelect,
    removeSegment,
  }: {
    index: number
    style: React.CSSProperties
    segments: Segment[]
    selectedIds: string[]
    toggleSelect: (id: string, shiftKey: boolean) => void
    removeSegment: (id: string) => void
  }) => {
    const seg = segments[index]
    const active = selectedIds.includes(seg.id)
    return (
      <div style={style}>
        <div
          onClick={(e) => toggleSelect(seg.id, e.shiftKey)}
          className={`group p-2 mx-1 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
            active ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
          }`}
        >
          <div className="relative w-20 h-12 rounded-lg bg-black overflow-hidden shadow-lg flex-shrink-0">
            {seg.thumbnail ? (
              <img src={seg.thumbnail} className="w-full h-full object-cover" alt="" />
            ) : (
              <Film className="w-4 h-4 m-auto text-slate-800" />
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent" />
            <div className="absolute top-1 left-1 bg-black/60 text-[8px] font-bold px-1 rounded-sm">{index + 1}</div>
            <div className="absolute bottom-1 right-1 bg-black/60 text-[8px] font-mono text-cyan-400 px-1 rounded-sm">
              {seg.trimDuration.toFixed(1)}s
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate">{seg.label}</p>
            <p className="text-[9px] text-slate-500 mt-0.5 truncate uppercase tracking-tighter">
              1080p · {seg.trimDuration.toFixed(1)}s
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeSegment(seg.id)
            }}
            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }
)
ClipRow.displayName = 'ClipRow'

// Timeline clip with trim handles
function TimelineClip({
  segment,
  isSelected,
  onSelect,
  onTrimStart,
  onTrimEnd,
  zoom,
  left,
}: {
  segment: Segment
  isSelected: boolean
  onSelect: () => void
  onTrimStart: (id: string, e: React.MouseEvent) => void
  onTrimEnd: (id: string, e: React.MouseEvent) => void
  zoom: number
  left: number
}) {
  const width = segment.trimDuration * zoom
  return (
    <div
      className="absolute top-0 h-full"
      style={{ left: `${left}px`, width: `${width}px` }}
    >
      <div
        className={`relative h-full rounded-md overflow-hidden border-2 cursor-pointer ${
          isSelected ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-500'
        }`}
        onClick={onSelect}
      >
        <img src={segment.thumbnail} className="w-full h-full object-cover" alt="" />
        {segment.transition.type !== 'none' && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />
        )}
        {/* Trim handles */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-indigo-500/30 hover:bg-indigo-500/60 z-10"
          onMouseDown={(e) => {
            e.stopPropagation()
            onTrimStart(segment.id, e)
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-indigo-500/30 hover:bg-indigo-500/60 z-10"
          onMouseDown={(e) => {
            e.stopPropagation()
            onTrimEnd(segment.id, e)
          }}
        />
        <div className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/60 px-1 rounded-sm text-white">
          {segment.label}
        </div>
      </div>
    </div>
  )
}

// ─── Main Editor Component ──────────────────────────────────────────────────
export default function VisualEditor() {
  const {
    segments,
    selectedSegmentIds,
    captions,
    pushHistory,
    undo,
    redo,
    addSegment,
    removeSegment,
    updateSegment,
    updateSelectedSegments,
    setSelectedSegmentIds,
    reorderSegments,
    addCaption,
    removeCaption,
    reset,
    addTransition,
    addKeyframe,
    updateKeyframe,
    removeKeyframe,
    splitSelectedAtPlayhead,
    rippleDelete,
  } = useEditorStore()

  // ── Local UI State ──
  const [activeTab, setActiveTab] = useState('filters')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isLooping, setIsLooping] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [fadeIn, setFadeIn] = useState(0)
  const [fadeOut, setFadeOut] = useState(0)
  const [timelineZoom, setTimelineZoom] = useState(100)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStep, setExportStep] = useState('')
  const [exportModalOpen, setExportModalOpen] = useState(false)

  const [newCaptionText, setNewCaptionText] = useState('')
  const [newCaptionStart, setNewCaptionStart] = useState(0)
  const [newCaptionEnd, setNewCaptionEnd] = useState(5)
  const [newCaptionPosition, setNewCaptionPosition] = useState<'top' | 'center' | 'bottom'>('bottom')
  const [newCaptionSize, setNewCaptionSize] = useState(24)
  const [newCaptionColor, setNewCaptionColor] = useState('#ffffff')
  const [newCaptionStyle, setNewCaptionStyle] = useState<'normal' | 'bold' | 'italic' | 'shadow'>('shadow')
  const [newCaptionBg, setNewCaptionBg] = useState(true)
  const [newCaptionAlign, setNewCaptionAlign] = useState<'left' | 'center' | 'right'>('center')

  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Derived state
  const currentSegment = useMemo(
    () => segments.find((s) => selectedSegmentIds.includes(s.id)) || segments[0] || null,
    [segments, selectedSegmentIds]
  )
  const totalDuration = useMemo(() => segments.reduce((sum, s) => sum + s.trimDuration, 0), [segments])

  // Compute transform values with keyframe interpolation
  const computedTransform = useMemo(() => {
    if (!currentSegment) return defaultTransform
    const relTime = currentTime - currentSegment.startTime
    return {
      rotation: interpolateKeyframes(currentSegment.keyframes?.rotation, relTime, currentSegment.transform.rotation),
      opacity: interpolateKeyframes(currentSegment.keyframes?.opacity, relTime, currentSegment.transform.opacity),
      scale: interpolateKeyframes(currentSegment.keyframes?.scale, relTime, currentSegment.transform.scale ?? 1),
      x: interpolateKeyframes(currentSegment.keyframes?.x, relTime, currentSegment.transform.x ?? 0),
      y: interpolateKeyframes(currentSegment.keyframes?.y, relTime, currentSegment.transform.y ?? 0),
      flipH: currentSegment.transform.flipH,
      flipV: currentSegment.transform.flipV,
    }
  }, [currentSegment, currentTime])

  const progressPct = currentSegment
    ? Math.max(0, Math.min(100, ((currentTime - currentSegment.startTime) / currentSegment.trimDuration) * 100))
    : 0

  const activeCaption = (captions as ExtendedCaption[]).find((c) => currentTime >= c.start && currentTime <= c.end)
  const captionPositionClass =
    activeCaption?.position === 'top'
      ? 'top-8'
      : activeCaption?.position === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : 'bottom-8'

  const videoStyle: React.CSSProperties = useMemo(
    () => ({
      filter: currentSegment ? buildFilterString(currentSegment.filters) : '',
      transform: `
        translate(${computedTransform.x}px, ${computedTransform.y}px)
        rotate(${computedTransform.rotation}deg)
        scale(${computedTransform.scale})
        scaleX(${computedTransform.flipH ? -1 : 1})
        scaleY(${computedTransform.flipV ? -1 : 1})
      `,
      opacity: computedTransform.opacity,
    }),
    [currentSegment, computedTransform]
  )

  // ── Effects ──
  useEffect(() => {
    if (videoRef.current && currentSegment) {
      const video = videoRef.current
      if (video.src !== currentSegment.videoUrl) {
        video.src = currentSegment.videoUrl
        video.currentTime = currentSegment.startTime
        setCurrentTime(currentSegment.startTime)
        setDuration(currentSegment.trimDuration)
      }
    }
  }, [currentSegment])

  useEffect(() => {
    if (isPlaying && videoRef.current && currentSegment) {
      if (videoRef.current.currentTime >= currentSegment.startTime + currentSegment.trimDuration) {
        if (isLooping) videoRef.current.currentTime = currentSegment.startTime
        else {
          videoRef.current.pause()
          setIsPlaying(false)
        }
      }
    }
  }, [currentTime, isPlaying, currentSegment, isLooping])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed
  }, [playbackSpeed])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
      if (e.key === ' ' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        togglePlay()
      }
      if (e.key === 'Delete' && selectedSegmentIds.length > 0) {
        e.preventDefault()
        selectedSegmentIds.forEach((id) => rippleDelete(id))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selectedSegmentIds, rippleDelete])

  // ── Handlers ──
  const handleVideoLoaded = useCallback(
    async (file: Blob | string, dur: number, name?: string) => {
      const url = typeof file === 'string' ? file : URL.createObjectURL(file)
      const thumb = await extractThumbnail(url, 2)

      addSegment({
        id: uid(),
        videoUrl: url,
        file: file instanceof File ? file : null,
        duration: dur,
        startTime: 0,
        trimDuration: dur || 10,
        label: name || 'Untitled Clip',
        thumbnail: thumb || '',
        filters: { ...defaultFilters },
        transform: { ...defaultTransform },
      } as any)
      toast.success('Clip added to your composition')
    },
    [addSegment]
  )

  const toggleSegmentSelection = useCallback(
    (id: string, multi: boolean) => {
      if (multi) {
        setSelectedSegmentIds(
          selectedSegmentIds.includes(id)
            ? selectedSegmentIds.filter((sid) => sid !== id)
            : [...selectedSegmentIds, id]
        )
      } else setSelectedSegmentIds([id])
    },
    [selectedSegmentIds, setSelectedSegmentIds]
  )

  const handleClearVideo = useCallback(() => {
    reset()
    toast.success('Project cleared')
  }, [reset])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) videoRef.current.pause()
    else videoRef.current.play()
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }, [])

  const handleSeek = useCallback(
    (time: number) => {
      if (videoRef.current && currentSegment) {
        const abs = currentSegment.startTime + time
        videoRef.current.currentTime = abs
        setCurrentTime(abs)
      }
    },
    [currentSegment]
  )

  const skipBy = useCallback(
    (s: number) => {
      if (videoRef.current && currentSegment) {
        const rel = videoRef.current.currentTime - currentSegment.startTime
        handleSeek(Math.max(0, Math.min(currentSegment.trimDuration, rel + s)))
      }
    },
    [currentSegment, handleSeek]
  )

  const handleVolumeChange = useCallback((v: number[]) => {
    setVolume(v[0])
    if (videoRef.current) videoRef.current.volume = v[0]
  }, [])

  const splitAtPlayhead = useCallback(() => {
    if (!currentSegment) return
    splitSelectedAtPlayhead(currentTime)
    toast.success('Split all selected clips at playhead')
  }, [currentSegment, currentTime, splitSelectedAtPlayhead])

  const moveSegment = useCallback(
    (direction: 'up' | 'down') => {
      if (!currentSegment) return
      const idx = segments.findIndex((s) => s.id === currentSegment.id)
      if (direction === 'up' && idx > 0) reorderSegments(idx, idx - 1)
      if (direction === 'down' && idx < segments.length - 1) reorderSegments(idx, idx + 1)
    },
    [currentSegment, segments, reorderSegments]
  )

  const updateSelectedFilter = useCallback(
    (key: keyof VideoFilters, value: number) => {
      updateSelectedSegments({ filters: { ...currentSegment?.filters, [key]: value } } as any)
    },
    [updateSelectedSegments, currentSegment]
  )

  const resetFilters = useCallback(() => {
    updateSelectedSegments({ filters: { ...defaultFilters } })
  }, [updateSelectedSegments])

  const applyPreset = useCallback(
    (preset: (typeof LUT_PRESETS)[0]) => {
      updateSelectedSegments({ filters: { ...currentSegment?.filters, ...preset.filters } } as any)
    },
    [updateSelectedSegments, currentSegment]
  )

  const rotate = useCallback(
    (deg: number) => {
      if (!currentSegment) return
      updateSelectedSegments({
        transform: { ...currentSegment.transform, rotation: (currentSegment.transform.rotation + deg) % 360 },
      })
    },
    [updateSelectedSegments, currentSegment]
  )

  const flip = useCallback(
    (axis: 'h' | 'v') => {
      if (!currentSegment) return
      updateSelectedSegments({
        transform:
          axis === 'h'
            ? { ...currentSegment.transform, flipH: !currentSegment.transform.flipH }
            : { ...currentSegment.transform, flipV: !currentSegment.transform.flipV },
      })
    },
    [updateSelectedSegments, currentSegment]
  )

  const resetTransform = useCallback(() => {
    updateSelectedSegments({ transform: { ...defaultTransform } })
  }, [updateSelectedSegments])

  const handleAddCaption = useCallback(() => {
    if (!newCaptionText.trim()) return toast.error('Enter text')
    addCaption({
      text: newCaptionText,
      start: newCaptionStart,
      end: newCaptionEnd,
      position: newCaptionPosition,
      color: newCaptionColor,
      fontSize: newCaptionSize,
      fontStyle: newCaptionStyle,
      bgEnabled: newCaptionBg,
      align: newCaptionAlign,
    } as any)
    setNewCaptionText('')
    toast.success('Caption added to timeline')
  }, [
    newCaptionText,
    newCaptionStart,
    newCaptionEnd,
    newCaptionPosition,
    newCaptionColor,
    newCaptionSize,
    newCaptionStyle,
    newCaptionBg,
    newCaptionAlign,
    addCaption,
  ])

  const deleteCaption = useCallback(
    (id: string) => {
      removeCaption(id)
    },
    [removeCaption]
  )

  // Trim handlers (simplified - you'd implement full drag logic)
  const handleTrimStart = useCallback(
    (id: string, e: React.MouseEvent) => {
      // Implement trim start drag
      console.log('Trim start', id)
    },
    []
  )

  const handleTrimEnd = useCallback(
    (id: string, e: React.MouseEvent) => {
      // Implement trim end drag
      console.log('Trim end', id)
    },
    []
  )

  // Export
  const handleExport = useCallback(
    async (format: string, quality: string) => {
      if (segments.length === 0) return
      setIsExporting(true)
      setExportProgress(0)
      setExportStep('Initializing processing core...')

      try {
        const { processLocalVideo } = await import('@/lib/ffmpeg')
        const { concatSegments } = await import('@/lib/ffmpeg-cut')
        const processed: Blob[] = []

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i]
          setExportStep(`Rendering Clip ${i + 1}/${segments.length}: ${seg.label}`)
          setExportProgress(Math.round((i / segments.length) * 85))

          let blob: Blob
          if (seg.file) blob = seg.file
          else {
            const r = await fetch(seg.videoUrl)
            blob = await r.blob()
          }

          const res = await processLocalVideo(blob, {
            filters: seg.filters,
            transform: seg.transform,
            audio: { volume, muted: isMuted, fadeIn, fadeOut },
            captions: [],
            trim: { start: seg.startTime, duration: seg.trimDuration },
          })
          processed.push(res)
        }

        setExportStep('Merging clips into final scene...')
        setExportProgress(90)
        const merged = await concatSegments(processed)

        let result = merged
        if (captions.length > 0) {
          setExportStep('Burn-in global captions...')
          setExportProgress(95)
          result = await processLocalVideo(merged, {
            filters: defaultFilters,
            transform: defaultTransform,
            audio: { volume, muted: isMuted, fadeIn, fadeOut },
            captions: captions.map(({ id, ...rest }) => rest),
          } as any)
        }

        setExportProgress(100)
        setExportStep('Done!')

        const url = URL.createObjectURL(result)
        const dl = document.createElement('a')
        dl.href = url
        dl.download = `cutpro-${Date.now()}.${format === 'webm' ? 'webm' : 'mp4'}`
        dl.click()
        URL.revokeObjectURL(url)
        toast.success('Production ready video exported!')
      } catch (e) {
        toast.error('Export failed')
        console.error(e)
      } finally {
        setIsExporting(false)
        setExportModalOpen(false)
      }
    },
    [segments, captions, volume, isMuted, fadeIn, fadeOut]
  )

  // ── Render ──
  if (segments.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8">
        <div className="max-w-xl w-full text-center space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="space-y-4">
            <h1 className="text-7xl font-black italic tracking-tighter text-white">
              Cut<span className="text-indigo-500">Pro</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium">Professional grade multi-clip video editor.</p>
          </div>
          <div className="bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[2rem] p-12 hover:border-indigo-500/50 transition-all hover:bg-slate-900/60 shadow-2xl">
            <VideoUpload showUrlUpload={true} onVideoLoaded={handleVideoLoaded} onDurationResolved={() => {}} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 lg:p-6 overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black italic tracking-tighter">
              Cut<span className="text-indigo-400">Pro</span>
            </h1>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={undo} className="h-8 w-8" title="Undo (Ctrl+Z)">
                <Undo className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={redo} className="h-8 w-8" title="Redo (Ctrl+Y)">
                <Redo className="w-4 h-4" />
              </Button>
            </div>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div className="hidden sm:flex gap-4">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">
                Project: <span className="text-slate-200">Session_{Date.now().toString().slice(-4)}</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">
                Clips: <span className="text-indigo-400">{segments.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearVideo}
              className="text-slate-400 hover:text-red-400 rounded-xl h-10 px-4 group"
            >
              <RotateCcw className="w-4 h-4 mr-2 group-hover:rotate-[-90deg] transition-transform" /> Reset
            </Button>
            <Button
              onClick={() => setExportModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-indigo-600/20 gap-2"
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)]">
          {/* Sidebar: Virtualized clip list */}
          <aside className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
            <Card className="bg-black/20 border-slate-800 flex-1 flex flex-col overflow-hidden rounded-2xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> Elements
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 hover:bg-white/5 rounded-lg"
                    onClick={() => moveSegment('up')}
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 hover:bg-white/5 rounded-lg"
                    onClick={() => moveSegment('down')}
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 hover:bg-white/5 rounded-lg"
                    onClick={() => {
                      const i = document.createElement('input')
                      i.type = 'file'
                      i.multiple = true
                      i.accept = 'video/*'
                      i.onchange = (e: any) =>
                        e.target.files &&
                        Array.from(e.target.files).forEach((f: any) => handleVideoLoaded(f, 0, f.name))
                      i.click()
                    }}
                  >
                    <Plus className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
              <div className="flex-1">
                <List
                  height={400}
                  rowCount={segments.length}
                  rowHeight={70}
                  style={{ width: '100%' }}
                  rowComponent={ClipRow}
                  rowProps={{
                    segments,
                    selectedIds: selectedSegmentIds,
                    toggleSelect: toggleSegmentSelection,
                    removeSegment: (id: string) => {
                      pushHistory()
                      removeSegment(id)
                    },
                  }}
                />
              </div>
            </Card>

            {/* Trim & Transition */}
            {currentSegment && selectedSegmentIds.length === 1 && (
              <>
                <Card className="bg-slate-900/40 border-slate-800 p-4 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <Scissors className="w-3.5 h-3.5 text-cyan-500" /> Trim & Cut
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={splitAtPlayhead}
                      className="h-7 text-[9px] border-slate-700 bg-slate-800/40 hover:border-cyan-500 hover:text-cyan-400 gap-1.5 rounded-lg"
                    >
                      <Scissors className="w-3 h-3" /> Split
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500">START</span>
                        <span className="text-white">{currentSegment.startTime.toFixed(1)}s</span>
                      </div>
                      <Slider
                        value={[currentSegment.startTime]}
                        min={0}
                        max={currentSegment.duration - 0.1}
                        step={0.1}
                        onValueChange={([v]) => {
                          const maxT = currentSegment.duration - v
                          updateSegment(currentSegment.id, {
                            startTime: v,
                            trimDuration: Math.min(currentSegment.trimDuration, maxT),
                          })
                          if (videoRef.current) videoRef.current.currentTime = v
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500">LENGTH</span>
                        <span className="text-cyan-400">{currentSegment.trimDuration.toFixed(1)}s</span>
                      </div>
                      <Slider
                        value={[currentSegment.trimDuration]}
                        min={0.1}
                        max={currentSegment.duration - currentSegment.startTime}
                        step={0.1}
                        onValueChange={([v]) => updateSegment(currentSegment.id, { trimDuration: v })}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800 p-4 rounded-2xl space-y-4">
                  <Label className="text-[10px] font-black text-slate-500 uppercase">Transition to Next</Label>
                  <Select
                    value={currentSegment.transition?.type || 'none'}
                    onValueChange={(v: any) => {
                      pushHistory()
                      addTransition(currentSegment.id, { type: v, duration: 0.5 })
                    }}
                  >
                    <SelectTrigger className="bg-black/20 border-slate-800 h-9 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="crossfade">Crossfade</SelectItem>
                      <SelectItem value="fade-black">Fade to Black</SelectItem>
                      <SelectItem value="slide-left">Slide Left</SelectItem>
                      <SelectItem value="slide-right">Slide Right</SelectItem>
                    </SelectContent>
                  </Select>
                  {currentSegment.transition?.type !== 'none' && (
                    <div className="space-y-2">
                      <Label className="text-[8px] text-slate-500 uppercase">Duration</Label>
                      <Slider
                        value={[currentSegment.transition.duration]}
                        min={0.1}
                        max={2}
                        step={0.1}
                        onValueChange={([v]) =>
                          addTransition(currentSegment.id, { ...currentSegment.transition, duration: v })
                        }
                      />
                    </div>
                  )}
                </Card>
              </>
            )}
          </aside>

          {/* Central Stage: Preview + Zoomable Timeline */}
          <section className="lg:col-span-6 flex flex-col gap-4">
            <Card className="bg-black/60 border-slate-800 rounded-2xl overflow-hidden flex-1 flex flex-col shadow-2xl relative">
              <div className="flex-1 relative flex items-center justify-center bg-black/80">
                <video
                  ref={videoRef}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="max-w-full max-h-full object-contain"
                  style={videoStyle}
                />

                {activeCaption && (
                  <div
                    className={`absolute left-0 right-0 flex pointer-events-none transition-all duration-300 ${captionPositionClass} ${
                      activeCaption.align === 'left'
                        ? 'justify-start'
                        : activeCaption.align === 'right'
                        ? 'justify-end'
                        : 'justify-center'
                    }`}
                    style={{ padding: '0 2rem' }}
                  >
                    <div
                      className={`max-w-[85%] px-5 py-2 rounded-2xl shadow-2xl ${
                        activeCaption.bgEnabled !== false
                          ? 'backdrop-blur-md bg-black/60 border border-white/10'
                          : ''
                      }`}
                      style={{
                        color: activeCaption.color || '#fff',
                        fontSize: `${activeCaption.fontSize || 24}px`,
                        fontWeight: activeCaption.fontStyle === 'bold' ? 700 : 400,
                        fontStyle: activeCaption.fontStyle === 'italic' ? 'italic' : 'normal',
                        textShadow: activeCaption.fontStyle === 'shadow' ? '0 2px 10px rgba(0,0,0,0.7)' : 'none',
                        textAlign: (activeCaption.align || 'center') as any,
                      }}
                    >
                      {activeCaption.text}
                    </div>
                  </div>
                )}
              </div>

              {/* Playback Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-12">
                <div
                  className="relative h-2 bg-white/10 rounded-full mb-6 group cursor-pointer"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    handleSeek(((e.clientX - r.left) / r.width) * (currentSegment?.trimDuration || 1))
                  }}
                >
                  <div
                    className="h-full bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-2xl scale-0 group-hover:scale-100 transition-all opacity-0 group-hover:opacity-100"
                    style={{ left: `${progressPct}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => skipBy(-10)} className="text-slate-400 hover:text-white transition-colors">
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
                    >
                      {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                    </button>
                    <button onClick={() => skipBy(10)} className="text-slate-400 hover:text-white transition-colors">
                      <SkipForward className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`transition-colors ${isLooping ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
                      title="Loop"
                    >
                      <Repeat className="w-5 h-5" />
                    </button>
                    <button
                      onClick={splitAtPlayhead}
                      className="text-slate-500 hover:text-cyan-400 transition-colors"
                      title="Split at Playhead"
                    >
                      <Scissors className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="text-xl font-black font-mono tabular-nums leading-none">
                      {formatTime(currentTime - (currentSegment?.startTime || 0))}
                    </div>
                    <div className="text-[9px] font-black text-slate-500 mt-1.5 uppercase tracking-widest">
                      {formatTime(currentSegment?.trimDuration || 0)} CLIP REMAINING
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-xl">
                      <Gauge className="w-4 h-4 text-slate-500" />
                      <select
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        className="bg-transparent text-[10px] font-bold text-slate-300 outline-none cursor-pointer"
                      >
                        {SPEED_OPTIONS.map((sp) => (
                          <option key={sp} value={sp} className="bg-slate-900">
                            {sp}x
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl backdrop-blur-xl">
                      <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <Slider
                        className="w-20"
                        value={[volume]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={handleVolumeChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Zoomable Timeline */}
            <div className="h-24 bg-slate-900/60 border border-slate-800 rounded-2xl p-2 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setTimelineZoom((z) => Math.max(30, z - 20))}
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setTimelineZoom((z) => Math.min(300, z + 20))}
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-6 w-6 ${snapEnabled ? 'text-indigo-400' : 'text-slate-500'}`}
                    onClick={() => setSnapEnabled(!snapEnabled)}
                    title="Toggle Snapping"
                  >
                    <AlignLeft className="w-3 h-3" />
                  </Button>
                </div>
                <span className="text-[10px] text-slate-500">Total: {formatTime(totalDuration)}</span>
              </div>
              <div ref={timelineRef} className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
                <div
                  className="relative h-full"
                  style={{ width: `${totalDuration * timelineZoom}px` }}
                >
                  {segments.map((seg, idx) => {
                    const left = segments
                      .slice(0, idx)
                      .reduce((sum, s) => sum + s.trimDuration, 0) * timelineZoom
                    return (
                      <TimelineClip
                        key={seg.id}
                        segment={seg}
                        isSelected={selectedSegmentIds.includes(seg.id)}
                        onSelect={() => setSelectedSegmentIds([seg.id])}
                        onTrimStart={handleTrimStart}
                        onTrimEnd={handleTrimEnd}
                        zoom={timelineZoom}
                        left={left}
                      />
                    )
                  })}
                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-20 pointer-events-none"
                    style={{ left: `${currentTime * timelineZoom}px` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Editor Panel: Tabs */}
          <aside className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="bg-slate-900/60 border border-slate-800 p-1.5 rounded-2xl mb-4 grid grid-cols-5 gap-1">
                <TabsTrigger value="filters" className="rounded-xl data-[state=active]:bg-indigo-600 text-xs font-bold py-2.5">
                  Style
                </TabsTrigger>
                <TabsTrigger value="format" className="rounded-xl data-[state=active]:bg-indigo-600 text-xs font-bold py-2.5">
                  Layout
                </TabsTrigger>
                <TabsTrigger value="keyframes" className="rounded-xl data-[state=active]:bg-indigo-600 text-xs font-bold py-2.5">
                  Keyframes
                </TabsTrigger>
                <TabsTrigger value="audio" className="rounded-xl data-[state=active]:bg-indigo-600 text-xs font-bold py-2.5">
                  Audio
                </TabsTrigger>
                <TabsTrigger value="captions" className="rounded-xl data-[state=active]:bg-indigo-600 text-xs font-bold py-2.5">
                  Text
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                {/* Style Tab */}
                <TabsContent value="filters" className="h-full overflow-y-auto pr-1 space-y-4 m-0">
                  <Card className="bg-slate-900/40 border-slate-800 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Pro LUTs</Label>
                      <Button variant="ghost" size="sm" onClick={resetFilters} className="text-[10px] h-6 text-slate-400">
                        Default
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LUT_PRESETS.map((p) => (
                        <Button
                          key={p.id}
                          size="sm"
                          variant="outline"
                          onClick={() => applyPreset(p)}
                          className="h-8 text-[10px] border-slate-800 bg-slate-900/30 font-bold hover:border-indigo-500"
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </Card>
                  <Card className="bg-slate-900/40 border-slate-800 p-5 rounded-2xl space-y-2">
                    {currentSegment && (
                      <>
                        <FilterSlider
                          label="Brightness"
                          value={currentSegment.filters.brightness}
                          min={0}
                          max={2}
                          displayValue={currentSegment.filters.brightness.toFixed(2)}
                          onChange={([v]) => updateSelectedFilter('brightness', v)}
                        />
                        <FilterSlider
                          label="Contrast"
                          value={currentSegment.filters.contrast}
                          min={0}
                          max={2}
                          displayValue={currentSegment.filters.contrast.toFixed(2)}
                          onChange={([v]) => updateSelectedFilter('contrast', v)}
                        />
                        <FilterSlider
                          label="Saturation"
                          value={currentSegment.filters.saturation}
                          min={0}
                          max={2}
                          displayValue={currentSegment.filters.saturation.toFixed(2)}
                          onChange={([v]) => updateSelectedFilter('saturation', v)}
                        />
                        <FilterSlider
                          label="Hue Rotation"
                          value={currentSegment.filters.hue}
                          min={0}
                          max={360}
                          step={1}
                          displayValue={`${currentSegment.filters.hue}°`}
                          onChange={([v]) => updateSelectedFilter('hue', v)}
                        />
                        <FilterSlider
                          label="Gaussian Blur"
                          value={currentSegment.filters.blur}
                          min={0}
                          max={10}
                          displayValue={`${currentSegment.filters.blur.toFixed(1)}px`}
                          onChange={([v]) => updateSelectedFilter('blur', v)}
                        />
                        <FilterSlider
                          label="Sepia"
                          value={currentSegment.filters.sepia}
                          min={0}
                          max={100}
                          step={1}
                          displayValue={`${Math.round(currentSegment.filters.sepia)}%`}
                          onChange={([v]) => updateSelectedFilter('sepia', v)}
                        />
                        <FilterSlider
                          label="Grayscale"
                          value={currentSegment.filters.grayscale}
                          min={0}
                          max={1}
                          displayValue={`${Math.round(currentSegment.filters.grayscale * 100)}%`}
                          onChange={([v]) => updateSelectedFilter('grayscale', v)}
                        />
                        <FilterSlider
                          label="Invert"
                          value={currentSegment.filters.invert}
                          min={0}
                          max={100}
                          step={1}
                          displayValue={`${Math.round(currentSegment.filters.invert)}%`}
                          onChange={([v]) => updateSelectedFilter('invert', v)}
                        />
                      </>
                    )}
                  </Card>
                </TabsContent>

                {/* Layout Tab */}
                <TabsContent value="format" className="h-full overflow-y-auto pr-1 space-y-4 m-0">
                  <Card className="bg-slate-900/40 border-slate-800 p-5 rounded-2xl space-y-6">
                    <Label className="text-[10px] font-black text-slate-500 uppercase">Transformation</Label>
                    {currentSegment && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rotate(90)}
                            className="h-11 border-slate-800 bg-slate-800/20 text-xs font-bold gap-1.5"
                          >
                            <RotateCw className="w-4 h-4" /> 90°
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => flip('h')}
                            className={`h-11 border-slate-800 flex flex-col gap-0.5 ${
                              currentSegment.transform.flipH
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-800/20 text-slate-100'
                            }`}
                          >
                            <FlipHorizontal className="w-4 h-4" />
                            <span className="text-[8px] uppercase">Flip H</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => flip('v')}
                            className={`h-11 border-slate-800 flex flex-col gap-0.5 ${
                              currentSegment.transform.flipV
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-800/20 text-slate-100'
                            }`}
                          >
                            <FlipVertical className="w-4 h-4" />
                            <span className="text-[8px] uppercase">Flip V</span>
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-500">ROTATION</span>
                            <span className="text-white">{currentSegment.transform.rotation}°</span>
                          </div>
                          <Slider
                            value={[currentSegment.transform.rotation]}
                            min={0}
                            max={359}
                            step={1}
                            onValueChange={([v]) =>
                              updateSelectedSegments({ transform: { ...currentSegment.transform, rotation: v } })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-500">OPACITY</span>
                            <span className="text-white">{Math.round(currentSegment.transform.opacity * 100)}%</span>
                          </div>
                          <Slider
                            value={[currentSegment.transform.opacity]}
                            min={0.1}
                            max={1}
                            step={0.01}
                            onValueChange={([v]) =>
                              updateSelectedSegments({ transform: { ...currentSegment.transform, opacity: v } })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-500">SCALE</span>
                            <span className="text-white">{currentSegment.transform.scale?.toFixed(2) || '1.00'}x</span>
                          </div>
                          <Slider
                            value={[currentSegment.transform.scale || 1]}
                            min={0.1}
                            max={3}
                            step={0.01}
                            onValueChange={([v]) =>
                              updateSelectedSegments({ transform: { ...currentSegment.transform, scale: v } })
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetTransform}
                          className="w-full text-[10px] text-slate-500 hover:text-white uppercase font-black"
                        >
                          Reset to Camera Default
                        </Button>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* Keyframes Tab */}
                <TabsContent value="keyframes" className="h-full overflow-y-auto pr-1 space-y-4 m-0">
                  {currentSegment ? (
                    <Card className="bg-slate-900/40 border-slate-800 p-5 rounded-2xl space-y-4">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Keyframe Animation</Label>
                      <div className="text-[11px] text-slate-400 mb-2">
                        Playhead: {(currentTime - currentSegment.startTime).toFixed(2)}s
                      </div>
                      {(['opacity', 'scale', 'rotation', 'x', 'y'] as const).map((prop) => {
                        const keyframes = currentSegment.keyframes?.[prop] || []
                        return (
                          <div key={prop} className="border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">{prop}</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[9px]"
                                onClick={() => {
                                  const relTime = currentTime - currentSegment.startTime
                                  let value: number
                                  switch (prop) {
                                    case 'opacity':
                                      value = computedTransform.opacity
                                      break
                                    case 'scale':
                                      value = computedTransform.scale
                                      break
                                    case 'rotation':
                                      value = computedTransform.rotation
                                      break
                                    case 'x':
                                      value = computedTransform.x
                                      break
                                    case 'y':
                                      value = computedTransform.y
                                      break
                                    default:
                                      value = 0
                                  }
                                  addKeyframe(currentSegment.id, prop, {
                                    time: relTime,
                                    value,
                                    easing: 'linear',
                                  })
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add at Playhead
                              </Button>
                            </div>
                            {keyframes.length > 0 ? (
                              <div className="space-y-1">
                                {keyframes
                                  .sort((a, b) => a.time - b.time)
                                  .map((kf) => (
                                    <div
                                      key={kf.id}
                                      className="flex items-center justify-between bg-slate-800/30 p-1.5 rounded text-[10px]"
                                    >
                                      <span>
                                        {kf.time.toFixed(2)}s: {typeof kf.value === 'number' ? kf.value.toFixed(2) : kf.value}
                                      </span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-5 w-5"
                                        onClick={() => removeKeyframe(currentSegment.id, prop, kf.id)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-[9px] text-slate-600 italic">No keyframes</div>
                            )}
                          </div>
                        )
                      })}
                    </Card>
                  ) : (
                    <div className="text-center text-slate-500 text-sm p-4">Select a clip to edit keyframes</div>
                  )}
                </TabsContent>

                {/* Audio Tab */}
                <TabsContent value="audio" className="h-full overflow-y-auto pr-1 space-y-4 m-0">
                  <Card className="bg-slate-900/40 border-slate-800 p-5 rounded-2xl space-y-5">
                    <Label className="text-[10px] font-black text-slate-500 uppercase">Audio Controls</Label>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500">VOLUME</span>
                          <span className="text-white">{Math.round(volume * 100)}%</span>
                        </div>
                        <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={handleVolumeChange} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Mute Audio</Label>
                        <Switch checked={isMuted} onCheckedChange={setIsMuted} />
                      </div>
                    </div>
                  </Card>
                  <Card className="bg-slate-900/40 border-slate-800 p-5 rounded-2xl space-y-5">
                    <Label className="text-[10px] font-black text-slate-500 uppercase">Fade Effects</Label>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500">FADE IN</span>
                          <span className="text-indigo-400">{fadeIn.toFixed(1)}s</span>
                        </div>
                        <Slider value={[fadeIn]} min={0} max={5} step={0.1} onValueChange={([v]) => setFadeIn(v)} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500">FADE OUT</span>
                          <span className="text-indigo-400">{fadeOut.toFixed(1)}s</span>
                        </div>
                        <Slider value={[fadeOut]} min={0} max={5} step={0.1} onValueChange={([v]) => setFadeOut(v)} />
                      </div>
                    </div>
                  </Card>
                  <Card className="bg-slate-900/40 border-slate-800 p-5 rounded-2xl space-y-5">
                    <Label className="text-[10px] font-black text-slate-500 uppercase">Playback</Label>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500">SPEED</span>
                          <span className="text-cyan-400">{playbackSpeed}x</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {SPEED_OPTIONS.map((sp) => (
                            <Button
                              key={sp}
                              size="sm"
                              variant="outline"
                              onClick={() => setPlaybackSpeed(sp)}
                              className={`h-8 text-[10px] font-bold rounded-lg ${
                                playbackSpeed === sp
                                  ? 'bg-indigo-600 text-white border-indigo-500'
                                  : 'border-slate-800 bg-slate-900/30'
                              }`}
                            >
                              {sp}x
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Loop Playback</Label>
                        <Switch checked={isLooping} onCheckedChange={setIsLooping} />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Captions Tab */}
                <TabsContent value="captions" className="h-full overflow-y-auto pr-1 space-y-4 m-0">
                  <Card className="bg-slate-900/40 border-slate-800 p-5 rounded-2xl space-y-4">
                    <Label className="text-[10px] font-black text-slate-500 uppercase">Producer Captions</Label>
                    <Textarea
                      placeholder="Burn-in text here..."
                      value={newCaptionText}
                      onChange={(e) => setNewCaptionText(e.target.value)}
                      className="bg-black/40 border-slate-800 rounded-xl text-sm min-h-[70px]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[8px] text-slate-500 uppercase font-black">START (SEC)</Label>
                        <Input
                          type="number"
                          value={newCaptionStart}
                          step="0.1"
                          onChange={(e) => setNewCaptionStart(parseFloat(e.target.value) || 0)}
                          className="bg-black/20 border-slate-800 h-9 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[8px] text-slate-500 uppercase font-black">END (SEC)</Label>
                        <Input
                          type="number"
                          value={newCaptionEnd}
                          step="0.1"
                          onChange={(e) => setNewCaptionEnd(parseFloat(e.target.value) || 0)}
                          className="bg-black/20 border-slate-800 h-9 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[8px] text-slate-500 uppercase font-black">Position</Label>
                        <Select value={newCaptionPosition} onValueChange={(v) => setNewCaptionPosition(v as any)}>
                          <SelectTrigger className="bg-black/20 border-slate-800 h-9 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="top">Top</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="bottom">Bottom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[8px] text-slate-500 uppercase font-black">Align</Label>
                        <Select value={newCaptionAlign} onValueChange={(v) => setNewCaptionAlign(v as any)}>
                          <SelectTrigger className="bg-black/20 border-slate-800 h-9 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[8px] text-slate-500 uppercase font-black">Font Size</Label>
                        <Input
                          type="number"
                          value={newCaptionSize}
                          min={8}
                          max={72}
                          onChange={(e) => setNewCaptionSize(parseInt(e.target.value) || 24)}
                          className="bg-black/20 border-slate-800 h-9 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[8px] text-slate-500 uppercase font-black">Color</Label>
                        <Input
                          type="color"
                          value={newCaptionColor}
                          onChange={(e) => setNewCaptionColor(e.target.value)}
                          className="bg-black/20 border-slate-800 h-9 rounded-lg p-1 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[8px] text-slate-500 uppercase font-black">Style</Label>
                        <Select value={newCaptionStyle} onValueChange={(v) => setNewCaptionStyle(v as any)}>
                          <SelectTrigger className="bg-black/20 border-slate-800 h-9 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                            <SelectItem value="italic">Italic</SelectItem>
                            <SelectItem value="shadow">Shadow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Background</Label>
                      <Switch checked={newCaptionBg} onCheckedChange={setNewCaptionBg} />
                    </div>
                    <Button
                      onClick={handleAddCaption}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold h-10 rounded-xl"
                    >
                      Add to Final Render
                    </Button>
                  </Card>
                  {captions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-500 uppercase px-2 mb-2 block">
                        Overlay Sequence
                      </Label>
                      {(captions as ExtendedCaption[]).map((c) => (
                        <div
                          key={c.id}
                          className={`group bg-slate-900/60 border p-3 rounded-xl flex items-center justify-between hover:bg-slate-800/80 transition-all shadow-lg ${
                            currentTime >= c.start && currentTime <= c.end
                              ? 'border-indigo-500/60'
                              : 'border-slate-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold truncate pr-2" style={{ color: c.color || '#fff' }}>
                              {c.text}
                            </div>
                            <div className="text-[9px] font-black text-indigo-400 mt-1 uppercase tracking-tighter">
                              {c.start.toFixed(1)}s — {c.end.toFixed(1)}s · {c.position} · {c.fontSize || 24}px
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCaption(c.id)}
                            className="w-8 h-8 rounded-lg text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </aside>
        </main>
      </div>

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportStep={exportStep}
      />
    </div>
  )
}