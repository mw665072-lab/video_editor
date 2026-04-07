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
import { useEditorStore, Caption, EditorFilters } from '@/store/editorStore'
import { VideoUpload } from '@/components/VideoUpload'
import { exportVisualVideo, getVisualExportStatus, downloadVisualExportedVideo } from '@/lib/api'
import { toast } from 'sonner'
import {
  Play, Pause, Volume2, VolumeX, Sun, Contrast, Droplets, Type,
  Download, Upload, RotateCcw, Trash2, Plus, Save, Scissors,
  FlipHorizontal, FlipVertical, ZoomIn, ZoomOut, SkipBack, SkipForward,
  Music, Film, Layers, Sliders, Crop, ChevronDown, ChevronUp,
  Wand2, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Keyframe {
  id: string
  time: number
  property: string
  value: number
}

interface Track {
  id: string
  type: 'video' | 'audio' | 'text'
  label: string
  clips: TrackClip[]
  volume: number
  muted: boolean
}

interface TrackClip {
  id: string
  start: number
  end: number
  label: string
  color: string
}

interface LUT {
  name: string
  filters: Partial<VideoFilters>
}

interface VideoFilters {
  brightness: number
  contrast: number
  saturation: number
  temperature: number
  tint: number
  highlights: number
  shadows: number
  vignette: number
  sharpen: number
  noise: number
}

interface CaptionStyle {
  position: 'top' | 'center' | 'bottom'
  style: 'default' | 'bold' | 'outline' | 'highlight' | 'neon'
  color: string
  fontSize: number
  text: string
  start: number
  end: number
  id: string
}

interface Transform {
  x: number; y: number
  scaleX: number; scaleY: number
  rotation: number; opacity: number
  skewX: number; skewY: number
  flipH: boolean; flipV: boolean
  cropTop: number; cropBottom: number; cropLeft: number; cropRight: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_FILTERS: VideoFilters = {
  brightness: 100, contrast: 100, saturation: 100,
  temperature: 0, tint: 0, highlights: 0, shadows: 0,
  vignette: 0, sharpen: 0, noise: 0,
}

const DEFAULT_TRANSFORM: Transform = {
  x: 0, y: 0, scaleX: 100, scaleY: 100,
  rotation: 0, opacity: 100, skewX: 0, skewY: 0,
  flipH: false, flipV: false,
  cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
}

const LUTS: LUT[] = [
  { name: 'Cinema',        filters: { contrast: 115, saturation: 85 } },
  { name: 'Warm',          filters: { temperature: 40, brightness: 105 } },
  { name: 'Cool',          filters: { temperature: -40, saturation: 90 } },
  { name: 'Vintage',       filters: { saturation: 70, contrast: 110 } },
  { name: 'B&W',           filters: { saturation: 0 } },
  { name: 'Teal & Orange', filters: { temperature: 20, saturation: 120 } },
  { name: 'Matte',         filters: { contrast: 90, brightness: 105, saturation: 80 } },
  { name: 'Bleach',        filters: { contrast: 130, saturation: 60 } },
  { name: 'Kodak',         filters: { temperature: 15, saturation: 110, brightness: 102 } },
  { name: 'Fuji',          filters: { temperature: -10, saturation: 115 } },
  { name: 'Pastel',        filters: { saturation: 60, brightness: 110 } },
  { name: 'Neon',          filters: { saturation: 180, contrast: 120 } },
]

const CAPTION_COLORS = [
  '#ffffff', '#ffff00', '#ff4466', '#00d4aa',
  '#6c63ff', '#ffaa00', '#00aaff', '#ff00aa', '#000000',
]

const TRANSITIONS = ['Fade', 'Dissolve', 'Wipe', 'Zoom', 'Slide', 'Spin']
const MOTIONS     = ['Bounce', 'Slide In', 'Fade In', 'Zoom In', 'Typewriter', 'Shake']
const EQ_BANDS    = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function FilterRow({
  label, min, max, value, step = 1,
  onChange, displayFn,
}: {
  label: string; min: number; max: number; value: number; step?: number
  onChange: (v: number) => void; displayFn?: (v: number) => string
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-24 text-[11px] text-slate-400 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-violet-500"
      />
      <span className="w-10 text-right text-[11px] font-mono text-slate-400">
        {displayFn ? displayFn(value) : value}
      </span>
    </div>
  )
}

function SectionPanel({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-800">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hover:text-slate-200"
      >
        {title}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function VisualEditor() {
  const {
    videoUrl, currentTime, duration, isPlaying, filters: storeFilters,
    captions: storeCaptions, setVideoUrl, setCurrentTime, setDuration,
    setIsPlaying, setFilters, resetFilters, addCaption, updateCaption,
    removeCaption, exportConfig, reset,
  } = useEditorStore()

  const videoRef        = useRef<HTMLVideoElement>(null)
  const overlayRef      = useRef<HTMLCanvasElement>(null)
  const scopeRef        = useRef<HTMLCanvasElement>(null)
  const curveRef        = useRef<HTMLCanvasElement>(null)
  const scopeFrameRef   = useRef<number>(0)
  const fileInputRef    = useRef<HTMLInputElement>(null)

  // ── Local state ──────────────────────────────────────────────────────────
  const [videoSource, setVideoSource]     = useState<Blob | string | null>(null)
  const [isMuted, setIsMuted]             = useState(false)
  const [volume, setVolumeState]          = useState(0.8)
  const [playbackSpeed, setPlaybackSpeedState] = useState(1)
  const [isExporting, setIsExporting]     = useState(false)
  const [exportOpen, setExportOpen]       = useState(false)
  const [activeLUT, setActiveLUT]         = useState<string | null>(null)
  const [timelineZoom, setTimelineZoom]   = useState(1)
  const [activeTool, setActiveTool]       = useState<'select' | 'cut' | 'text' | 'pan'>('select')

  const [videoFilters, setVideoFilters]   = useState<VideoFilters>(DEFAULT_FILTERS)
  const [transform, setTransform]         = useState<Transform>(DEFAULT_TRANSFORM)
  const [tracks, setTracks]               = useState<Track[]>([
    { id: 'v1', type: 'video', label: 'Video 1', clips: [], volume: 100, muted: false },
    { id: 'a1', type: 'audio', label: 'Audio 1', clips: [], volume: 100, muted: false },
    { id: 't1', type: 'text',  label: 'Captions', clips: [], volume: 100, muted: false },
  ])
  const [keyframes, setKeyframes]         = useState<Keyframe[]>([])
  const [animCurve, setAnimCurve]         = useState('ease')

  // Caption form
  const [capText, setCapText]             = useState('')
  const [capStart, setCapStart]           = useState(0)
  const [capEnd, setCapEnd]               = useState(3)
  const [capPos, setCapPos]               = useState<CaptionStyle['position']>('bottom')
  const [capStyle, setCapStyle]           = useState<CaptionStyle['style']>('default')
  const [capColor, setCapColor]           = useState('#ffffff')
  const [capFontSize, setCapFontSize]     = useState(22)
  const [richCaptions, setRichCaptions]   = useState<CaptionStyle[]>([])
  const [activeCaption, setActiveCaption] = useState<CaptionStyle | null>(null)

  // Export settings
  const [expFormat, setExpFormat]   = useState('MP4')
  const [expQuality, setExpQuality] = useState('1080p')
  const [expFps, setExpFps]         = useState('30')
  const [expCodec, setExpCodec]     = useState('H.264')
  const [expBitrate, setExpBitrate] = useState('Auto')
  const [expAudio, setExpAudio]     = useState('AAC 320k')

  // ── Video CSS filter string ───────────────────────────────────────────────
  const buildFilterString = useCallback((f: VideoFilters) => {
    let s = `brightness(${f.brightness / 100}) contrast(${f.contrast / 100}) saturate(${f.saturation / 100})`
    if (f.temperature > 0) s += ` sepia(${f.temperature / 200})`
    return s
  }, [])

  const buildTransformString = useCallback((t: Transform) => {
    const hf = t.flipH ? -1 : 1
    const vf = t.flipV ? -1 : 1
    return `translate(${t.x}px,${t.y}px) scale(${hf * t.scaleX / 100},${vf * t.scaleY / 100}) rotate(${t.rotation}deg) skew(${t.skewX}deg,${t.skewY}deg)`
  }, [])

  const videoStyle: React.CSSProperties = {
    filter:    buildFilterString(videoFilters),
    transform: buildTransformString(transform),
    opacity:   transform.opacity / 100,
  }

  // ── Vignette canvas ───────────────────────────────────────────────────────
  const renderVignette = useCallback(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const v = videoFilters.vignette / 100
    if (v > 0) {
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7,
      )
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, `rgba(0,0,0,${v * 0.85})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [videoFilters.vignette])

  useEffect(() => { renderVignette() }, [renderVignette])

  // ── Audio scope animation ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = scopeRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      ctx.fillStyle = 'rgba(17,17,24,0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#00d4aa'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < canvas.width; i++) {
        const y = canvas.height / 2 + (isPlaying ? Math.sin(Date.now() * 0.01 + i * 0.2) * 12 * (0.3 + 0.7 * Math.random()) : 0)
        i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y)
      }
      ctx.stroke()
      scopeFrameRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(scopeFrameRef.current)
  }, [isPlaying])

  // ── Bezier curve canvas ──────────────────────────────────────────────────
  const drawCurve = useCallback(() => {
    const canvas = curveRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#6c63ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= canvas.width; i++) {
      const t = i / canvas.width
      const y = canvas.height - Math.pow(t, 0.5) * canvas.height
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y)
    }
    ctx.stroke()
    keyframes.forEach(kf => {
      const x = (kf.time / Math.max(duration, 1)) * canvas.width
      ctx.fillStyle = '#ffaa00'
      ctx.beginPath()
      ctx.arc(x, canvas.height / 2, 4, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [keyframes, duration])

  useEffect(() => { drawCurve() }, [drawCurve])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowLeft' && videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 5)
      if (e.code === 'ArrowRight' && videoRef.current) videoRef.current.currentTime = Math.min(duration, currentTime + 5)
      if (e.code === 'KeyM') toggleMute()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentTime, duration])

  // ── Video events ──────────────────────────────────────────────────────────
  const handleVideoLoaded = useCallback((source: Blob | string, dur: number, fileName?: string) => {
    setVideoSource(source)
    const url = typeof source === 'string' ? source : URL.createObjectURL(source)
    setVideoUrl(url)
    setDuration(dur)
    setTracks(prev => prev.map(t => {
      if (t.id === 'v1') return { ...t, clips: [{ id: 'c1', start: 0, end: dur, label: fileName || 'Video', color: '#6c63ff' }] }
      if (t.id === 'a1') return { ...t, clips: [{ id: 'c2', start: 0, end: dur, label: 'Audio', color: '#00d4aa' }] }
      return t
    }))
    toast.success('Video loaded')
  }, [setVideoUrl, setDuration])

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
    const active = richCaptions.find(c => videoRef.current!.currentTime >= c.start && videoRef.current!.currentTime <= c.end) ?? null
    setActiveCaption(active)
  }, [setCurrentTime, richCaptions])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }, [setDuration])

  const handleSeekClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = pct * duration
  }, [duration])

  // ── Playback ──────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause()
  }, [])

  const skip = useCallback((sec: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + sec))
  }, [currentTime, duration])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    const next = !isMuted
    videoRef.current.muted = next
    setIsMuted(next)
  }, [isMuted])

  const handleVolume = useCallback((v: number) => {
    setVolumeState(v)
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; setIsMuted(v === 0) }
  }, [])

  const handleSpeed = useCallback((v: number) => {
    setPlaybackSpeedState(v)
    if (videoRef.current) videoRef.current.playbackRate = v
  }, [])

  // ── Filters ───────────────────────────────────────────────────────────────
  const updateFilter = useCallback((key: keyof VideoFilters, value: number) => {
    setVideoFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const applyLUT = useCallback((lut: LUT) => {
    setActiveLUT(lut.name)
    setVideoFilters(prev => ({ ...DEFAULT_FILTERS, ...lut.filters }))
  }, [])

  const handleResetFilters = useCallback(() => {
    setVideoFilters(DEFAULT_FILTERS)
    setActiveLUT(null)
  }, [])

  // ── Transform ─────────────────────────────────────────────────────────────
  const updateTransform = useCallback((key: keyof Transform, value: number | boolean) => {
    setTransform(prev => ({ ...prev, [key]: value }))
  }, [])

  const rotate90 = useCallback(() => updateTransform('rotation', (transform.rotation + 90) % 360), [transform.rotation, updateTransform])

  // ── Captions ──────────────────────────────────────────────────────────────
  const handleAddCaption = useCallback(() => {
    if (!capText.trim()) { toast.error('Enter caption text'); return }
    if (capStart >= capEnd) { toast.error('Start must be before end'); return }
    const cap: CaptionStyle = {
      id: 'cap' + Date.now(), text: capText, start: capStart, end: capEnd,
      pos: capPos, style: capStyle, color: capColor, fontSize: capFontSize,
    }
    setRichCaptions(prev => [...prev, cap])
    setTracks(prev => prev.map(t => t.id === 't1'
      ? { ...t, clips: [...t.clips, { id: cap.id, start: capStart, end: capEnd, label: capText, color: '#8844ff' }] }
      : t
    ))
    setCapText(''); setCapStart(currentTime); setCapEnd(currentTime + 3)
    toast.success('Caption added')
  }, [capText, capStart, capEnd, capPos, capStyle, capColor, capFontSize, currentTime])

  const handleRemoveCaption = useCallback((id: string) => {
    setRichCaptions(prev => prev.filter(c => c.id !== id))
    setTracks(prev => prev.map(t => ({ ...t, clips: t.clips.filter(c => c.id !== id) })))
  }, [])

  const autoCaptions = useCallback(() => {
    toast.info('Auto-caption requires Whisper AI backend — showing demo')
    setRichCaptions(prev => [...prev,
      { id: 'ac1', text: 'Auto-generated caption demo', start: 0, end: 3, pos: 'bottom', style: 'default', color: '#fff', fontSize: 22 },
      { id: 'ac2', text: 'Connect Whisper AI for real transcription', start: 3, end: 7, pos: 'bottom', style: 'default', color: '#00d4aa', fontSize: 22 },
    ])
  }, [])

  const getCaptionStyle = (cap: CaptionStyle): React.CSSProperties => {
    const base: React.CSSProperties = { color: cap.color, fontSize: cap.fontSize, fontWeight: cap.style === 'bold' ? 700 : 600, display: 'inline-block', padding: '4px 12px', borderRadius: 4 }
    if (cap.style === 'outline') base.textShadow = '-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000'
    if (cap.style === 'highlight') base.background = 'rgba(0,0,0,0.75)'
    if (cap.style === 'neon') base.textShadow = `0 0 8px ${cap.color},0 0 20px ${cap.color}`
    return base
  }

  // ── Keyframes ─────────────────────────────────────────────────────────────
  const addKeyframe = useCallback(() => {
    setKeyframes(prev => [...prev, { id: 'kf' + Date.now(), time: currentTime, property: 'opacity', value: 100 }])
    toast.success('Keyframe added at ' + fmt(currentTime))
  }, [currentTime])

  // ── Timeline helpers ──────────────────────────────────────────────────────
  const addTrack = useCallback((type: Track['type']) => {
    setTracks(prev => [...prev, { id: type + Date.now(), type, label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${prev.length + 1}`, clips: [], volume: 100, muted: false }])
  }, [])

  const trackColor = (type: Track['type']) => ({ video: '#6c63ff', audio: '#00d4aa', text: '#8844ff' }[type])

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!videoUrl) { toast.error('No video loaded'); return }
    setIsExporting(true); setExportOpen(false)
    toast.info('Starting export...')
    try {
      const { jobId } = await exportVisualVideo({
        videoSource: videoUrl,
        filters: { brightness: videoFilters.brightness / 100, contrast: videoFilters.contrast / 100, saturation: videoFilters.saturation / 100 },
        audio: { volume, muted: isMuted },
        captions: richCaptions.map(({ id, ...c }) => c),
        exportSettings: { format: expFormat, quality: expQuality, fps: expFps, codec: expCodec },
      })
      let status = await getVisualExportStatus(jobId)
      while (status.status === 'pending' || status.status === 'running') {
        toast.info(`Export ${status.progress}% — ${status.step}`)
        await new Promise(r => setTimeout(r, 2000))
        status = await getVisualExportStatus(jobId)
      }
      if (status.status === 'failed') throw new Error(status.error || 'Export failed')
      if (status.status === 'done' && status.downloadUrl) {
        const blob = await downloadVisualExportedVideo(status.downloadUrl)
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a'); a.href = url; a.download = `export-${Date.now()}.mp4`
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
        toast.success('Export downloaded!')
      }
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally { setIsExporting(false) }
  }, [videoUrl, videoFilters, volume, isMuted, richCaptions, expFormat, expQuality, expFps, expCodec])

  const handleClear = useCallback(() => {
    if (videoUrl?.startsWith('blob:')) URL.revokeObjectURL(videoUrl)
    reset(); setVideoSource(null); setIsMuted(false); setVolumeState(0.8)
    setVideoFilters(DEFAULT_FILTERS); setTransform(DEFAULT_TRANSFORM)
    setRichCaptions([]); setKeyframes([]); setActiveLUT(null)
    setTracks([
      { id: 'v1', type: 'video', label: 'Video 1', clips: [], volume: 100, muted: false },
      { id: 'a1', type: 'audio', label: 'Audio 1', clips: [], volume: 100, muted: false },
      { id: 't1', type: 'text',  label: 'Captions', clips: [], volume: 100, muted: false },
    ])
    toast.success('Editor cleared')
  }, [videoUrl, reset])

  const seekPct = duration ? (currentTime / duration) * 100 : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 h-11 bg-[#111118] border-b border-white/[0.07] shrink-0 flex-wrap">
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (!f) return; handleVideoLoaded(f, 0, f.name) }} />
        <button onClick={() => fileInputRef.current?.click()} className="tb-btn text-xs px-3 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-1">
          <Upload className="w-3 h-3" /> Import
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        {(['select','cut','text','pan'] as const).map(t => (
          <button key={t} onClick={() => setActiveTool(t)}
            className={`text-xs px-3 py-1 rounded border capitalize flex items-center gap-1 ${activeTool === t ? 'bg-violet-600 border-violet-600' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
            {t === 'select' && <Film className="w-3 h-3" />}
            {t === 'cut' && <Scissors className="w-3 h-3" />}
            {t === 'text' && <Type className="w-3 h-3" />}
            {t}
          </button>
        ))}
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button className="text-xs px-3 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10">↩ Undo</button>
        <button className="text-xs px-3 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10">↪ Redo</button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button onClick={() => setTimelineZoom(z => Math.max(0.5, z - 0.5))} className="text-xs px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10">−</button>
        <span className="text-xs text-slate-400">{timelineZoom}x</span>
        <button onClick={() => setTimelineZoom(z => Math.min(4, z + 0.5))} className="text-xs px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10">+</button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <select value={playbackSpeed} onChange={e => handleSpeed(parseFloat(e.target.value))}
          className="bg-[#18181f] text-white border border-white/10 rounded text-xs px-2 py-1">
          {[0.25, 0.5, 1, 1.5, 2].map(s => <option key={s} value={s}>{s}x</option>)}
        </select>
        <div className="flex-1" />
        {videoUrl && (
          <>
            <button onClick={handleClear} className="text-xs px-3 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
            <button onClick={() => setExportOpen(true)} disabled={isExporting}
              className="text-xs px-4 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1 font-medium">
              <Download className="w-3 h-3" /> {isExporting ? 'Exporting…' : 'Export'}
            </button>
          </>
        )}
      </div>

      {!videoUrl ? (
        /* ── Upload screen ── */
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center">
              <Film className="w-10 h-10 opacity-40" />
            </div>
            <p className="text-lg">Drop a video or click to import</p>
            <VideoUpload
              onVideoLoaded={handleVideoLoaded}
              onDurationResolved={(dur, title) => { setDuration(dur); if (title) toast.success(`Loaded: ${title}`) }}
            />
          </div>
        </div>
      ) : (
        /* ── Editor layout ── */
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left panel ── */}
          <div className="w-60 shrink-0 bg-[#111118] border-r border-white/[0.07] flex flex-col overflow-y-auto">
            <Tabs defaultValue="media" className="flex flex-col flex-1">
              <TabsList className="grid grid-cols-3 m-2 bg-white/5">
                <TabsTrigger value="media" className="text-[11px]">Media</TabsTrigger>
                <TabsTrigger value="effects" className="text-[11px]">Effects</TabsTrigger>
                <TabsTrigger value="audiomix" className="text-[11px]">Audio</TabsTrigger>
              </TabsList>

              <TabsContent value="media" className="px-3 space-y-2">
                <div className="rounded border border-white/10 bg-white/5 p-2 text-xs text-slate-300 flex items-center gap-2">
                  <Film className="w-4 h-4 text-violet-400 shrink-0" /> {videoUrl.split('/').pop()?.slice(0, 28) || 'Video'}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="w-full text-xs py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10">+ Add Media</button>
              </TabsContent>

              <TabsContent value="effects" className="px-3 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Transitions</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TRANSITIONS.map(t => (
                      <button key={t} onClick={() => toast.info(`Transition: ${t}`)}
                        className="bg-white/5 border border-white/10 rounded text-[11px] py-2 text-slate-300 hover:border-violet-500">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Motion</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MOTIONS.map(m => (
                      <button key={m} onClick={() => toast.info(`Motion: ${m}`)}
                        className="bg-white/5 border border-white/10 rounded text-[10px] px-2 py-1 text-slate-300 hover:border-teal-400">
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audiomix" className="px-3 space-y-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Mixer</p>
                {['Main', 'Music', 'SFX', 'VO'].map(ch => (
                  <div key={ch} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-8">{ch}</span>
                    <input type="range" min={0} max={100} defaultValue={80} className="flex-1 h-1 accent-teal-400" />
                    <span className="text-[10px] text-slate-500">M</span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">EQ</p>
                <div className="flex items-end gap-1 h-16">
                  {EQ_BANDS.map(b => (
                    <div key={b} className="flex flex-col items-center gap-0.5 flex-1">
                      <input type="range" min={-12} max={12} defaultValue={0}
                        style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '44px', WebkitAppearance: 'slider-vertical' } as any}
                        className="accent-violet-500" />
                      <span className="text-[7px] text-slate-500">{b}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">Scope</p>
                <canvas ref={scopeRef} width={200} height={50} className="w-full rounded border border-white/10 bg-[#0a0a0f]" />
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Centre: preview + timeline ── */}
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Preview */}
            <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden" style={{ minHeight: 0 }}>
              <video ref={videoRef} src={videoUrl} style={videoStyle}
                onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                className="max-w-full max-h-full object-contain" playsInline />

              {/* Caption overlay */}
              {activeCaption && (
                <div className={`absolute left-0 right-0 px-4 text-center pointer-events-none z-10 ${
                  activeCaption.pos === 'top' ? 'top-2' : activeCaption.pos === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-2'}`}>
                  <span style={getCaptionStyle(activeCaption)}>{activeCaption.text}</span>
                </div>
              )}

              {/* Vignette */}
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            </div>

            {/* Controls bar */}
            <div className="h-13 bg-black/80 border-t border-white/[0.07] flex items-center gap-3 px-4 shrink-0">
              <button onClick={() => skip(-10)} className="text-slate-400 hover:text-white">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                {isPlaying ? <Pause className="w-4 h-4 text-black" /> : <Play className="w-4 h-4 text-black fill-black" />}
              </button>
              <button onClick={() => skip(10)} className="text-slate-400 hover:text-white">
                <SkipForward className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs text-slate-400 shrink-0">{fmt(currentTime)} / {fmt(duration)}</span>
              <div className="flex-1 relative h-1.5 bg-white/15 rounded cursor-pointer" onClick={handleSeekClick}>
                <div className="absolute top-0 left-0 h-full bg-violet-500 rounded" style={{ width: `${seekPct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2" style={{ left: `${seekPct}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-slate-400 hover:text-white">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={e => handleVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 accent-white" />
              </div>
            </div>

            {/* Status bar */}
            <div className="h-5 bg-[#111118] border-t border-white/[0.07] flex items-center gap-4 px-3 text-[10px] text-slate-500 shrink-0">
              <span>FPS: 30</span>
              <span>Duration: {fmt(duration)}</span>
              <span>Tool: {activeTool}</span>
              <span className="ml-auto">Zoom: {timelineZoom}x</span>
            </div>

            {/* Timeline */}
            <div className="h-44 bg-[#111118] border-t border-white/[0.07] flex flex-col shrink-0">
              <div className="flex items-center gap-2 px-3 h-8 border-b border-white/[0.07]">
                {(['video', 'audio', 'text'] as const).map(t => (
                  <button key={t} onClick={() => addTrack(t)}
                    className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 capitalize">
                    + {t}
                  </button>
                ))}
              </div>
              {/* Ruler */}
              <div className="flex h-4 border-b border-white/[0.07]">
                <div className="w-20 shrink-0 border-r border-white/[0.07]" />
                <div className="flex-1 relative overflow-hidden">
                  {Array.from({ length: Math.ceil(duration / 5) + 1 }, (_, i) => i * 5).map(t => {
                    const pct = duration ? (t / duration) * 100 : 0
                    if (pct > 100) return null
                    return (
                      <div key={t} className="absolute top-0 h-full border-l border-white/10 flex items-end pb-0.5 pl-0.5"
                        style={{ left: `${pct}%` }}>
                        <span className="text-[9px] text-slate-500">{fmt(t)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Tracks */}
              <div className="flex-1 overflow-y-auto">
                {tracks.map(track => (
                  <div key={track.id} className="flex h-9 border-b border-white/[0.05]">
                    <div className="w-20 shrink-0 border-r border-white/[0.07] px-2 flex items-center gap-1 text-[10px] text-slate-400">
                      {track.type === 'video' && <Film className="w-3 h-3" />}
                      {track.type === 'audio' && <Music className="w-3 h-3" />}
                      {track.type === 'text' && <Type className="w-3 h-3" />}
                      <span className="truncate">{track.label}</span>
                    </div>
                    <div className="flex-1 relative bg-white/[0.02] cursor-pointer" onClick={handleSeekClick}>
                      {track.clips.map(clip => {
                        const l = duration ? (clip.start / duration) * 100 : 0
                        const w = duration ? ((clip.end - clip.start) / duration) * 100 : 0
                        return (
                          <div key={clip.id} className="absolute top-1 bottom-1 rounded flex items-center px-2 text-[10px] text-white overflow-hidden"
                            style={{ left: `${l}%`, width: `${w}%`, background: clip.color, opacity: 0.75 }}>
                            {clip.label}
                          </div>
                        )
                      })}
                      {/* Playhead */}
                      <div className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none" style={{ left: `${seekPct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="w-72 shrink-0 bg-[#111118] border-l border-white/[0.07] flex flex-col overflow-y-auto">
            <Tabs defaultValue="color" className="flex flex-col flex-1">
              <TabsList className="grid grid-cols-4 m-2 bg-white/5">
                <TabsTrigger value="color" className="text-[10px]">Color</TabsTrigger>
                <TabsTrigger value="captions" className="text-[10px]">Text</TabsTrigger>
                <TabsTrigger value="transform" className="text-[10px]">Xform</TabsTrigger>
                <TabsTrigger value="keyframes" className="text-[10px]">Keys</TabsTrigger>
              </TabsList>

              {/* ── Color tab ── */}
              <TabsContent value="color" className="overflow-y-auto">
                <SectionPanel title="Color Grading">
                  {(Object.keys(DEFAULT_FILTERS) as (keyof VideoFilters)[]).map(key => {
                    const cfg: Record<keyof VideoFilters, { min: number; max: number; label: string }> = {
                      brightness:  { min: 0,    max: 200, label: 'Brightness' },
                      contrast:    { min: 0,    max: 200, label: 'Contrast' },
                      saturation:  { min: 0,    max: 200, label: 'Saturation' },
                      temperature: { min: -100, max: 100, label: 'Temperature' },
                      tint:        { min: -100, max: 100, label: 'Tint' },
                      highlights:  { min: -100, max: 100, label: 'Highlights' },
                      shadows:     { min: -100, max: 100, label: 'Shadows' },
                      vignette:    { min: 0,    max: 100, label: 'Vignette' },
                      sharpen:     { min: 0,    max: 100, label: 'Sharpen' },
                      noise:       { min: 0,    max: 100, label: 'Noise' },
                    }
                    const c = cfg[key]
                    return (
                      <FilterRow key={key} label={c.label} min={c.min} max={c.max} value={videoFilters[key]}
                        onChange={v => updateFilter(key, v)}
                        displayFn={v => ['temperature','tint','highlights','shadows'].includes(key) ? String(v) : (v/100).toFixed(2)} />
                    )
                  })}
                  <button onClick={handleResetFilters} className="w-full text-xs py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 mt-1 flex items-center justify-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Reset Filters
                  </button>
                </SectionPanel>
                <SectionPanel title="LUT Presets">
                  <div className="grid grid-cols-3 gap-1.5">
                    {LUTS.map(lut => (
                      <button key={lut.name} onClick={() => applyLUT(lut)}
                        className={`text-[10px] py-2 rounded border ${activeLUT === lut.name ? 'border-violet-500 text-violet-300' : 'border-white/10 text-slate-400 hover:border-violet-500/50'} bg-white/5`}>
                        {lut.name}
                      </button>
                    ))}
                  </div>
                </SectionPanel>
              </TabsContent>

              {/* ── Captions tab ── */}
              <TabsContent value="captions" className="px-3 pb-3 space-y-3 overflow-y-auto">
                <div className="flex gap-2 mt-1">
                  <button onClick={autoCaptions} className="flex-1 text-xs py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1">
                    <Wand2 className="w-3 h-3" /> Auto Caption
                  </button>
                  <button onClick={() => toast.info('SRT import coming soon')} className="text-xs px-3 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10">
                    SRT
                  </button>
                </div>

                {/* Existing captions */}
                {richCaptions.map(c => (
                  <div key={c.id} className="bg-white/5 border border-white/10 rounded p-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{c.text}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{fmt(c.start)} – {fmt(c.end)} · {c.pos}</p>
                    </div>
                    <button onClick={() => handleRemoveCaption(c.id)} className="text-slate-500 hover:text-red-400 shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add form */}
                <div className="space-y-2 border-t border-white/10 pt-2">
                  <label className="text-[10px] text-slate-400">Text</label>
                  <textarea value={capText} onChange={e => setCapText(e.target.value)} rows={2}
                    placeholder="Caption text…"
                    className="w-full bg-[#18181f] border border-white/10 rounded text-xs text-white p-2 resize-none focus:outline-none focus:border-violet-500" />
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] text-slate-400">Start (s)</label>
                      <input type="number" value={capStart} onChange={e => setCapStart(parseFloat(e.target.value)||0)} step={0.1} min={0}
                        className="w-full bg-[#18181f] border border-white/10 rounded text-xs text-white px-2 py-1.5 mt-0.5 focus:outline-none focus:border-violet-500" /></div>
                    <div><label className="text-[10px] text-slate-400">End (s)</label>
                      <input type="number" value={capEnd} onChange={e => setCapEnd(parseFloat(e.target.value)||0)} step={0.1} min={0}
                        className="w-full bg-[#18181f] border border-white/10 rounded text-xs text-white px-2 py-1.5 mt-0.5 focus:outline-none focus:border-violet-500" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] text-slate-400">Position</label>
                      <select value={capPos} onChange={e => setCapPos(e.target.value as any)}
                        className="w-full bg-[#18181f] border border-white/10 rounded text-xs text-white px-2 py-1.5 mt-0.5 focus:outline-none">
                        <option value="bottom">Bottom</option><option value="center">Center</option><option value="top">Top</option>
                      </select></div>
                    <div><label className="text-[10px] text-slate-400">Style</label>
                      <select value={capStyle} onChange={e => setCapStyle(e.target.value as any)}
                        className="w-full bg-[#18181f] border border-white/10 rounded text-xs text-white px-2 py-1.5 mt-0.5 focus:outline-none">
                        <option value="default">Default</option><option value="bold">Bold</option><option value="outline">Outline</option>
                        <option value="highlight">Highlight</option><option value="neon">Neon</option>
                      </select></div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Font Size: {capFontSize}px</label>
                    <input type="range" min={12} max={64} value={capFontSize} onChange={e => setCapFontSize(parseInt(e.target.value))}
                      className="w-full h-1 mt-1 accent-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Color</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {CAPTION_COLORS.map(c => (
                        <div key={c} onClick={() => setCapColor(c)}
                          className={`w-5 h-5 rounded-full cursor-pointer border-2 ${capColor === c ? 'border-white' : 'border-transparent'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={handleAddCaption}
                    className="w-full text-xs py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1">
                    <Plus className="w-3 h-3" /> Add Caption
                  </button>
                </div>
              </TabsContent>

              {/* ── Transform tab ── */}
              <TabsContent value="transform" className="px-3 pb-3 space-y-3 overflow-y-auto">
                <SectionPanel title="Position & Scale">
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['x', 'Position X'],['y', 'Position Y'],
                      ['scaleX', 'Scale X %'],['scaleY', 'Scale Y %'],
                      ['rotation', 'Rotation °'],['opacity', 'Opacity %'],
                      ['skewX', 'Skew X °'],['skewY', 'Skew Y °'],
                    ] as [keyof Transform, string][]).map(([key, label]) => (
                      <div key={key}>
                        <label className="text-[10px] text-slate-400">{label}</label>
                        <input type="number" value={transform[key] as number}
                          onChange={e => updateTransform(key, parseFloat(e.target.value)||0)}
                          className="w-full bg-[#18181f] border border-white/10 rounded text-xs text-white px-2 py-1.5 mt-0.5 text-center focus:outline-none focus:border-violet-500" />
                      </div>
                    ))}
                  </div>
                </SectionPanel>
                <SectionPanel title="Crop">
                  <div className="grid grid-cols-2 gap-2">
                    {(['cropTop','cropBottom','cropLeft','cropRight'] as const).map(k => (
                      <div key={k}><label className="text-[10px] text-slate-400 capitalize">{k.replace('crop','')}</label>
                        <input type="number" defaultValue={0}
                          className="w-full bg-[#18181f] border border-white/10 rounded text-xs text-white px-2 py-1.5 mt-0.5 text-center focus:outline-none focus:border-violet-500" /></div>
                    ))}
                  </div>
                </SectionPanel>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => updateTransform('flipH', !transform.flipH)} className="text-xs px-3 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-1">
                    <FlipHorizontal className="w-3 h-3" /> Flip H
                  </button>
                  <button onClick={() => updateTransform('flipV', !transform.flipV)} className="text-xs px-3 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-1">
                    <FlipVertical className="w-3 h-3" /> Flip V
                  </button>
                  <button onClick={rotate90} className="text-xs px-3 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10">
                    ↻ 90°
                  </button>
                  <button onClick={() => { setTransform(DEFAULT_TRANSFORM) }} className="text-xs px-3 py-1.5 rounded border border-red-800/60 bg-red-900/20 text-red-400 hover:bg-red-900/40">
                    Reset
                  </button>
                </div>
              </TabsContent>

              {/* ── Keyframes tab ── */}
              <TabsContent value="keyframes" className="px-3 pb-3 space-y-3 overflow-y-auto">
                <div className="flex gap-2 mt-1">
                  <button onClick={addKeyframe} className="flex-1 text-xs py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10">+ Add Keyframe</button>
                  <button onClick={() => setKeyframes([])} className="text-xs px-3 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10">Clear</button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {keyframes.length === 0
                    ? <p className="text-[11px] text-slate-500">No keyframes yet</p>
                    : keyframes.map(kf => (
                      <div key={kf.id} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                        {fmt(kf.time)}
                      </div>
                    ))
                  }
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Animation Curve</label>
                  <canvas ref={curveRef} width={220} height={60} className="w-full rounded border border-white/10 bg-[#0a0a0f]" />
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {['Linear','Ease','Ease In','Ease Out','Bounce'].map(c => (
                      <button key={c} onClick={() => { setAnimCurve(c); drawCurve() }}
                        className={`text-[10px] px-2 py-1 rounded border ${animCurve===c?'border-violet-500 text-violet-300':'border-white/10 text-slate-400 hover:border-violet-500/50'} bg-white/5`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {exportOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center">
          <div className="bg-[#111118] border border-white/10 rounded-xl p-6 w-80 space-y-3">
            <h2 className="text-base font-semibold">Export Settings</h2>
            {([
              ['Format',  ['MP4','WebM','MOV','GIF'],          expFormat,  setExpFormat],
              ['Quality', ['4K (2160p)','1080p','720p','480p'], expQuality, setExpQuality],
              ['FPS',     ['24','30','60'],                      expFps,     setExpFps],
              ['Codec',   ['H.264','H.265/HEVC','VP9','AV1'],   expCodec,   setExpCodec],
              ['Bitrate', ['Auto','8 Mbps','16 Mbps','24 Mbps','50 Mbps'], expBitrate, setExpBitrate],
              ['Audio',   ['AAC 320k','MP3 320k','Lossless','No Audio'],   expAudio,   setExpAudio],
            ] as [string, string[], string, (v: string) => void][]).map(([label, opts, val, setter]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16 shrink-0">{label}</span>
                <select value={val} onChange={e => setter(e.target.value)}
                  className="flex-1 bg-[#18181f] border border-white/10 rounded text-xs text-white px-2 py-1.5 focus:outline-none">
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={handleExport} className="flex-1 text-xs py-2 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium">
                Export
              </button>
              <button onClick={() => setExportOpen(false)} className="text-xs px-4 py-2 rounded border border-white/10 bg-white/5 hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}