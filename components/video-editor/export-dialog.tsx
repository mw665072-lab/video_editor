'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { trimSegment, concatSegments } from '@/lib/ffmpeg-cut';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Loader2,
  X,
  Check,
  AlertTriangle,
  Copy,
  RotateCcw,
  Square,
  Clock,
  HardDrive,
  Film,
  Music,
  MonitorPlay,
  Instagram,
  Twitter,
  Youtube,
  Settings2,
  ImageIcon,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface ExportSettings {
  format: 'mp4';
  quality: 'high' | 'medium' | 'low';
  resolution: string; // e.g. '1920x1080', '1280x720', 'custom'
  fps: number;
  audioBitrate: 128 | 192 | 256 | 320;
  includeAudio: boolean;
  preset: 'custom' | 'youtube' | 'instagram' | 'twitter';
  customWidth: number;
  customHeight: number;
}

// Types
// ============================================================

// ============================================================
// Constants
// ============================================================

const PRESET_PROFILES = {
  youtube: {
    resolution: '1920x1080',
    fps: 30,
    quality: 'high' as const,
    audioBitrate: 256 as const,
    includeAudio: true,
  },
  instagram: {
    resolution: '1080x1920',
    fps: 30,
    quality: 'high' as const,
    audioBitrate: 192 as const,
    includeAudio: true,
  },
  twitter: {
    resolution: '1280x720',
    fps: 30,
    quality: 'medium' as const,
    audioBitrate: 192 as const,
    includeAudio: true,
  },
  custom: {} as Partial<ExportSettings>,
};

const QUALITY_BITRATES = {
  high: 8_000_000,
  medium: 4_000_000,
  low: 2_000_000,
};

const AUDIO_BITRATE_VALUES = [128, 192, 256, 320] as const;

const RESOLUTION_OPTIONS = [
  { value: '1920x1080', label: '1080p', width: 1920, height: 1080 },
  { value: '1280x720', label: '720p', width: 1280, height: 720 },
  { value: '854x480', label: '480p', width: 854, height: 480 },
  { value: '1080x1920', label: '1080×1920 (9:16)', width: 1080, height: 1920 },
  { value: 'custom', label: 'Custom', width: 0, height: 0 },
];

const FPS_OPTIONS = [24, 25, 30, 50, 60];

const defaultSettings: ExportSettings = {
  format: 'mp4',
  quality: 'high',
  resolution: '1920x1080',
  fps: 30,
  audioBitrate: 256,
  includeAudio: true,
  preset: 'youtube',
  customWidth: 1920,
  customHeight: 1080,
};

// ============================================================
// Helpers
// ============================================================

function parseResolution(res: string): { width: number; height: number } {
  const [w, h] = res.split('x').map(Number);
  return { width: w || 1920, height: h || 1080 };
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function estimateFileSize(
  durationSeconds: number,
  videoBitrate: number,
  audioBitrate: number,
  includeAudio: boolean
): number {
  const totalBitrate = videoBitrate + (includeAudio ? audioBitrate : 0);
  return (totalBitrate * durationSeconds) / 8;
}

// ============================================================
// Component
// ============================================================

type ClipType = ReturnType<typeof import('@/lib/editor-store').useEditorStore.getState>['tracks'][0]['clips'][0];
type MediaType = NonNullable<ReturnType<typeof import('@/lib/editor-store').useEditorStore.getState>['getMediaFile']>;

interface VideoClipEntry {
  clip: ClipType;
  media: MediaType;
}

const ExportDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const store = useEditorStore();
  const [settings, setSettings] = useState<ExportSettings>(defaultSettings);
  const [status, setStatus] = useState<'idle' | 'preloading' | 'exporting' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [actualFileSize, setActualFileSize] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | null>(null);
  const [currentClipName, setCurrentClipName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('preset');

  // Refs for export cancellation
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // ============================================================
  // Compute derived values
  // ============================================================

  const { width: resWidth, height: resHeight } = useMemo(() => {
    if (settings.resolution === 'custom') {
      return { width: settings.customWidth, height: settings.customHeight };
    }
    return parseResolution(settings.resolution);
  }, [settings.resolution, settings.customWidth, settings.customHeight]);

  const videoBitrate = QUALITY_BITRATES[settings.quality];
  const totalDuration = store.totalDuration;
  const totalVideoFrames = Math.ceil(totalDuration * settings.fps);

  // File size estimate (memoized)
  const estFileSize = useMemo(() => {
    return estimateFileSize(
      totalDuration,
      videoBitrate,
      settings.audioBitrate * 1000,
      settings.includeAudio
    );
  }, [totalDuration, videoBitrate, settings.audioBitrate, settings.includeAudio]);

  // ============================================================
  // Preset handler
  // ============================================================

  const applyPreset = useCallback((preset: 'custom' | 'youtube' | 'instagram' | 'twitter') => {
    const profile = PRESET_PROFILES[preset];
    setSettings((prev) => ({
      ...prev,
      preset,
      ...(preset !== 'custom' ? {
        resolution: profile.resolution,
        fps: profile.fps,
        quality: profile.quality,
        audioBitrate: profile.audioBitrate,
        includeAudio: profile.includeAudio,
      } : {}),
    }));
  }, []);

  // ============================================================
  // Collect all clips
  // ============================================================

  // ============================================================
  // Collect all clips
  // ============================================================

  const collectVideoClips = useCallback(() => {
    const videoClips: VideoClipEntry[] = [];
    for (const track of store.tracks) {
      if (track.type !== 'video' || track.muted) continue;
      for (const clip of track.clips) {
        const media = store.getMediaFile(clip.mediaId);
        if (media && media.type === 'video') {
          videoClips.push({ clip, media });
        }
      }
    }
    videoClips.sort((a, b) => a.clip.startTime - b.clip.startTime);
    return videoClips;
  }, [store]);

  // ============================================================
  // Timer for elapsed / remaining
  // ============================================================

  // ============================================================
  // Timer for elapsed / remaining
  // ============================================================

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setElapsedTime(elapsed);
    }, 200);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ============================================================
  // Export
  // ============================================================

  const handleExport = useCallback(async () => {
    if (status === 'exporting') return;

    const videoClips = collectVideoClips();
    
    if (videoClips.length === 0) {
      setStatus('error');
      setErrorMessage('No video clips found on the timeline. Add at least one video clip to export.');
      store.setIsExporting(false);
      return;
    }

    setStatus('exporting');
    setProgress(0);
    setDownloadUrl(null);
    setErrorMessage('');
    cancelRef.current = false;
    store.setIsExporting(true);
    startTimer();

    try {
      const segmentBlobs: Blob[] = [];
      const totalSteps = videoClips.length + 1; // Progress weights

      for (let i = 0; i < videoClips.length; i++) {
        if (cancelRef.current) break;

        const { clip, media } = videoClips[i];
        setCurrentClipName(`Processing: ${media.name}`);
        
        // Progress: each clip is a step
        const stepStartProgress = (i / totalSteps) * 100;
        const stepWeight = (1 / totalSteps) * 100;

        const clipBlob = await trimSegment(
          media.file,
          clip.trimStart,
          clip.duration,
          i,
          resWidth,
          resHeight,
          settings.fps,
          (clipProgress) => {
            setProgress(Math.round(stepStartProgress + (clipProgress * stepWeight / 100)));
          }
        );

        segmentBlobs.push(clipBlob);
      }

      if (cancelRef.current) {
        throw new Error('Export cancelled');
      }

      // Concatenation phase
      setCurrentClipName('Merging segments...');
      const concatStartProgress = (videoClips.length / totalSteps) * 100;
      const concatWeight = (1 / totalSteps) * 100;

      const finalBlob = await concatSegments(
        segmentBlobs,
        (catProgress) => {
          setProgress(Math.round(concatStartProgress + (catProgress * concatWeight / 100)));
        }
      );

      const url = URL.createObjectURL(finalBlob);
      setDownloadUrl(url);
      
      if (finalBlob.size > 0) {
        setActualFileSize(finalBlob.size);
      } else {
        console.warn('Exported blob size is 0');
      }

      setStatus('done');
      setProgress(100);
      store.setIsExporting(false);
      stopTimer();

    } catch (err) {
      console.error('Export error:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Export failed');
      store.setIsExporting(false);
      stopTimer();
    }
  }, [collectVideoClips, startTimer, stopTimer, store, status]);


  // ============================================================
  // Cancel export
  // ============================================================

  const handleCancel = useCallback(() => {
    cancelRef.current = true;

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    stopTimer();
    setStatus('idle');
    setProgress(0);
    setElapsedTime(0);
    setEstimatedRemaining(null);
    store.setIsExporting(false);
  }, [stopTimer, store]);

  // ============================================================
  // Download
  // ============================================================

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `export_${Date.now()}.mp4`;
    a.click();
  }, [downloadUrl]);

  // ============================================================
  // Export Again (keeps settings)
  // ============================================================

  const handleExportAgain = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus('idle');
    setProgress(0);
    setElapsedTime(0);
    setEstimatedRemaining(null);
    setCurrentClipName('');
  }, [downloadUrl]);

  // ============================================================
  // Copy Settings
  // ============================================================

  const handleCopySettings = useCallback(() => {
    const settingsText = [
      `Preset: ${settings.preset}`,
      `Resolution: ${settings.resolution === 'custom' ? `${settings.customWidth}x${settings.customHeight}` : settings.resolution}`,
      `FPS: ${settings.fps}`,
      `Quality: ${settings.quality} (${QUALITY_BITRATES[settings.quality] / 1_000_000} Mbps)`,
      `Audio: ${settings.includeAudio ? `${settings.audioBitrate} kbps` : 'Disabled'}`,
    ].join('\n');

    navigator.clipboard.writeText(settingsText).catch(() => {
      // Clipboard API might not be available
    });
  }, [settings]);

  // ============================================================
  // Close / Reset
  // ============================================================

  const handleClose = useCallback(() => {
    if (status === 'exporting') {
      handleCancel();
    }
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl(null);
    setElapsedTime(0);
    setEstimatedRemaining(null);
    setCurrentClipName('');
    setErrorMessage('');
    setActiveTab('preset');
    onClose();
  }, [downloadUrl, onClose, status, handleCancel]);

  // ============================================================
  // Listen for export events
  // ============================================================

  useEffect(() => {
    const handler = () => {
      setStatus('idle');
      setProgress(0);
      setDownloadUrl(null);
      setElapsedTime(0);
      setEstimatedRemaining(null);
      setActiveTab('preset');
    };
    window.addEventListener('editor:export', handler);
    return () => window.removeEventListener('editor:export', handler);
  }, []);

  // ============================================================
  // Preset icon helper
  // ============================================================

  const presetIcon = (preset: string) => {
    switch (preset) {
      case 'youtube': return <Youtube className="w-3.5 h-3.5" />;
      case 'instagram': return <Instagram className="w-3.5 h-3.5" />;
      case 'twitter': return <Twitter className="w-3.5 h-3.5" />;
      default: return <Settings2 className="w-3.5 h-3.5" />;
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-50">
            <Download className="w-4 h-4 text-emerald-400" />
            Export Video
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Configure export settings and render your video
          </DialogDescription>
        </DialogHeader>

        {/* =================== IDLE: Settings =================== */}
        {status === 'idle' && (
          <div className="space-y-5 py-1">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-zinc-800 border border-zinc-700 w-full grid grid-cols-4">
                <TabsTrigger value="preset" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
                  <Settings2 className="w-3 h-3 mr-1" />
                  Presets
                </TabsTrigger>
                <TabsTrigger value="video" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
                  <Film className="w-3 h-3 mr-1" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="audio" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
                  <Music className="w-3 h-3 mr-1" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="info" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
                  <HardDrive className="w-3 h-3 mr-1" />
                  Info
                </TabsTrigger>
              </TabsList>

              {/* ---- Preset Tab ---- */}
              <TabsContent value="preset" className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PRESET_PROFILES) as Array<keyof typeof PRESET_PROFILES>).map((key) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all hover:bg-zinc-800 ${
                        settings.preset === key
                          ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                          : 'border-zinc-700 bg-zinc-800/50'
                      }`}
                    >
                      {presetIcon(key)}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-100 capitalize">{key}</p>
                        {key !== 'custom' && (
                          <p className="text-[10px] text-zinc-500 truncate">
                            {PRESET_PROFILES[key].resolution} · {PRESET_PROFILES[key].fps}fps · {PRESET_PROFILES[key].quality}
                          </p>
                        )}
                        {key === 'custom' && (
                          <p className="text-[10px] text-zinc-500">All options available</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {/* ---- Video Tab ---- */}
              <TabsContent value="video" className="mt-3 space-y-4">
                {/* Resolution */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Resolution</Label>
                  <Select
                    value={settings.resolution}
                    onValueChange={(v) => {
                      setSettings((prev) => ({ ...prev, resolution: v, preset: 'custom' }));
                      if (v !== 'custom') {
                        const res = RESOLUTION_OPTIONS.find((r) => r.value === v);
                        if (res) {
                          setSettings((prev) => ({ ...prev, customWidth: res.width, customHeight: res.height }));
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {RESOLUTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-zinc-100">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom dimensions */}
                {settings.resolution === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">Width (px)</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[settings.customWidth]}
                          min={320}
                          max={3840}
                          step={2}
                          onValueChange={([v]) => setSettings((p) => ({ ...p, customWidth: v }))}
                          className="flex-1"
                        />
                        <span className="text-xs text-zinc-400 w-12 text-right">{settings.customWidth}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">Height (px)</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[settings.customHeight]}
                          min={240}
                          max={2160}
                          step={2}
                          onValueChange={([v]) => setSettings((p) => ({ ...p, customHeight: v }))}
                          className="flex-1"
                        />
                        <span className="text-xs text-zinc-400 w-12 text-right">{settings.customHeight}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* FPS */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Frame Rate</Label>
                  <Select
                    value={String(settings.fps)}
                    onValueChange={(v) => setSettings((p) => ({ ...p, fps: Number(v), preset: 'custom' }))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {FPS_OPTIONS.map((f) => (
                        <SelectItem key={f} value={String(f)} className="text-zinc-100">
                          {f} FPS
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quality */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Video Quality</Label>
                  <Select
                    value={settings.quality}
                    onValueChange={(v) => setSettings((p) => ({ ...p, quality: v as ExportSettings['quality'], preset: 'custom' }))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="high" className="text-zinc-100">High ({QUALITY_BITRATES.high / 1_000_000} Mbps)</SelectItem>
                      <SelectItem value="medium" className="text-zinc-100">Medium ({QUALITY_BITRATES.medium / 1_000_000} Mbps)</SelectItem>
                      <SelectItem value="low" className="text-zinc-100">Low ({QUALITY_BITRATES.low / 1_000_000} Mbps)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* ---- Audio Tab ---- */}
              <TabsContent value="audio" className="mt-3 space-y-4">
                {/* Include Audio toggle */}
                <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Include Audio</p>
                      <p className="text-[10px] text-zinc-500">Export audio tracks if available</p>
                    </div>
                  </div>
                  <Button
                    variant={settings.includeAudio ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettings((p) => ({ ...p, includeAudio: !p.includeAudio }))}
                    className={
                      settings.includeAudio
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-xs px-3'
                        : 'border-zinc-600 text-zinc-400 hover:text-zinc-200 h-7 text-xs px-3'
                    }
                  >
                    {settings.includeAudio ? 'On' : 'Off'}
                  </Button>
                </div>

                {/* Audio Bitrate */}
                <div className="space-y-1.5" style={{ opacity: settings.includeAudio ? 1 : 0.4, pointerEvents: settings.includeAudio ? 'auto' : 'none' }}>
                  <Label className="text-xs text-zinc-300">Audio Bitrate</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[settings.audioBitrate]}
                      min={128}
                      max={320}
                      step={64}
                      onValueChange={([v]) => setSettings((p) => ({ ...p, audioBitrate: v as 128 | 192 | 256 | 320 }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-zinc-400 w-16 text-right">{settings.audioBitrate} kbps</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600 px-0.5">
                    <span>128 kbps</span>
                    <span>320 kbps</span>
                  </div>
                </div>
              </TabsContent>

              {/* ---- Info Tab ---- */}
              <TabsContent value="info" className="mt-3 space-y-3">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 divide-y divide-zinc-700/60">
                  <InfoRow
                    icon={<MonitorPlay className="w-3.5 h-3.5 text-zinc-500" />}
                    label="Resolution"
                    value={settings.resolution === 'custom' ? `${settings.customWidth}×${settings.customHeight}` : settings.resolution}
                  />
                  <InfoRow
                    icon={<Film className="w-3.5 h-3.5 text-zinc-500" />}
                    label="Frame Rate"
                    value={`${settings.fps} FPS`}
                  />
                  <InfoRow
                    icon={<Film className="w-3.5 h-3.5 text-zinc-500" />}
                    label="Video Bitrate"
                    value={`${QUALITY_BITRATES[settings.quality] / 1_000_000} Mbps`}
                  />
                  <InfoRow
                    icon={<Music className="w-3.5 h-3.5 text-zinc-500" />}
                    label="Audio"
                    value={settings.includeAudio ? `${settings.audioBitrate} kbps` : 'Disabled'}
                  />
                  <InfoRow
                    icon={<Clock className="w-3.5 h-3.5 text-zinc-500" />}
                    label="Duration"
                    value={formatTime(totalDuration)}
                  />
                  <InfoRow
                    icon={<Film className="w-3.5 h-3.5 text-zinc-500" />}
                    label="Total Frames"
                    value={`~${totalVideoFrames.toLocaleString()}`}
                  />
                  <InfoRow
                    icon={<HardDrive className="w-3.5 h-3.5 text-zinc-500" />}
                    label="Est. File Size"
                    value={formatFileSize(actualFileSize ?? estFileSize)}
                    highlight
                  />
                  <InfoRow
                    icon={<Settings2 className="w-3.5 h-3.5 text-zinc-500" />}
                    label="Preset"
                    value={settings.preset === 'custom' ? 'Custom' : settings.preset.charAt(0).toUpperCase() + settings.preset.slice(1)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose} className="text-zinc-400 hover:text-zinc-200">
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={status === 'preloading'}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
              >
                {status === 'preloading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Start Export
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* =================== PRELOADING =================== */}
        {status === 'preloading' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <div className="absolute -inset-2 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-200 font-medium">Preloading Video Sources</p>
                <p className="text-xs text-zinc-500 mt-1">Caching media files for smooth export...</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleCancel} className="text-zinc-400">
                Cancel
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* =================== EXPORTING =================== */}
        {status === 'exporting' && (
          <div className="py-4 space-y-5">
            {/* Progress bar with percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">Rendering...</span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 bg-zinc-800" />
            </div>

            {/* Clip Info */}
            <div className="grid grid-cols-1 gap-2">
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Current Progress</p>
                <p className="text-xs text-zinc-200 truncate" title={currentClipName}>
                  {currentClipName || 'Initializing FFmpeg...'}
                </p>
              </div>
            </div>

            {/* Time stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Elapsed
                </p>
                <p className="text-xs text-zinc-200 tabular-nums">{formatTime(elapsedTime)}</p>
              </div>
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Remaining
                </p>
                <p className="text-xs text-zinc-200 tabular-nums">
                  {estimatedRemaining !== null ? formatTime(estimatedRemaining) : 'calculating...'}
                </p>
              </div>
            </div>

            {/* Active processing indicator */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-zinc-500">Recording in progress</span>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleCancel}
                className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 gap-2"
              >
                <Square className="w-3.5 h-3.5" />
                Cancel Export
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* =================== DONE =================== */}
        {status === 'done' && downloadUrl && (
          <div className="py-2 space-y-4">
            {/* Success indicator */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center ring-2 ring-emerald-500/30">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-100 font-semibold">Export Complete!</p>
                <p className="text-xs text-zinc-500 mt-0.5">Your video has been rendered successfully</p>
              </div>
            </div>

            {/* Preview player */}
            <div className="rounded-lg overflow-hidden border border-zinc-700 bg-black">
                <video
                  src={downloadUrl}
                  controls
                  className="w-full max-h-[200px] object-contain"
                  playsInline
                  onCanPlay={(e) => {
                    const video = e.currentTarget;
                    video.play().catch(() => { /* mute error */ });
                  }}
                />
            </div>

            {/* Export summary */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Export Summary</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-zinc-400">Resolution</span>
                <span className="text-zinc-200 text-right">{settings.resolution === 'custom' ? `${settings.customWidth}×${settings.customHeight}` : settings.resolution}</span>
                <span className="text-zinc-400">Frame Rate</span>
                <span className="text-zinc-200 text-right">{settings.fps} FPS</span>
                <span className="text-zinc-400">Quality</span>
                <span className="text-zinc-200 text-right capitalize">{settings.quality}</span>
                <span className="text-zinc-400">Duration</span>
                <span className="text-zinc-200 text-right">{formatTime(totalDuration)}</span>
                <span className="text-zinc-400">{(status === 'done' && actualFileSize) ? 'Actual Size' : 'Est. Size'}</span>
                <span className="text-emerald-400 text-right">
                  {formatFileSize((status === 'done' && actualFileSize) ? actualFileSize : estFileSize)}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="ghost"
                onClick={handleCopySettings}
                className="text-zinc-400 hover:text-zinc-200 gap-1.5 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Settings
              </Button>
              <Button
                variant="ghost"
                onClick={handleExportAgain}
                className="text-zinc-400 hover:text-zinc-200 gap-1.5 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Export Again
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" onClick={handleClose} className="text-zinc-400">
                Close
              </Button>
              <Button
                onClick={handleDownload}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* =================== ERROR =================== */}
        {status === 'error' && (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center ring-2 ring-red-500/30">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-100 font-semibold">Export Failed</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  {errorMessage || 'There was an error rendering your video. Check your timeline and try again.'}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStatus('idle');
                  setErrorMessage('');
                }}
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </Button>
              <Button variant="ghost" onClick={handleClose} className="text-zinc-400">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ============================================================
// Sub-component: Info row
// ============================================================

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <span className={`text-xs ${highlight ? 'text-emerald-400 font-semibold' : 'text-zinc-200'}`}>
        {value}
      </span>
    </div>
  );
}

export default ExportDialog;
