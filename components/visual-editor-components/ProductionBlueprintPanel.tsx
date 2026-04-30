'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AudioLines,
  Captions,
  Check,
  Copy,
  Download,
  Film,
  Layers3,
  Maximize2,
  Mic2,
  Music,
  Palette,
  Plus,
  RotateCcw,
  Scissors,
  Sparkles,
  Split,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  useEditorStore,
  type ClipEffects,
  type ColorGrading,
  type TimelineTrack,
} from '@/lib/editor-store';

type EffectPreset = {
  id: string;
  label: string;
  effects: Partial<ClipEffects>;
  color?: Partial<ColorGrading>;
};

type CaptionStyle = 'creator' | 'podcast' | 'minimal';

const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: 'clean',
    label: 'Clean Social',
    effects: { brightness: 6, contrast: 8, saturation: 12, sharpen: 18 },
    color: { temperature: 4, tint: 0 },
  },
  {
    id: 'cinema',
    label: 'Cinematic',
    effects: { brightness: -4, contrast: 18, saturation: -8, sharpen: 10 },
    color: { temperature: -8, tint: 4, lift: { r: -0.08, g: -0.06, b: 0.02 }, gain: { r: 0.06, g: 0.04, b: 0.1 } },
  },
  {
    id: 'vivid',
    label: 'Vivid Hook',
    effects: { brightness: 8, contrast: 14, saturation: 24, sharpen: 25 },
    color: { temperature: 6, tint: -2 },
  },
  {
    id: 'soft',
    label: 'Soft Podcast',
    effects: { brightness: 4, contrast: -6, saturation: -4, sharpen: 4 },
    color: { temperature: 8, tint: 2 },
  },
];

const ASPECT_PRESETS = [
  { id: 'youtube', label: 'YouTube', size: '1920x1080', badge: '16:9' },
  { id: 'shorts', label: 'Shorts', size: '1080x1920', badge: '9:16' },
  { id: 'square', label: 'Square', size: '1080x1080', badge: '1:1' },
  { id: 'podcast', label: 'Podcast', size: '1280x720', badge: 'HD' },
];

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSelectedClips(tracks: TimelineTrack[], ids: string[]) {
  const idSet = new Set(ids);
  return tracks.flatMap((track) => track.clips.filter((clip) => idSet.has(clip.id)));
}

function getTrackForClip(tracks: TimelineTrack[], clipId: string) {
  return tracks.find((track) => track.clips.some((clip) => clip.id === clipId));
}

function splitCaptionText(text: string) {
  return text
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger';
}) {
  const toneClass =
    tone === 'primary'
      ? 'border-[#fa6a00]/50 bg-[#fa6a00] text-white hover:bg-[#e84d00]'
      : tone === 'danger'
        ? 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15'
        : 'border-[#2a1a08] bg-[#1a100a] text-[#c07040] hover:bg-[#fa6a00]/10 hover:text-[#fa6a00]';

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={`h-9 justify-start gap-2 rounded-xl px-3 text-[11px] font-semibold ${toneClass}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#2a1a08] bg-[#1a100a]/70 px-3 py-2">
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[#8a6a45]">{label}</div>
    </div>
  );
}

const ProductionBlueprintPanel = () => {
  const [captionText, setCaptionText] = useState('Hook line\nMain idea\nCall to action');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('creator');
  const [clipGap, setClipGap] = useState(0);
  const [projectTitle, setProjectTitle] = useState('Untitled edit');

  const tracks = useEditorStore((s) => s.tracks);
  const mediaFiles = useEditorStore((s) => s.mediaFiles);
  const selectedClipIds = useEditorStore((s) => s.selectedClipIds);
  const currentTime = useEditorStore((s) => s.currentTime);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const addTrack = useEditorStore((s) => s.addTrack);
  const splitClip = useEditorStore((s) => s.splitClip);
  const duplicateClip = useEditorStore((s) => s.duplicateClip);
  const rippleDelete = useEditorStore((s) => s.rippleDelete);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const recalculateDuration = useEditorStore((s) => s.recalculateDuration);
  const addTextOverlayToStore = useEditorStore((s) => s.addTextOverlay);
  const updateClipEffects = useEditorStore((s) => s.updateClipEffects);
  const updateClipColorGrading = useEditorStore((s) => s.updateClipColorGrading);
  const resetClipEffects = useEditorStore((s) => s.resetClipEffects);
  const fitZoomToContent = useEditorStore((s) => s.fitZoomToContent);
  const getMediaFile = useEditorStore((s) => s.getMediaFile);
  const selectedClips = useMemo(
    () => getSelectedClips(tracks, selectedClipIds),
    [tracks, selectedClipIds],
  );
  const selectedClip = selectedClips[0] ?? null;
  const selectedMedia = selectedClip ? getMediaFile(selectedClip.mediaId) : undefined;
  const clipCount = useMemo(() => tracks.reduce((sum, track) => sum + track.clips.length, 0), [tracks]);
  const videoCount = useMemo(() => mediaFiles.filter((media) => media.type === 'video').length, [mediaFiles]);
  const audioCount = useMemo(() => mediaFiles.filter((media) => media.type === 'audio').length, [mediaFiles]);
  const imageCount = useMemo(() => mediaFiles.filter((media) => media.type === 'image').length, [mediaFiles]);

  const splitAtPlayhead = useCallback(() => {
    if (!selectedClips.length) return;
    selectedClips.forEach((clip) => splitClip(clip.id, currentTime));
    toast.success('Split selected clip at playhead');
  }, [currentTime, selectedClips, splitClip]);

  const duplicateSelected = useCallback(() => {
    if (!selectedClip) return;
    duplicateClip(selectedClip.id);
    toast.success('Duplicated selected clip');
  }, [duplicateClip, selectedClip]);

  const rippleDeleteSelected = useCallback(() => {
    if (!selectedClip) return;
    rippleDelete(selectedClip.id);
    toast.success('Ripple deleted selected clip');
  }, [rippleDelete, selectedClip]);

  const closeTrackGaps = useCallback(() => {
    pushHistory('Close timeline gaps');
    useEditorStore.setState((state) => ({
      tracks: state.tracks.map((track, trackIndex) => {
        let cursor = 0;
        const clips = [...track.clips]
          .sort((a, b) => a.startTime - b.startTime)
          .map((clip) => {
            const updated = { ...clip, trackIndex, startTime: cursor };
            cursor += clip.duration + clipGap;
            return updated;
          });
        return { ...track, clips };
      }),
    }));
    recalculateDuration();
    toast.success('Closed timeline gaps');
  }, [clipGap, pushHistory, recalculateDuration]);

  const addTextOverlay = useCallback(
    (variant: 'title' | 'lower' | 'badge') => {
      const baseStart = selectedClip?.startTime ?? currentTime;
      const baseDuration = selectedClip?.duration ?? 4;
      const common = {
        startTime: baseStart,
        duration: Math.min(baseDuration, 6),
        trackIndex: selectedClip?.trackIndex ?? 0,
        fontFamily: 'Inter',
        shadow: true,
        shadowColor: '#000000',
        shadowBlur: 8,
        outline: false,
        outlineColor: '#000000',
        outlineWidth: 0,
        lineHeight: 1.1,
        letterSpacing: 0,
        maxWidth: 720,
        rotation: 0,
      };

      if (variant === 'title') {
        addTextOverlayToStore({
          ...common,
          text: projectTitle || 'Main title',
          x: 0.5,
          y: 0.18,
          fontSize: 44,
          fontWeight: '900',
          color: '#ffffff',
          backgroundColor: '#000000',
          backgroundOpacity: 0,
          textAlign: 'center',
          animation: 'slideUp',
          animationDuration: 0.45,
        });
      } else if (variant === 'lower') {
        addTextOverlayToStore({
          ...common,
          text: selectedMedia?.name.replace(/\.[^.]+$/, '') || 'Speaker name',
          x: 0.5,
          y: 0.78,
          fontSize: 24,
          fontWeight: '700',
          color: '#ffffff',
          backgroundColor: '#111827',
          backgroundOpacity: 0.85,
          textAlign: 'center',
          animation: 'fadeIn',
          animationDuration: 0.35,
        });
      } else {
        addTextOverlayToStore({
          ...common,
          text: 'NEW',
          x: 0.82,
          y: 0.14,
          fontSize: 18,
          fontWeight: '800',
          color: '#0f172a',
          backgroundColor: '#5eead4',
          backgroundOpacity: 1,
          textAlign: 'center',
          animation: 'bounce',
          animationDuration: 0.55,
        });
      }

      toast.success('Added text overlay');
    },
    [addTextOverlayToStore, currentTime, projectTitle, selectedClip, selectedMedia],
  );

  const addCaptions = useCallback(() => {
    const lines = splitCaptionText(captionText);
    if (!lines.length) return;

    const start = selectedClip?.startTime ?? currentTime;
    const total = selectedClip?.duration ?? Math.max(6, lines.length * 1.8);
    const perLine = Math.max(1.2, total / lines.length);

    lines.forEach((line, index) => {
      const isCreator = captionStyle === 'creator';
      const isPodcast = captionStyle === 'podcast';
      addTextOverlayToStore({
        text: line,
        startTime: start + index * perLine,
        duration: Math.min(perLine + 0.15, total - index * perLine),
        trackIndex: selectedClip?.trackIndex ?? 0,
        x: 0.5,
        y: isPodcast ? 0.84 : 0.76,
        fontSize: isCreator ? 34 : isPodcast ? 26 : 22,
        fontFamily: 'Inter',
        fontWeight: isCreator ? '900' : '700',
        color: '#ffffff',
        backgroundColor: isCreator ? '#111827' : '#000000',
        backgroundOpacity: isCreator ? 0.8 : isPodcast ? 0.55 : 0,
        textAlign: 'center',
        animation: isCreator ? 'typewriter' : 'fadeIn',
        animationDuration: 0.25,
        shadow: true,
        shadowColor: '#000000',
        shadowBlur: 8,
        outline: isCreator,
        outlineColor: '#000000',
        outlineWidth: isCreator ? 2 : 0,
        lineHeight: 1.1,
        letterSpacing: 0,
        maxWidth: 820,
        rotation: 0,
      });
    });

    toast.success(`Added ${lines.length} caption overlay${lines.length === 1 ? '' : 's'}`);
  }, [addTextOverlayToStore, captionStyle, captionText, currentTime, selectedClip]);

  const applyPreset = useCallback(
    (preset: EffectPreset) => {
      if (!selectedClips.length) return;
      selectedClips.forEach((clip) => {
        updateClipEffects(clip.id, preset.effects);
        if (preset.color) {
          updateClipColorGrading(clip.id, preset.color);
        }
      });
      toast.success(`Applied ${preset.label}`);
    },
    [selectedClips, updateClipColorGrading, updateClipEffects],
  );

  const applyAudioPreset = useCallback(
    (mode: 'voice' | 'music' | 'mute') => {
      if (!selectedClips.length) return;
      selectedClips.forEach((clip) => {
        if (mode === 'voice') {
          updateClipEffects(clip.id, { volume: 1.25, fadeInDuration: 0.08, fadeOutDuration: 0.12 });
        } else if (mode === 'music') {
          updateClipEffects(clip.id, { volume: 0.42, fadeInDuration: 0.35, fadeOutDuration: 0.5 });
        } else {
          updateClipEffects(clip.id, { volume: 0 });
        }
      });
      toast.success('Updated selected clip audio');
    },
    [selectedClips, updateClipEffects],
  );

  const resetSelected = useCallback(() => {
    if (!selectedClips.length) return;
    selectedClips.forEach((clip) => resetClipEffects(clip.id));
    toast.success('Reset selected clip effects');
  }, [resetClipEffects, selectedClips]);

  const selectTrackClips = useCallback(() => {
    if (!selectedClip) return;
    const track = getTrackForClip(tracks, selectedClip.id);
    if (!track) return;
    useEditorStore.setState({ selectedClipIds: track.clips.map((clip) => clip.id) });
    toast.success('Selected all clips on this track');
  }, [selectedClip, tracks]);

  const openExport = useCallback((presetId?: string) => {
    if (presetId) {
      toast.info(`Export dialog opened for ${presetId}`);
    }
    window.dispatchEvent(new CustomEvent('editor:export'));
  }, []);

  const canEdit = selectedClips.length > 0;

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#2a2118] bg-[#13100c]/80 text-white shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
    >
      <div className="border-b border-[#2a2118] bg-[#1a0e05]/80 px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-0 bg-[#fa6a00]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#fa6a00]">
                Clip Tools
              </Badge>
              <Badge className="rounded-full border border-[#2a1a08] bg-[#1a100a] px-2 py-0.5 text-[10px] text-[#8a6a45]">
                {selectedClips.length ? `${selectedClips.length} selected` : 'Select a clip to edit'}
              </Badge>
            </div>
            <Input
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
              className="mt-2 h-8 max-w-xl rounded-xl border-[#2a1a08] bg-[#1a100a] text-sm font-bold text-white focus-visible:border-[#fa6a00]"
              aria-label="Project title"
            />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:w-[440px]">
            <Stat label="Assets" value={mediaFiles.length} />
            <Stat label="Clips" value={clipCount} />
            <Stat label="Tracks" value={tracks.length} />
            <Stat label="Length" value={formatTime(totalDuration)} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="build" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-[#2a2118] px-2 py-2 sm:px-3">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-[#1a100a] p-1 lg:grid-cols-6">
            <TabsTrigger value="build" className="h-8 text-[11px]"><Layers3 className="mr-1 h-3.5 w-3.5" />Arrange</TabsTrigger>
            <TabsTrigger value="edit" className="h-8 text-[11px]"><Scissors className="mr-1 h-3.5 w-3.5" />Edit</TabsTrigger>
            <TabsTrigger value="text" className="h-8 text-[11px]"><Captions className="mr-1 h-3.5 w-3.5" />Text</TabsTrigger>
            <TabsTrigger value="look" className="h-8 text-[11px]"><Palette className="mr-1 h-3.5 w-3.5" />Look</TabsTrigger>
            <TabsTrigger value="audio" className="h-8 text-[11px]"><AudioLines className="mr-1 h-3.5 w-3.5" />Audio</TabsTrigger>
            <TabsTrigger value="export" className="h-8 text-[11px]"><Download className="mr-1 h-3.5 w-3.5" />Export</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="build" className="m-0 space-y-4 p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="Video" value={videoCount} />
              <Stat label="Audio" value={audioCount} />
              <Stat label="Images" value={imageCount} />
            </div>

            <div className="rounded-2xl border border-[#2a2118] bg-[#1a100a]/60 p-3">
              <div className="text-xs font-bold text-white">Assets live in Media Browser</div>
              <div className="mt-1 text-[11px] leading-5 text-[#8a6a45]">
                Use the left Media Browser to import and drag assets. This panel stays focused on arranging, cutting, captions, effects, and export.
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ActionButton icon={<Plus className="h-4 w-4" />} label="Add Video Track" onClick={() => addTrack('video')} />
              <ActionButton icon={<Plus className="h-4 w-4" />} label="Add Audio Track" onClick={() => addTrack('audio')} />
              <ActionButton icon={<Layers3 className="h-4 w-4" />} label="Select Track Clips" onClick={selectTrackClips} disabled={!selectedClip} />
              <ActionButton icon={<Maximize2 className="h-4 w-4" />} label="Fit Timeline" onClick={fitZoomToContent} />
            </div>
          </TabsContent>

          <TabsContent value="edit" className="m-0 space-y-4 p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionButton icon={<Split className="h-4 w-4" />} label="Split at Playhead" onClick={splitAtPlayhead} disabled={!canEdit} tone="primary" />
              <ActionButton icon={<Copy className="h-4 w-4" />} label="Duplicate Clip" onClick={duplicateSelected} disabled={!selectedClip} />
              <ActionButton icon={<Trash2 className="h-4 w-4" />} label="Ripple Delete" onClick={rippleDeleteSelected} disabled={!selectedClip} tone="danger" />
              <ActionButton icon={<Wand2 className="h-4 w-4" />} label="Close Gaps" onClick={closeTrackGaps} disabled={!clipCount} />
            </div>

            <div className="rounded-2xl border border-[#2a2118] bg-[#1a100a]/60 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-[#8a6a45]">
                <span>Gap between clips</span>
                <span className="font-mono text-[#fa6a00]">{clipGap.toFixed(1)}s</span>
              </div>
              <Slider value={[clipGap]} min={0} max={2} step={0.1} onValueChange={([value]) => setClipGap(value)} />
            </div>

            <div className="rounded-2xl border border-[#2a2118] bg-[#1a100a]/60 p-3">
              <div className="mb-2 text-xs font-bold text-white">Selection</div>
              <div className="grid gap-2 text-[11px] text-[#8a6a45] sm:grid-cols-2">
                <div>Selected clips: <span className="text-white">{selectedClips.length}</span></div>
                <div>Current media: <span className="text-white">{selectedMedia?.name ?? 'None'}</span></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="text" className="m-0 space-y-4 p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <ActionButton icon={<Film className="h-4 w-4" />} label="Add Title" onClick={() => addTextOverlay('title')} tone="primary" />
              <ActionButton icon={<Mic2 className="h-4 w-4" />} label="Lower Third" onClick={() => addTextOverlay('lower')} />
              <ActionButton icon={<Sparkles className="h-4 w-4" />} label="Hook Badge" onClick={() => addTextOverlay('badge')} />
            </div>

            <Textarea
              value={captionText}
              onChange={(event) => setCaptionText(event.target.value)}
              className="min-h-24 rounded-2xl border-[#2a1a08] bg-[#1a100a] text-xs text-white focus-visible:border-[#fa6a00]"
              placeholder="Paste caption lines here..."
            />

            <div className="grid gap-2 sm:grid-cols-3">
              {(['creator', 'podcast', 'minimal'] as CaptionStyle[]).map((style) => (
                <Button
                  key={style}
                  variant="outline"
                  onClick={() => setCaptionStyle(style)}
                  className={`h-9 rounded-xl text-[11px] ${
                    captionStyle === style ? 'border-[#fa6a00]/40 bg-[#fa6a00]/15 text-[#fa6a00]' : 'border-[#2a1a08] bg-[#1a100a] text-[#c07040]'
                  }`}
                >
                  {captionStyle === style && <Check className="mr-1 h-3.5 w-3.5" />}
                  {style}
                </Button>
              ))}
            </div>

            <ActionButton icon={<Captions className="h-4 w-4" />} label="Create Caption Overlays" onClick={addCaptions} tone="primary" />
          </TabsContent>

          <TabsContent value="look" className="m-0 space-y-4 p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {EFFECT_PRESETS.map((preset) => (
                <ActionButton
                  key={preset.id}
                  icon={<Palette className="h-4 w-4" />}
                  label={preset.label}
                  onClick={() => applyPreset(preset)}
                  disabled={!canEdit}
                />
              ))}
            </div>
            <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Reset Selected Effects" onClick={resetSelected} disabled={!canEdit} />
          </TabsContent>

          <TabsContent value="audio" className="m-0 space-y-4 p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <ActionButton icon={<Mic2 className="h-4 w-4" />} label="Voice Enhance" onClick={() => applyAudioPreset('voice')} disabled={!canEdit} />
              <ActionButton icon={<Music className="h-4 w-4" />} label="Music Bed" onClick={() => applyAudioPreset('music')} disabled={!canEdit} />
              <ActionButton icon={<AudioLines className="h-4 w-4" />} label="Mute Clip" onClick={() => applyAudioPreset('mute')} disabled={!canEdit} />
            </div>
            <div className="rounded-2xl border border-[#2a2118] bg-[#1a100a]/60 p-3 text-[11px] leading-5 text-[#8a6a45]">
              Applies real timeline audio values now: volume and fades.
            </div>
          </TabsContent>

          <TabsContent value="export" className="m-0 space-y-4 p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {ASPECT_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  onClick={() => openExport(preset.label)}
                  className="h-auto justify-between rounded-xl border-[#2a1a08] bg-[#1a100a] px-3 py-3 text-left hover:bg-[#fa6a00]/10"
                >
                  <span>
                    <span className="block text-xs font-bold text-white">{preset.label}</span>
                    <span className="text-[10px] text-[#8a6a45]">{preset.size}</span>
                  </span>
                  <Badge className="rounded-full border border-[#2a1a08] bg-[#0d0905] text-[10px] text-[#c07040]">{preset.badge}</Badge>
                </Button>
              ))}
            </div>
            <ActionButton icon={<Download className="h-4 w-4" />} label="Open Export Settings" onClick={() => openExport()} disabled={!clipCount} tone="primary" />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </section>
  );
};

export default memo(ProductionBlueprintPanel);
