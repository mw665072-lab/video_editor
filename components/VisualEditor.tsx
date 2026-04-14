'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEditorStore, Caption, EditorFilters } from '@/store/editorStore'
import { VideoUpload } from '@/components/VideoUpload'
import { exportVisualVideo, getVisualExportStatus, downloadVisualExportedVideo } from '@/lib/api'
import { processLocalVideo } from '@/lib/ffmpeg'
import { toast } from 'sonner'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sun,
  Contrast,
  Droplets,
  Type,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Plus,
  Save,
  SkipBack,
  SkipForward,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Scissors,
  Gauge,
  Layers,
  Music,
  Crop,
  Film,
  Settings2,
  X,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  AlignCenter,
  AlignLeft,
  AlignRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtendedCaption extends Caption {
  fontSize: number
  color: string
  fontStyle: 'normal' | 'bold' | 'italic' | 'shadow'
  bgEnabled: boolean
  align: 'left' | 'center' | 'right'
}

interface VideoFilters extends EditorFilters {
  hue: number
  blur: number
  sepia: number
  grayscale: number
  invert: number
}

interface VideoTransform {
  rotation: number
  flipH: boolean
  flipV: boolean
  opacity: number
}

interface ExportFormat {
  id: string
  label: string
  description: string
  badge?: string
  badgeColor?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'mp4', label: 'MP4 / H.264', description: 'Universal — works everywhere', badge: 'Most Compatible', badgeColor: '#6c63ff' },
  { id: 'tiktok', label: 'TikTok / Reels', description: '9:16 · 1080×1920 vertical', badge: 'TikTok', badgeColor: '#ff0050' },
  { id: 'youtube', label: 'YouTube', description: '16:9 · 1920×1080 landscape', badge: 'YouTube', badgeColor: '#ff0000' },
  { id: 'instagram', label: 'Instagram', description: 'Square 1:1 · 1080×1080', badge: 'Instagram', badgeColor: '#e1306c' },
  { id: 'twitter', label: 'Twitter / X', description: '16:9 · up to 1920×1200', badge: 'Twitter', badgeColor: '#1da1f2' },
  { id: 'webm', label: 'WebM / VP9', description: 'Web-optimised, smaller size', badge: 'WebM', badgeColor: '#4a90d9' },
]

const LUT_PRESETS = [
  { id: 'cinematic', label: '🎬 Cinematic', filters: { brightness: 0.9, contrast: 1.1, saturation: 0.8, hue: 0, sepia: 5, grayscale: 0, invert: 0 } },
  { id: 'warm', label: '🌅 Warm', filters: { brightness: 1.05, contrast: 1.05, saturation: 1.2, hue: 15, sepia: 10, grayscale: 0, invert: 0 } },
  { id: 'cool', label: '❄️ Cool', filters: { brightness: 1.0, contrast: 1.05, saturation: 0.9, hue: 200, sepia: 0, grayscale: 0, invert: 0 } },
  { id: 'vintage', label: '📷 Vintage', filters: { brightness: 0.9, contrast: 0.95, saturation: 0.7, hue: 10, sepia: 40, grayscale: 0, invert: 0 } },
  { id: 'vivid', label: '🌈 Vivid', filters: { brightness: 1.1, contrast: 1.2, saturation: 1.5, hue: 0, sepia: 0, grayscale: 0, invert: 0 } },
  { id: 'bw', label: '⬛ B&W', filters: { brightness: 1.0, contrast: 1.1, saturation: 0, hue: 0, sepia: 0, grayscale: 1, invert: 0 } },
]

const CAPTION_COLORS = ['#ffffff', '#ffd93d', '#4ecdc4', '#ff6b6b', '#6c63ff', '#2ed573', '#000000']

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2]

const defaultFilters: VideoFilters = {
  brightness: 1, contrast: 1, saturation: 1,
  hue: 0, blur: 0, sepia: 0, grayscale: 0, invert: 0,
}

const defaultTransform: VideoTransform = {
  rotation: 0, flipH: false, flipV: false, opacity: 1,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function buildTransformString(t: VideoTransform): string {
  return `rotate(${t.rotation}deg) scaleX(${t.flipH ? -1 : 1}) scaleY(${t.flipV ? -1 : 1})`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSlider({
  label, value, min, max, step = 0.01, displayValue,
  onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number
  displayValue: string; onChange: (v: number[]) => void
}) {
  return (
    <div className="space-y-1 mb-3">
      <div className="flex justify-between items-center">
        <Label className="text-xs text-slate-300">{label}</Label>
        <span className="text-xs text-slate-400 tabular-nums font-mono">{displayValue}</span>
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
  open: boolean; onClose: () => void
  onExport: (format: string, quality: string) => void
  isExporting: boolean; exportProgress: number; exportStep: string
}) {
  const [selectedFormat, setSelectedFormat] = useState('mp4')
  const [quality, setQuality] = useState('medium')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-white">Export Video</h2>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-slate-400 text-xs mb-5">Choose your format and quality settings</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {EXPORT_FORMATS.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFormat(f.id)}
              className={`p-3 rounded-xl border text-left transition-all ${selectedFormat === f.id
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
                }`}
            >
              {f.badge && (
                <span
                  className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full text-white mb-1"
                  style={{ background: f.badgeColor }}
                >
                  {f.badge}
                </span>
              )}
              <div className="text-xs font-semibold text-white">{f.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{f.description}</div>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <Label className="text-xs text-slate-300 mb-1 block">Quality</Label>
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="high" className="text-slate-200 focus:bg-slate-700 focus:text-white">High (1080p)</SelectItem>
              <SelectItem value="medium" className="text-slate-200 focus:bg-slate-700 focus:text-white">Medium (720p)</SelectItem>
              <SelectItem value="low" className="text-slate-200 focus:bg-slate-700 focus:text-white">Low (480p — smaller file)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isExporting && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>{exportStep}</span>
              <span className="text-indigo-400 font-bold">{exportProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:text-white">
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold hover:opacity-90"
            onClick={() => onExport(selectedFormat, quality)}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Now'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VisualEditor() {
  const {
    videoUrl,
    currentTime,
    duration,
    isPlaying,
    captions,
    setVideoUrl,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    addCaption,
    updateCaption,
    removeCaption,
    reset,
  } = useEditorStore()

  const videoRef = useRef<HTMLVideoElement>(null)

  // ── Video source state ──
  const [videoSource, setVideoSource] = useState<Blob | string | null>(null)

  // ── Filters ──
  const [filters, setFiltersState] = useState<VideoFilters>(defaultFilters)

  // ── Transform ──
  const [transform, setTransform] = useState<VideoTransform>(defaultTransform)

  // ── Audio ──
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isLooping, setIsLooping] = useState(false)
  const [fadeIn, setFadeIn] = useState(0)
  const [fadeOut, setFadeOut] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // ── Caption form ──
  const [newCaptionText, setNewCaptionText] = useState('')
  const [newCaptionStart, setNewCaptionStart] = useState(0)
  const [newCaptionEnd, setNewCaptionEnd] = useState(5)
  const [newCaptionPosition, setNewCaptionPosition] = useState<'top' | 'center' | 'bottom'>('bottom')
  const [newCaptionFontSize, setNewCaptionFontSize] = useState(20)
  const [newCaptionColor, setNewCaptionColor] = useState('#ffffff')
  const [newCaptionFontStyle, setNewCaptionFontStyle] = useState<'normal' | 'bold' | 'italic' | 'shadow'>('normal')
  const [newCaptionBg, setNewCaptionBg] = useState(true)
  const [newCaptionAlign, setNewCaptionAlign] = useState<'left' | 'center' | 'right'>('center')

  // ── Export ──
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStep, setExportStep] = useState('')
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // ── UI ──
  const [activeFormatLabel, setActiveFormatLabel] = useState<string | null>(null)
  const [isSeeking, setIsSeeking] = useState(false)

  // ─── Derived: active caption ─────────────────────────────────────────────────

  const activeCaption = (captions as ExtendedCaption[]).find(
    c => currentTime >= c.start && currentTime <= c.end
  )

  // ─── Video CSS ────────────────────────────────────────────────────────────────

  const videoStyle: React.CSSProperties = {
    filter: buildFilterString(filters),
    transform: buildTransformString(transform),
    opacity: transform.opacity,
  }

  // ─── Video load ───────────────────────────────────────────────────────────────

  const handleVideoLoaded = useCallback(
    (source: Blob | string, dur: number, fileName?: string) => {
      setVideoSource(source)
      if (typeof source === 'string') {
        setVideoUrl(source)
      } else {
        setVideoUrl(URL.createObjectURL(source))
      }
      setDuration(dur)
      toast.success(`Video loaded${fileName ? ': ' + fileName : ''}`)
    },
    [setVideoUrl, setDuration]
  )

  // ─── Playback ─────────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) videoRef.current.pause()
    else videoRef.current.play()
    setIsPlaying(!isPlaying)
  }, [isPlaying, setIsPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !isSeeking) setCurrentTime(videoRef.current.currentTime)
  }, [setCurrentTime, isSeeking])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }, [setDuration])

  const handleSeek = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time
        setCurrentTime(time)
      }
    },
    [setCurrentTime]
  )

  const skipBy = useCallback(
    (seconds: number) => {
      if (videoRef.current) {
        const t = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
        videoRef.current.currentTime = t
        setCurrentTime(t)
      }
    },
    [duration, setCurrentTime]
  )

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [])

  // ─── Audio ────────────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const handleVolumeChange = useCallback((value: number[]) => {
    const v = value[0]
    setVolume(v)
    if (videoRef.current) {
      videoRef.current.volume = v
      videoRef.current.muted = v === 0
      setIsMuted(v === 0)
    }
  }, [])

  const toggleLoop = useCallback(() => {
    const next = !isLooping
    setIsLooping(next)
    if (videoRef.current) videoRef.current.loop = next
  }, [isLooping])

  // ─── Filters ─────────────────────────────────────────────────────────────────

  const updateFilter = useCallback((key: keyof VideoFilters, value: number) => {
    setFiltersState(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters)
    toast.info('Filters reset')
  }, [])

  const applyPreset = useCallback((preset: typeof LUT_PRESETS[0]) => {
    setFiltersState(prev => ({ ...prev, ...preset.filters }))
    toast.success(`Applied ${preset.label} preset`)
  }, [])

  // ─── Transform ────────────────────────────────────────────────────────────────

  const rotate = useCallback((deg: number) => {
    setTransform(prev => ({ ...prev, rotation: (prev.rotation + deg) % 360 }))
    toast.info(`Rotated ${deg}°`)
  }, [])

  const flip = useCallback((axis: 'h' | 'v') => {
    setTransform(prev =>
      axis === 'h' ? { ...prev, flipH: !prev.flipH } : { ...prev, flipV: !prev.flipV }
    )
  }, [])

  const resetTransform = useCallback(() => {
    setTransform(defaultTransform)
    toast.info('Transform reset')
  }, [])

  // ─── Captions ─────────────────────────────────────────────────────────────────

  const handleAddCaption = useCallback(() => {
    if (!newCaptionText.trim()) { toast.error('Enter caption text'); return }
    if (newCaptionStart >= newCaptionEnd) { toast.error('Start must be before end'); return }

    addCaption({
      text: newCaptionText,
      start: newCaptionStart,
      end: newCaptionEnd,
      position: newCaptionPosition,
      // extended fields stored via spread — your store should accept extra props
      // or you can extend the Caption type in editorStore
      ...(
        {
          fontSize: newCaptionFontSize,
          color: newCaptionColor,
          fontStyle: newCaptionFontStyle,
          bgEnabled: newCaptionBg,
          align: newCaptionAlign,
        } as any
      ),
    })

    setNewCaptionText('')
    if (videoRef.current) {
      setNewCaptionStart(videoRef.current.currentTime)
      setNewCaptionEnd(Math.min(duration, videoRef.current.currentTime + 5))
    }
    toast.success('Caption added')
  }, [
    newCaptionText, newCaptionStart, newCaptionEnd, newCaptionPosition,
    newCaptionFontSize, newCaptionColor, newCaptionFontStyle, newCaptionBg, newCaptionAlign,
    duration, addCaption,
  ])

  const setTimestampsAtPlayhead = useCallback(() => {
    if (!videoRef.current) return
    const t = videoRef.current.currentTime
    setNewCaptionStart(parseFloat(t.toFixed(1)))
    setNewCaptionEnd(parseFloat(Math.min(duration, t + 5).toFixed(1)))
    toast.success('Timestamps set to playhead')
  }, [duration])

  const clearAllCaptions = useCallback(() => {
    captions.forEach(c => removeCaption(c.id))
    toast.info('All captions cleared')
  }, [captions, removeCaption])

  // ─── Export ───────────────────────────────────────────────────────────────────

  const handleExport = useCallback(
    async (format: string, quality: string) => {
      if (!videoUrl) { toast.error('No video loaded'); return }

      setIsExporting(true)
      setExportProgress(0)

      const steps = [
        [10, 'Reading video data...'],
        [25, 'Applying filters...'],
        [40, 'Processing audio...'],
        [60, 'Encoding captions...'],
        [75, `Encoding to ${format.toUpperCase()}...`],
        [90, 'Finalising...'],
        [100, 'Done!'],
      ] as const

      try {
        const exportOptions = {
          filters: {
            brightness: filters.brightness,
            contrast: filters.contrast,
            saturation: filters.saturation,
            hue: filters.hue,
            blur: filters.blur,
            sepia: filters.sepia,
            grayscale: filters.grayscale,
            invert: filters.invert,
          },
          transform,
          audio: { volume, muted: isMuted, fadeIn, fadeOut },
          captions: captions.map(({ id, ...cap }) => cap as any),
          onProgress: (p: number) => {
            setExportProgress(p)
            setExportStep(p < 100 ? `Encoding with FFmpeg... ${p}%` : 'Finalising...')
          }
        }

        let resultBlob: Blob

        if (videoSource instanceof Blob) {
          // --- Client-Side Export ---
          setExportStep('Initializing FFmpeg...')
          setExportProgress(5)
          resultBlob = await processLocalVideo(videoSource, exportOptions)
          setExportProgress(100)
          setExportStep('Done!')
        } else {
          // --- Backend-Side Export ---
          const exportData = {
            videoSource: videoUrl || '',
            format,
            quality,
            ...exportOptions
          }

          const { jobId } = await exportVisualVideo(exportData)

          // Simulate step progress while polling
          let stepIdx = 0
          const stepTimer = setInterval(() => {
            if (stepIdx < steps.length - 1) {
              const [pct, label] = steps[stepIdx++]
              setExportProgress(pct)
              setExportStep(label)
            }
          }, 500)

          let status = await getVisualExportStatus(jobId)
          while (status.status === 'pending' || status.status === 'running') {
            await new Promise(r => setTimeout(r, 2000))
            status = await getVisualExportStatus(jobId)
            if (status.progress) setExportProgress(status.progress)
          }

          clearInterval(stepTimer)

          if (status.status === 'failed') throw new Error(status.error || 'Export failed')

          if (status.status === 'done' && status.downloadUrl) {
            resultBlob = await downloadVisualExportedVideo(status.downloadUrl)
          } else {
            throw new Error('Export completed but no download URL was provided')
          }
        }

        // --- Handle Download ---
        const url = URL.createObjectURL(resultBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `cutpro-export-${format}-${Date.now()}.mp4`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success('Export downloaded!')

      } catch (err) {
        console.error('[Export Error]', err)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.error(`Export failed: ${msg}`)
      } finally {
        setIsExporting(false)
        setExportModalOpen(false)
      }
    },
    [videoSource, videoUrl, filters, transform, volume, isMuted, fadeIn, fadeOut, captions]
  )

  // ─── Clear ────────────────────────────────────────────────────────────────────

  const handleClearVideo = useCallback(() => {
    if (videoUrl?.startsWith('blob:')) URL.revokeObjectURL(videoUrl)
    reset()
    setVideoSource(null)
    setFiltersState(defaultFilters)
    setTransform(defaultTransform)
    setIsMuted(false)
    setVolume(1)
    setIsLooping(false)
    setActiveFormatLabel(null)
    toast.success('Editor cleared')
  }, [videoUrl, reset])

  // ─── Percent progress for timeline ───────────────────────────────────────────

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  // ─── Caption position CSS ─────────────────────────────────────────────────────

  const captionPositionClass =
    activeCaption?.position === 'top'
      ? 'top-4'
      : activeCaption?.position === 'center'
        ? 'top-1/2 -translate-y-1/2'
        : 'bottom-4'

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="mx-auto max-w-[1440px] space-y-4">

        {/* ── Header ── */}
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 backdrop-blur shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight italic text-white">
                Cut<span className="text-cyan-400">Pro</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Professional video editor — filters, captions, audio, transform & multi-format export
              </p>
            </div>
            {videoUrl && (
              <div className="flex gap-2 flex-wrap">
                {/* Format quick-select */}
                {(['TikTok', 'Reels', 'YouTube', 'Square'] as const).map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant="outline"
                    onClick={() => { setActiveFormatLabel(f); toast.info(`Format: ${f}`) }}
                    className={`rounded-lg border-slate-700 text-xs ${activeFormatLabel === f ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'bg-slate-800/60 text-slate-300'}`}
                  >
                    {f}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearVideo}
                  className="rounded-lg border-slate-600 bg-slate-800/60 text-slate-100 hover:border-red-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <RotateCcw className="w-4 h-4 mr-1" /> Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setExportModalOpen(true)}
                  className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90 font-semibold"
                >
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
              </div>
            )}
          </div>
        </div>

        {!videoUrl ? (
          // ── Upload ──
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/70 p-12 min-h-[60vh]">
            <VideoUpload
              showUrlUpload={false}
              onVideoLoaded={handleVideoLoaded}
              onDurationResolved={(dur, title) => {
                setDuration(dur)
                if (title) toast.success(`Duration: ${formatTime(dur)}${title !== 'Untitled' ? ` — ${title}` : ''}`)
              }}
            />
          </div>
        ) : (
          // ── Editor Layout ──
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* ══ LEFT SIDEBAR — Filters + Transform + Speed ══ */}
            <div className="lg:col-span-2 space-y-3">

              {/* LUT Presets */}
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-300 flex items-center gap-1">
                    <Film className="w-3 h-3" /> Presets
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 grid grid-cols-2 gap-1.5">
                  {LUT_PRESETS.map(p => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset(p)}
                      className="text-[11px] border-slate-700 bg-slate-800/60 hover:border-indigo-500 hover:bg-indigo-500/10 h-7 px-2 text-slate-200 hover:text-white"
                    >
                      {p.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Speed */}
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-300 flex items-center gap-1">
                    <Gauge className="w-3 h-3" /> Speed
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 flex flex-wrap gap-1.5">
                  {PLAYBACK_SPEEDS.map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={playbackSpeed === s ? 'default' : 'outline'}
                      onClick={() => handleSpeedChange(s)}
                      className={`text-[11px] h-7 px-2 ${playbackSpeed === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-800/60 text-slate-200'}`}
                    >
                      {s}x
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Transform */}
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-300 flex items-center gap-1">
                    <Crop className="w-3 h-3" /> Transform
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="grid grid-cols-3 gap-1">
                    <Button size="sm" variant="outline" onClick={() => rotate(-90)} className="text-[10px] border-slate-700 bg-slate-800/60 h-7 px-1 text-slate-200">
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rotate(90)} className="text-[10px] border-slate-700 bg-slate-800/60 h-7 px-1 text-slate-200">
                      <RotateCw className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rotate(180)} className="text-[10px] border-slate-700 bg-slate-800/60 h-7 px-1 text-slate-200">
                      180°
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => flip('h')} className={`text-[10px] border-slate-700 h-7 px-1 text-slate-200 ${transform.flipH ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-800/60'}`}>
                      <FlipHorizontal className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => flip('v')} className={`text-[10px] border-slate-700 h-7 px-1 text-slate-200 ${transform.flipV ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-800/60'}`}>
                      <FlipVertical className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetTransform} className="text-[10px] border-slate-700 bg-slate-800/60 h-7 px-1 text-slate-200">
                      Reset
                    </Button>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Opacity</span><span className="text-slate-200">{Math.round(transform.opacity * 100)}%</span>
                    </div>
                    <Slider
                      value={[transform.opacity]}
                      min={0.1} max={1} step={0.01}
                      onValueChange={([v]) => setTransform(p => ({ ...p, opacity: v }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ══ CENTER — Preview + Controls + Timeline ══ */}
            <div className="lg:col-span-7 space-y-3">

              {/* Video Player */}
              <Card className="border-slate-800 bg-slate-900/70 overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                    style={videoStyle}
                  />

                  {/* Format badge */}
                  {activeFormatLabel && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-cyan-400 text-[10px] font-bold px-2 py-1 rounded">
                      {activeFormatLabel.toUpperCase()}
                    </div>
                  )}

                  {/* Caption overlay */}
                  {activeCaption && (
                    <div className={`absolute left-0 right-0 flex justify-center px-6 ${captionPositionClass}`}>
                      <div
                        className="max-w-[80%] text-center px-4 py-1.5 rounded-lg"
                        style={{
                          color: (activeCaption as ExtendedCaption).color ?? '#fff',
                          fontSize: `${(activeCaption as ExtendedCaption).fontSize ?? 20}px`,
                          fontWeight: (activeCaption as ExtendedCaption).fontStyle === 'bold' ? 700 : 600,
                          fontStyle: (activeCaption as ExtendedCaption).fontStyle === 'italic' ? 'italic' : 'normal',
                          textShadow: (activeCaption as ExtendedCaption).fontStyle === 'shadow'
                            ? '2px 2px 8px #000, 0 0 20px #000'
                            : '0 1px 3px rgba(0,0,0,0.8)',
                          background: (activeCaption as ExtendedCaption).bgEnabled
                            ? 'rgba(0,0,0,0.72)'
                            : 'transparent',
                          textAlign: (activeCaption as ExtendedCaption).align ?? 'center',
                        }}
                      >
                        {activeCaption.text}
                      </div>
                    </div>
                  )}

                  {/* Playback overlay controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    {/* Seek bar */}
                    <div className="relative h-1 bg-white/20 rounded-full mb-3 cursor-pointer group"
                      onMouseDown={e => {
                        setIsSeeking(true)
                        const rect = e.currentTarget.getBoundingClientRect()
                        handleSeek(((e.clientX - rect.left) / rect.width) * duration)
                      }}
                      onMouseMove={e => {
                        if (!isSeeking) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        handleSeek(Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration)))
                      }}
                      onMouseUp={() => setIsSeeking(false)}
                      onMouseLeave={() => setIsSeeking(false)}
                    >
                      {/* Caption markers */}
                      {captions.map(c => (
                        <div
                          key={c.id}
                          className="absolute top-0 bottom-0 bg-purple-500/60 rounded-full pointer-events-none"
                          style={{
                            left: `${(c.start / duration) * 100}%`,
                            width: `${((c.end - c.start) / duration) * 100}%`,
                          }}
                        />
                      ))}
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `${progressPct}%`, transform: 'translate(-50%, -50%)' }}
                      />
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center gap-3">
                      <button onClick={() => skipBy(-10)} className="text-white/70 hover:text-white transition-colors">
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition-colors"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                      </button>
                      <button onClick={() => skipBy(10)} className="text-white/70 hover:text-white transition-colors">
                        <SkipForward className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-white/60 tabular-nums">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range" min={0} max={1} step={0.01} value={volume}
                          onChange={e => handleVolumeChange([parseFloat(e.target.value)])}
                          className="w-16 accent-indigo-500"
                        />
                        <span className="text-xs text-white/50 w-8 text-right tabular-nums">
                          {Math.round(volume * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Timeline */}
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-300">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {/* Time labels */}
                  <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  {/* Video track */}
                  <div className="relative h-5 bg-slate-800 rounded">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded"
                      style={{ width: `${progressPct}%` }}
                    />
                    {/* playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-white"
                      style={{ left: `${progressPct}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[9px] text-white/60 font-semibold uppercase tracking-widest pointer-events-none">Video</span>
                  </div>

                  {/* Audio track */}
                  <div className="relative h-4 bg-slate-800 rounded">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/60 to-teal-600/60 rounded" />
                    <div className="absolute inset-0 w-px bg-white" style={{ left: `${progressPct}%` }} />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[9px] text-white/50 uppercase tracking-widest pointer-events-none">Audio</span>
                  </div>

                  {/* Captions track */}
                  <div className="relative h-4 bg-slate-800 rounded overflow-hidden">
                    <span className="absolute inset-y-0 left-2 flex items-center text-[9px] text-white/50 uppercase tracking-widest z-10 pointer-events-none">Captions</span>
                    {captions.map(c => (
                      <div
                        key={c.id}
                        title={c.text}
                        className="absolute top-0 bottom-0 bg-purple-600/50 border-x border-purple-500/70 flex items-center"
                        style={{
                          left: `${(c.start / duration) * 100}%`,
                          width: `${((c.end - c.start) / duration) * 100}%`,
                        }}
                      >
                        <span className="text-[8px] text-purple-200 px-1 truncate">{c.text}</span>
                      </div>
                    ))}
                    <div className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${progressPct}%` }} />
                  </div>

                  {/* Seekable scrubber */}
                  <input
                    type="range" min={0} max={duration} step={0.05} value={currentTime}
                    onChange={e => handleSeek(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1"
                  />
                </CardContent>
              </Card>
            </div>

            {/* ══ RIGHT SIDEBAR — Filters + Audio + Captions ══ */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="filters" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/60 rounded-xl mb-3">
                  <TabsTrigger value="filters" className="text-xs rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Filters</TabsTrigger>
                  <TabsTrigger value="audio" className="text-xs rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Audio</TabsTrigger>
                  <TabsTrigger value="captions" className="text-xs rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Captions</TabsTrigger>
                </TabsList>

                {/* ── Filters Tab ── */}
                <TabsContent value="filters">
                  <Card className="border-slate-800 bg-slate-900/70">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2 text-white">
                          <Sun className="w-4 h-4" /> Filters
                        </CardTitle>
                        <Button size="sm" variant="ghost" onClick={resetFilters} className="text-xs text-slate-400 hover:text-white h-6 px-2">
                          <RotateCcw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <FilterSlider label="Brightness" value={filters.brightness} min={0} max={2} displayValue={filters.brightness.toFixed(2)} onChange={([v]) => updateFilter('brightness', v)} />
                      <FilterSlider label="Contrast" value={filters.contrast} min={0} max={2} displayValue={filters.contrast.toFixed(2)} onChange={([v]) => updateFilter('contrast', v)} />
                      <FilterSlider label="Saturation" value={filters.saturation} min={0} max={2} displayValue={filters.saturation.toFixed(2)} onChange={([v]) => updateFilter('saturation', v)} />
                      <FilterSlider label="Hue Rotate" value={filters.hue} min={0} max={360} step={1} displayValue={`${filters.hue}°`} onChange={([v]) => updateFilter('hue', v)} />
                      <FilterSlider label="Blur" value={filters.blur} min={0} max={20} step={0.5} displayValue={`${filters.blur}px`} onChange={([v]) => updateFilter('blur', v)} />
                      <FilterSlider label="Sepia" value={filters.sepia} min={0} max={100} step={1} displayValue={`${filters.sepia}%`} onChange={([v]) => updateFilter('sepia', v)} />
                      <FilterSlider label="Grayscale" value={filters.grayscale} min={0} max={1} displayValue={`${Math.round(filters.grayscale * 100)}%`} onChange={([v]) => updateFilter('grayscale', v)} />
                      <FilterSlider label="Invert" value={filters.invert} min={0} max={100} step={1} displayValue={`${filters.invert}%`} onChange={([v]) => updateFilter('invert', v)} />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Audio Tab ── */}
                <TabsContent value="audio">
                  <Card className="border-slate-800 bg-slate-900/70">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2 text-white">
                        <Music className="w-4 h-4" /> Audio
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">Mute All Audio</Label>
                        <Switch checked={isMuted} onCheckedChange={checked => { setIsMuted(checked); if (videoRef.current) videoRef.current.muted = checked }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">Loop Video</Label>
                        <Switch checked={isLooping} onCheckedChange={() => toggleLoop()} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Master Volume</span><span className="text-slate-200">{Math.round(volume * 100)}%</span>
                        </div>
                        <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={handleVolumeChange} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Fade In</span><span className="text-slate-200">{fadeIn}s</span>
                        </div>
                        <Slider value={[fadeIn]} min={0} max={10} step={0.5} onValueChange={([v]) => setFadeIn(v)} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Fade Out</span><span className="text-slate-200">{fadeOut}s</span>
                        </div>
                        <Slider value={[fadeOut]} min={0} max={10} step={0.5} onValueChange={([v]) => setFadeOut(v)} />
                      </div>
                      <p className="text-xs text-slate-500">Audio fade & volume are applied on export.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Captions Tab ── */}
                <TabsContent value="captions">
                  <Card className="border-slate-800 bg-slate-900/70">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2 text-white">
                        <Type className="w-4 h-4" /> Captions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">

                      {/* Text */}
                      <div>
                        <Label className="text-xs text-slate-300 mb-1 block">Caption Text</Label>
                        <Textarea
                          value={newCaptionText}
                          onChange={e => setNewCaptionText(e.target.value)}
                          placeholder="Enter caption..."
                          className="bg-slate-800/60 border-slate-700 text-sm resize-none min-h-[56px] text-slate-200"
                        />
                      </div>

                      {/* Times */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-300 mb-1 block">Start (s)</Label>
                          <Input type="number" value={newCaptionStart} min={0} max={duration} step={0.1}
                            onChange={e => setNewCaptionStart(parseFloat(e.target.value) || 0)}
                            className="bg-slate-800/60 border-slate-700 text-xs h-8 text-slate-200" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-300 mb-1 block">End (s)</Label>
                          <Input type="number" value={newCaptionEnd} min={0} max={duration} step={0.1}
                            onChange={e => setNewCaptionEnd(parseFloat(e.target.value) || 0)}
                            className="bg-slate-800/60 border-slate-700 text-xs h-8 text-slate-200" />
                        </div>
                      </div>

                      <Button size="sm" variant="outline"
                        onClick={setTimestampsAtPlayhead}
                        className="w-full border-slate-700 text-xs text-slate-300 hover:text-white h-7">
                        📍 Use Playhead Time
                      </Button>

                      {/* Position */}
                      <div>
                        <Label className="text-xs text-slate-300 mb-1.5 block">Position</Label>
                        <div className="flex gap-1.5">
                          {(['top', 'center', 'bottom'] as const).map(p => (
                            <Button
                              key={p}
                              size="sm"
                              variant={newCaptionPosition === p ? 'default' : 'outline'}
                              onClick={() => setNewCaptionPosition(p)}
                              className={`flex-1 text-xs h-7 ${newCaptionPosition === p ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-800/60 text-slate-300'}`}
                            >
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Font style */}
                      <div>
                        <Label className="text-xs text-slate-300 mb-1.5 block">Style</Label>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['normal', 'bold', 'italic', 'shadow'] as const).map(s => (
                            <Button
                              key={s}
                              size="sm"
                              variant={newCaptionFontStyle === s ? 'default' : 'outline'}
                              onClick={() => setNewCaptionFontStyle(s)}
                              className={`text-xs h-7 px-2 ${newCaptionFontStyle === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-800/60 text-slate-300'}`}
                            >
                              {s === 'bold' ? <Bold className="w-3 h-3" /> : s === 'italic' ? <Italic className="w-3 h-3" /> : s.charAt(0).toUpperCase() + s.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Align */}
                      <div>
                        <Label className="text-xs text-slate-300 mb-1.5 block">Align</Label>
                        <div className="flex gap-1.5">
                          {(['left', 'center', 'right'] as const).map(a => (
                            <Button
                              key={a}
                              size="sm"
                              variant={newCaptionAlign === a ? 'default' : 'outline'}
                              onClick={() => setNewCaptionAlign(a)}
                              className={`flex-1 text-xs h-7 ${newCaptionAlign === a ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-800/60 text-slate-300'}`}
                            >
                              {a === 'left' ? <AlignLeft className="w-3 h-3" /> : a === 'center' ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Color */}
                      <div>
                        <Label className="text-xs text-slate-300 mb-1.5 block">Text Color</Label>
                        <div className="flex gap-2">
                          {CAPTION_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => setNewCaptionColor(c)}
                              className={`w-5 h-5 rounded-full border-2 transition-all ${newCaptionColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                              style={{ background: c, boxShadow: c === '#000000' ? 'inset 0 0 0 1px #555' : undefined }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Font size */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Font Size</span><span className="text-slate-200">{newCaptionFontSize}px</span>
                        </div>
                        <Slider value={[newCaptionFontSize]} min={12} max={56} step={1}
                          onValueChange={([v]) => setNewCaptionFontSize(v)} />
                      </div>

                      {/* Background toggle */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">Background Box</Label>
                        <Switch checked={newCaptionBg} onCheckedChange={setNewCaptionBg} />
                      </div>

                      <Button onClick={handleAddCaption} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                        <Plus className="w-4 h-4 mr-1" /> Add Caption
                      </Button>

                      {/* Caption list */}
                      {captions.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-300">Captions ({captions.length})</Label>
                            <Button size="sm" variant="ghost" onClick={clearAllCaptions}
                              className="text-xs text-slate-500 hover:text-red-400 h-6 px-2">
                              <Trash2 className="w-3 h-3 mr-1" /> Clear All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                            {(captions as ExtendedCaption[]).map(cap => (
                              <div
                                key={cap.id}
                                className={`p-2.5 bg-slate-800/70 rounded-lg border transition-colors ${currentTime >= cap.start && currentTime <= cap.end
                                  ? 'border-indigo-500/60'
                                  : 'border-slate-700'
                                  }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium leading-snug truncate" style={{ color: cap.color ?? '#fff' }}>
                                      {cap.text}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {formatTime(cap.start)} → {formatTime(cap.end)} · {cap.position}
                                    </p>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeCaption(cap.id)}
                                    className="w-5 h-5 text-slate-500 hover:text-red-400 flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

          </div>
        )}
      </div>

      {/* ── Export Modal ── */}
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