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
  Save
} from 'lucide-react'

export function VisualEditor() {
  const {
    videoUrl,
    currentTime,
    duration,
    isPlaying,
    filters,
    captions,
    setVideoUrl,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setFilters,
    resetFilters,
    addCaption,
    updateCaption,
    removeCaption,
    exportConfig,
    reset,
  } = useEditorStore()

  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSource, setVideoSource] = useState<Blob | string | null>(null)
  const [videoSourceType, setVideoSourceType] = useState<'file' | 'direct' | 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'vimeo' | 'proxy' | 'unknown'>('unknown')
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [newCaptionText, setNewCaptionText] = useState('')
  const [newCaptionStart, setNewCaptionStart] = useState(0)
  const [newCaptionEnd, setNewCaptionEnd] = useState(5)
  const [newCaptionPosition, setNewCaptionPosition] = useState<'top' | 'center' | 'bottom'>('bottom')
  const [isExporting, setIsExporting] = useState(false)

  // Handle video loaded from upload
  const handleVideoLoaded = useCallback((source: Blob | string, duration: number, fileName?: string, sourceType?: 'file' | 'direct' | 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'vimeo' | 'proxy' | 'unknown') => {
    setVideoSource(source)
    setVideoSourceType(sourceType || 'unknown')
    
    if (typeof source === 'string') {
      setVideoUrl(source)
    } else {
      const url = URL.createObjectURL(source)
      setVideoUrl(url)
    }
    
    setDuration(duration)
    toast.success('Video loaded successfully')
  }, [setVideoUrl, setDuration])

  // Apply CSS filters to video element
  const videoFilterStyle = {
    filter: `brightness(${filters.brightness}) contrast(${filters.contrast}) saturation(${filters.saturation})`,
  }

  // Playback controls
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying, setIsPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [setCurrentTime])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }, [setDuration])

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [setCurrentTime])

  // Audio controls
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      videoRef.current.muted = newVolume === 0
      setIsMuted(newVolume === 0)
    }
  }, [])

  // Filter controls
  const handleBrightnessChange = useCallback((value: number[]) => {
    setFilters({ brightness: value[0] })
  }, [setFilters])

  const handleContrastChange = useCallback((value: number[]) => {
    setFilters({ contrast: value[0] })
  }, [setFilters])

  const handleSaturationChange = useCallback((value: number[]) => {
    setFilters({ saturation: value[0] })
  }, [setFilters])

  // Caption management
  const handleAddCaption = useCallback(() => {
    if (!newCaptionText.trim()) {
      toast.error('Please enter caption text')
      return
    }
    
    if (newCaptionStart >= newCaptionEnd) {
      toast.error('Start time must be before end time')
      return
    }
    
    addCaption({
      text: newCaptionText,
      start: newCaptionStart,
      end: newCaptionEnd,
      position: newCaptionPosition,
    })
    
    setNewCaptionText('')
    setNewCaptionStart(currentTime)
    setNewCaptionEnd(currentTime + 5)
    toast.success('Caption added')
  }, [newCaptionText, newCaptionStart, newCaptionEnd, newCaptionPosition, currentTime, addCaption])

  const handleRemoveCaption = useCallback((id: string) => {
    removeCaption(id)
    toast.success('Caption removed')
  }, [removeCaption])

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Export video with all edits
  const handleExport = useCallback(async () => {
    if (!videoUrl) {
      toast.error('No video loaded')
      return
    }

    setIsExporting(true)
    toast.info('Starting export...')

    try {
      // Prepare export configuration
      const exportData = {
        videoSource: videoUrl,
        filters: {
          brightness: filters.brightness,
          contrast: filters.contrast,
          saturation: filters.saturation,
        },
        audio: {
          volume: volume,
          muted: isMuted,
        },
        captions: captions.map(({ id, ...caption }) => caption),
      }

      // Start export job
      const { jobId } = await exportVisualVideo(exportData)
      toast.info('Export job created, processing...')

      // Poll for status
      const pollInterval = 2000
      let status = await getVisualExportStatus(jobId)

      while (status.status === 'pending' || status.status === 'running') {
        toast.info(`Export progress: ${status.progress}% - ${status.step}`)
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        status = await getVisualExportStatus(jobId)
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Export failed')
      }

      if (status.status === 'done' && status.downloadUrl) {
        toast.info('Downloading exported video...')
        
        // Download the exported video
        const blob = await downloadVisualExportedVideo(status.downloadUrl)
        const url = URL.createObjectURL(blob)
        
        // Trigger download
        const link = document.createElement('a')
        link.href = url
        link.download = `visual-export-${Date.now()}.mp4`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast.success('Video exported and downloaded successfully!')
      } else {
        throw new Error('Export completed but no download URL available')
      }
    } catch (error) {
      console.error('Export failed:', error)
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Export failed: ${message}`)
    } finally {
      setIsExporting(false)
    }
  }, [videoUrl, filters, volume, isMuted, captions])

  // Clear video and reset editor
  const handleClearVideo = useCallback(() => {
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl)
    }
    reset()
    setVideoSource(null)
    setVideoSourceType('unknown')
    setIsMuted(false)
    setVolume(1)
    toast.success('Editor cleared')
  }, [videoUrl, reset])

  // Get active caption for current time
  const getActiveCaption = useCallback(() => {
    return captions.find(c => currentTime >= c.start && currentTime <= c.end)
  }, [captions, currentTime])

  const activeCaption = getActiveCaption()

  return (
    <div className="min-h-screen  text-white p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 backdrop-blur shadow-xl backdrop-saturate-150">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Visual Video Editor</h1>
              <p className="text-slate-400 text-sm mt-1">Upload, edit, and enhance your videos with filters, audio controls, and captions</p>
            </div>
            <div className="flex gap-2">
              {videoUrl && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearVideo}
                    className="rounded-lg border-slate-600 bg-slate-800/60 text-slate-100 hover:border-slate-400 hover:bg-slate-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {!videoUrl ? (
          // Upload Step
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/70 p-8">
            <VideoUpload
              onVideoLoaded={handleVideoLoaded}
              onDurationResolved={(duration, title) => {
                setDuration(duration)
                if (title) toast.success(`Duration set: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s${title !== 'Untitled' ? ` — ${title}` : ''}`)
              }}
            />
          </div>
        ) : (
          // Editor Layout
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Editor Area */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-4">
              {/* Video Player */}
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader className="pb-3">
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Real-time preview with applied filters and captions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="w-full h-full object-contain"
                      style={videoFilterStyle}
                    />
                    
                    {/* Caption Overlay */}
                    {activeCaption && (
                      <div 
                        className={`absolute left-0 right-0 p-4 text-center text-white font-bold text-xl bg-black/50 ${
                          activeCaption.position === 'top' ? 'top-0' : 
                          activeCaption.position === 'center' ? 'top-1/2 -translate-y-1/2' : 
                          'bottom-0'
                        }`}
                      >
                        {activeCaption.text}
                      </div>
                    )}
                    
                    {/* Playback Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={togglePlay}
                          className="text-white hover:bg-white/20"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>
                        
                        <div className="flex-1">
                          <div className="text-sm text-white">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={currentTime}
                            onChange={(e) => handleSeek(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={toggleMute}
                            className="text-white hover:bg-white/20"
                          >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </Button>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
                            className="w-20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader className="pb-3">
                  <CardTitle>Timeline</CardTitle>
                  <CardDescription>Drag to seek through the video</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <div className="relative h-12 bg-slate-800 rounded-lg overflow-hidden">
                      {/* Video timeline bar */}
                      <div className="absolute inset-0 bg-slate-700">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                      
                      {/* Caption markers */}
                      {captions.map((caption) => (
                        <div
                          key={caption.id}
                          className="absolute top-0 bottom-0 bg-purple-500/30 border-x border-purple-500/50"
                          style={{
                            left: `${(caption.start / duration) * 100}%`,
                            width: `${((caption.end - caption.start) / duration) * 100}%`,
                          }}
                        >
                          <div className="text-xs text-purple-200 p-1 truncate">
                            {caption.text}
                          </div>
                        </div>
                      ))}
                      
                      {/* Playhead */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Editing Controls */}
            <div className="lg:col-span-4 xl:col-span-4 space-y-4">
              <Tabs defaultValue="filters" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="filters">Filters</TabsTrigger>
                  <TabsTrigger value="audio">Audio</TabsTrigger>
                  <TabsTrigger value="captions">Captions</TabsTrigger>
                </TabsList>
                
                {/* Filters Tab */}
                <TabsContent value="filters" className="space-y-4">
                  <Card className="border-slate-800 bg-slate-900/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sun className="w-5 h-5" />
                        Video Filters
                      </CardTitle>
                      <CardDescription>Adjust brightness, contrast, and saturation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Brightness */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="flex items-center gap-2">
                            <Sun className="w-4 h-4" />
                            Brightness
                          </Label>
                          <span className="text-sm text-slate-400">{filters.brightness.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[filters.brightness]}
                          min={0}
                          max={2}
                          step={0.01}
                          onValueChange={handleBrightnessChange}
                        />
                      </div>
                      
                      {/* Contrast */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="flex items-center gap-2">
                            <Contrast className="w-4 h-4" />
                            Contrast
                          </Label>
                          <span className="text-sm text-slate-400">{filters.contrast.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[filters.contrast]}
                          min={0}
                          max={2}
                          step={0.01}
                          onValueChange={handleContrastChange}
                        />
                      </div>
                      
                      {/* Saturation */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="flex items-center gap-2">
                            <Droplets className="w-4 h-4" />
                            Saturation
                          </Label>
                          <span className="text-sm text-slate-400">{filters.saturation.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[filters.saturation]}
                          min={0}
                          max={2}
                          step={0.01}
                          onValueChange={handleSaturationChange}
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                        className="w-full"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Filters
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Audio Tab */}
                <TabsContent value="audio" className="space-y-4">
                  <Card className="border-slate-800 bg-slate-900/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5" />
                        Audio Controls
                      </CardTitle>
                      <CardDescription>Adjust volume and mute settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Volume Control */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Volume</Label>
                          <span className="text-sm text-slate-400">{Math.round(volume * 100)}%</span>
                        </div>
                        <Slider
                          value={[volume]}
                          min={0}
                          max={1}
                          step={0.01}
                          onValueChange={handleVolumeChange}
                        />
                      </div>
                      
                      {/* Mute Toggle */}
                      <div className="flex items-center justify-between">
                        <Label>Mute Audio</Label>
                        <Switch
                          checked={isMuted}
                          onCheckedChange={toggleMute}
                        />
                      </div>
                      
                      <div className="text-sm text-slate-400">
                        <p>Audio adjustments will be applied during export.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Captions Tab */}
                <TabsContent value="captions" className="space-y-4">
                  <Card className="border-slate-800 bg-slate-900/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Type className="w-5 h-5" />
                        Captions
                      </CardTitle>
                      <CardDescription>Add and manage video captions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Add Caption Form */}
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="caption-text">Caption Text</Label>
                          <Textarea
                            id="caption-text"
                            value={newCaptionText}
                            onChange={(e) => setNewCaptionText(e.target.value)}
                            placeholder="Enter caption text..."
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="caption-start">Start Time (s)</Label>
                            <Input
                              id="caption-start"
                              type="number"
                              value={newCaptionStart}
                              onChange={(e) => setNewCaptionStart(parseFloat(e.target.value) || 0)}
                              min={0}
                              max={duration}
                              step={0.1}
                            />
                          </div>
                          <div>
                            <Label htmlFor="caption-end">End Time (s)</Label>
                            <Input
                              id="caption-end"
                              type="number"
                              value={newCaptionEnd}
                              onChange={(e) => setNewCaptionEnd(parseFloat(e.target.value) || 0)}
                              min={0}
                              max={duration}
                              step={0.1}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label>Position</Label>
                          <div className="flex gap-2 mt-1">
                            {(['top', 'center', 'bottom'] as const).map((pos) => (
                              <Button
                                key={pos}
                                variant={newCaptionPosition === pos ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setNewCaptionPosition(pos)}
                                className="flex-1"
                              >
                                {pos.charAt(0).toUpperCase() + pos.slice(1)}
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        <Button
                          onClick={handleAddCaption}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Caption
                        </Button>
                      </div>
                      
                      {/* Caption List */}
                      {captions.length > 0 && (
                        <div className="space-y-2">
                          <Label>Existing Captions</Label>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {captions.map((caption) => (
                              <div
                                key={caption.id}
                                className="p-3 bg-slate-800 rounded-lg border border-slate-700"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{caption.text}</p>
                                    <p className="text-xs text-slate-400">
                                      {formatTime(caption.start)} - {formatTime(caption.end)} • {caption.position}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveCaption(caption.id)}
                                    className="text-slate-400 hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
    </div>
  )
}
