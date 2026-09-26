'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AudioLines,
  Captions,
  Check,
  ChevronDown,
  Copy,
  Download,
  Film,
  ImageIcon,
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
  Upload,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import {
  useEditorStore,
  type CaptionStylePreset,
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

const CAPTION_STYLES: CaptionStylePreset[] = ['creator', 'podcast', 'minimal'];

const STUDIO_TOOL_TABS = [
  { value: 'build', label: 'Arrange', icon: Layers3 },
  { value: 'edit', label: 'Edit', icon: Scissors },
  { value: 'text', label: 'Text', icon: Captions },
  { value: 'brand', label: 'Brand', icon: Sparkles },
  { value: 'look', label: 'Look', icon: Palette },
  { value: 'audio', label: 'Audio', icon: AudioLines },
  { value: 'export', label: 'Export', icon: Download },
] as const;

type StudioToolTab = (typeof STUDIO_TOOL_TABS)[number]['value'];

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

function captionY(position: 'top' | 'middle' | 'bottom') {
  if (position === 'top') return 0.2;
  if (position === 'middle') return 0.5;
  return 0.78;
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
      ? 'border-[#22a653]/50 bg-gradient-to-br from-[#ffcf5a] to-[#22a653] text-[#18231b] hover:from-[#dcfce7] hover:to-[#22a653]'
      : tone === 'danger'
        ? 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15'
        : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-[#dcfce7]';

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
    <div className="rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1.5">
      <div className="text-xs font-semibold leading-none text-white">{value}</div>
      <div className="mt-1 text-[8px] font-medium uppercase tracking-[0.16em] text-white/45">{label}</div>
    </div>
  );
}

const ProductionBlueprintPanel = () => {
  const [captionText, setCaptionText] = useState('Hook line\nMain idea\nCall to action');
  const [clipGap, setClipGap] = useState(0);
  const [projectTitle, setProjectTitle] = useState('Untitled edit');
  const [activeTab, setActiveTab] = useState<StudioToolTab>('build');

  const tracks = useEditorStore((s) => s.tracks);
  const mediaFiles = useEditorStore((s) => s.mediaFiles);
  const selectedClipIds = useEditorStore((s) => s.selectedClipIds);
  const currentTime = useEditorStore((s) => s.currentTime);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const brandKit = useEditorStore((s) => s.brandKit);
  const textOverlayCount = useEditorStore((s) => s.textOverlays.length);
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
  const updateBrandKit = useEditorStore((s) => s.updateBrandKit);
  const resetBrandKit = useEditorStore((s) => s.resetBrandKit);
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
        fontFamily: brandKit.headingFontFamily || brandKit.fontFamily,
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
          color: brandKit.primaryColor,
          backgroundColor: brandKit.secondaryColor,
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
          color: brandKit.primaryColor,
          backgroundColor: brandKit.secondaryColor,
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
          color: brandKit.secondaryColor,
          backgroundColor: brandKit.accentColor,
          backgroundOpacity: 1,
          textAlign: 'center',
          animation: 'bounce',
          animationDuration: 0.55,
        });
      }

      toast.success('Added text overlay');
    },
    [addTextOverlayToStore, brandKit, currentTime, projectTitle, selectedClip, selectedMedia],
  );

  const addCaptions = useCallback(() => {
    const lines = splitCaptionText(captionText);
    if (!lines.length) return;

    const start = selectedClip?.startTime ?? currentTime;
    const total = selectedClip?.duration ?? Math.max(6, lines.length * 1.8);
    const perLine = Math.max(1.2, total / lines.length);

    lines.forEach((line, index) => {
      const isCreator = brandKit.captionStyle === 'creator';
      const isPodcast = brandKit.captionStyle === 'podcast';
      addTextOverlayToStore({
        text: line,
        startTime: start + index * perLine,
        duration: Math.min(perLine + 0.15, total - index * perLine),
        trackIndex: selectedClip?.trackIndex ?? 0,
        x: 0.5,
        y: isPodcast ? 0.84 : captionY(brandKit.captionPosition),
        fontSize: isCreator ? brandKit.captionFontSize : isPodcast ? Math.max(22, brandKit.captionFontSize - 8) : Math.max(18, brandKit.captionFontSize - 12),
        fontFamily: brandKit.fontFamily,
        fontWeight: isCreator ? '900' : '700',
        color: brandKit.primaryColor,
        backgroundColor: isCreator ? brandKit.secondaryColor : '#000000',
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
  }, [addTextOverlayToStore, brandKit, captionText, currentTime, selectedClip]);

  const uploadBrandLogo = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image logo');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        updateBrandKit({ logoUrl: String(reader.result) });
        toast.success('Brand logo saved');
      };
      reader.onerror = () => toast.error('Could not read logo file');
      reader.readAsDataURL(file);
      event.target.value = '';
    },
    [updateBrandKit],
  );

  const addBrandIntroOutro = useCallback(
    (kind: 'intro' | 'outro') => {
      const duration = Math.min(3, Math.max(1.5, totalDuration || 3));
      const startTime = kind === 'intro' ? 0 : Math.max(0, totalDuration - duration);
      const text = kind === 'intro' ? brandKit.introText : brandKit.outroText;

      addTextOverlayToStore({
        text: text || (kind === 'intro' ? 'Welcome back' : 'Follow for more'),
        startTime,
        duration,
        trackIndex: 0,
        x: 0.5,
        y: kind === 'intro' ? 0.22 : 0.78,
        fontSize: 42,
        fontFamily: brandKit.headingFontFamily || brandKit.fontFamily,
        fontWeight: '900',
        color: brandKit.primaryColor,
        backgroundColor: brandKit.secondaryColor,
        backgroundOpacity: 0.78,
        textAlign: 'center',
        animation: kind === 'intro' ? 'slideUp' : 'fadeIn',
        animationDuration: 0.45,
        shadow: true,
        shadowColor: '#000000',
        shadowBlur: 10,
        outline: true,
        outlineColor: '#000000',
        outlineWidth: 1,
        lineHeight: 1.1,
        letterSpacing: 0,
        maxWidth: 780,
        rotation: 0,
      });

      toast.success(`Added branded ${kind}`);
    },
    [addTextOverlayToStore, brandKit, totalDuration],
  );

  const applyBrandToExistingText = useCallback(() => {
    pushHistory('Apply brand kit to text overlays');
    useEditorStore.setState((state) => ({
      textOverlays: state.textOverlays.map((overlay) => ({
        ...overlay,
        fontFamily: brandKit.fontFamily,
        color: brandKit.primaryColor,
        backgroundColor: overlay.backgroundOpacity > 0 ? brandKit.secondaryColor : overlay.backgroundColor,
        outlineColor: '#000000',
        shadowColor: '#000000',
      })),
    }));
    toast.success('Applied brand kit to text overlays');
  }, [brandKit, pushHistory]);

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

  const selectedVideoClips = useMemo(
    () => selectedClips.filter((clip) => getTrackForClip(tracks, clip.id)?.type === 'video'),
    [selectedClips, tracks],
  );

  const muteSelectedVideoSound = useCallback(() => {
    if (!selectedVideoClips.length) return;
    selectedVideoClips.forEach((clip) => {
      updateClipEffects(clip.id, { volume: 0 });
    });
    toast.success('Muted selected video sound. Add an audio/music file to the audio track.');
  }, [selectedVideoClips, updateClipEffects]);

  const restoreSelectedVideoSound = useCallback(() => {
    if (!selectedVideoClips.length) return;
    selectedVideoClips.forEach((clip) => {
      updateClipEffects(clip.id, { volume: 1 });
    });
    toast.success('Restored selected video sound');
  }, [selectedVideoClips, updateClipEffects]);

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
  const activeTabMeta = STUDIO_TOOL_TABS.find((tab) => tab.value === activeTab) ?? STUDIO_TOOL_TABS[0];
  const ActiveTabIcon = activeTabMeta.icon;

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/80 text-white shadow-[0_20px_60px_rgba(31,52,36,0.35)]"
    >
      <div className="border-b border-white/10 bg-[#182236]/80 px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Input
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
              className="h-8 max-w-xl rounded-xl border-white/10 bg-white/5 text-sm font-semibold text-white focus-visible:border-[#22a653]"
              aria-label="Project title"
            />
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:w-[320px]">
            <Stat label="Assets" value={mediaFiles.length} />
            <Stat label="Clips" value={clipCount} />
            <Stat label="Tracks" value={tracks.length} />
            <Stat label="Length" value={formatTime(totalDuration)} />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StudioToolTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-2 py-2 sm:px-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-between rounded-2xl border-white/10 bg-white/5 px-3 text-sm font-bold text-white hover:bg-white/10 sm:w-56"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ActiveTabIcon className="h-4 w-4 text-[#dcfce7]" />
                  <span className="truncate">{activeTabMeta.label}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-white/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 border-white/10 bg-[#111827] text-white">
              {STUDIO_TOOL_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.value === activeTab;
                return (
                  <DropdownMenuItem
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`cursor-pointer gap-2 text-sm focus:bg-white/10 focus:text-white ${
                      isActive ? 'bg-white/10 text-[#dcfce7]' : 'text-white/80'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {isActive && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="build" className="m-0 space-y-4 p-3 sm:p-4">
            <div className="grid gap-1.5 sm:grid-cols-3">
              <Stat label="Video" value={videoCount} />
              <Stat label="Audio" value={audioCount} />
              <Stat label="Images" value={imageCount} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-bold text-white">Assets live in Media Browser</div>
              <div className="mt-1 text-[11px] leading-5 text-[#cbd5e1]">
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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-[#cbd5e1]">
                <span>Gap between clips</span>
                <span className="font-mono text-[#dcfce7]">{clipGap.toFixed(1)}s</span>
              </div>
              <Slider value={[clipGap]} min={0} max={2} step={0.1} onValueChange={([value]) => setClipGap(value)} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-xs font-bold text-white">Selection</div>
              <div className="grid gap-2 text-[11px] text-[#cbd5e1] sm:grid-cols-2">
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
              className="min-h-24 rounded-2xl border-white/10 bg-white/5 text-xs text-white focus-visible:border-[#22a653]"
              placeholder="Paste caption lines here..."
            />

            <div className="grid gap-2 sm:grid-cols-3">
              {CAPTION_STYLES.map((style) => (
                <Button
                  key={style}
                  variant="outline"
                  onClick={() => updateBrandKit({ captionStyle: style })}
                  className={`h-9 rounded-xl text-[11px] ${
                    brandKit.captionStyle === style ? 'border-[#22a653]/40 bg-[#22a653]/15 text-[#dcfce7]' : 'border-white/10 bg-white/5 text-white/80'
                  }`}
                >
                  {brandKit.captionStyle === style && <Check className="mr-1 h-3.5 w-3.5" />}
                  {style}
                </Button>
              ))}
            </div>

            <ActionButton icon={<Captions className="h-4 w-4" />} label="Create Caption Overlays" onClick={addCaptions} tone="primary" />
          </TabsContent>

          <TabsContent value="brand" className="m-0 space-y-4 p-3 sm:p-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white">Brand Kit</div>
                  <div className="text-[11px] text-[#cbd5e1]">Saved locally and reused for titles, captions, intro, outro, and preview watermark.</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetBrandKit}
                  className="h-8 rounded-xl border-white/10 bg-white/5 px-2 text-[11px] text-white/80 hover:bg-white/10 hover:text-[#dcfce7]"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Reset
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[120px_1fr]">
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827] p-3">
                  {brandKit.logoUrl ? (
                    <div className="space-y-2">
                      <img src={brandKit.logoUrl} alt="Brand logo" className="h-20 w-full rounded-xl object-contain" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateBrandKit({ logoUrl: '' })}
                        className="h-8 w-full rounded-xl border-red-500/30 bg-red-500/10 text-[11px] text-red-200"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex h-28 flex-col items-center justify-center text-center text-[11px] text-[#cbd5e1]">
                      <ImageIcon className="mb-2 h-6 w-6 text-[#dcfce7]" />
                      Logo watermark
                    </div>
                  )}
                  <label className="mt-2 flex h-8 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-white/80 hover:bg-white/10 hover:text-[#dcfce7]">
                    <Upload className="mr-1 h-3.5 w-3.5" />
                    Upload
                    <input type="file" accept="image/*" onChange={uploadBrandLogo} className="sr-only" />
                  </label>
                </div>

                <div className="grid gap-3">
                  <Input
                    value={brandKit.name}
                    onChange={(event) => updateBrandKit({ name: event.target.value })}
                    className="h-9 rounded-xl border-white/10 bg-white/5 text-xs text-white focus-visible:border-[#22a653]"
                    placeholder="Brand name"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([
                      ['primaryColor', 'Text'],
                      ['secondaryColor', 'Panels'],
                      ['accentColor', 'Accent'],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="rounded-xl border border-white/10 bg-[#111827] p-2 text-[10px] uppercase tracking-widest text-[#cbd5e1]">
                        {label}
                        <input
                          type="color"
                          value={brandKit[key]}
                          onChange={(event) => updateBrandKit({ [key]: event.target.value })}
                          className="mt-2 h-8 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={brandKit.headingFontFamily}
                      onChange={(event) => updateBrandKit({ headingFontFamily: event.target.value })}
                      className="h-9 rounded-xl border-white/10 bg-white/5 text-xs text-white focus-visible:border-[#22a653]"
                      placeholder="Heading font"
                    />
                    <Input
                      value={brandKit.fontFamily}
                      onChange={(event) => updateBrandKit({ fontFamily: event.target.value })}
                      className="h-9 rounded-xl border-white/10 bg-white/5 text-xs text-white focus-visible:border-[#22a653]"
                      placeholder="Caption/body font"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-3 flex items-center justify-between text-[11px] text-[#cbd5e1]">
                <span>Caption size</span>
                <span className="font-mono text-[#dcfce7]">{brandKit.captionFontSize}px</span>
              </div>
              <Slider value={[brandKit.captionFontSize]} min={18} max={56} step={1} onValueChange={([value]) => updateBrandKit({ captionFontSize: value })} />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(['top', 'middle', 'bottom'] as const).map((position) => (
                  <Button
                    key={position}
                    type="button"
                    variant="outline"
                    onClick={() => updateBrandKit({ captionPosition: position })}
                    className={`h-8 rounded-xl text-[11px] ${
                      brandKit.captionPosition === position ? 'border-[#22a653]/40 bg-[#22a653]/15 text-[#dcfce7]' : 'border-white/10 bg-white/5 text-white/80'
                    }`}
                  >
                    {position}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Textarea
                value={brandKit.introText}
                onChange={(event) => updateBrandKit({ introText: event.target.value })}
                className="min-h-20 rounded-2xl border-white/10 bg-white/5 text-xs text-white focus-visible:border-[#22a653]"
                placeholder="Intro text"
              />
              <Textarea
                value={brandKit.outroText}
                onChange={(event) => updateBrandKit({ outroText: event.target.value })}
                className="min-h-20 rounded-2xl border-white/10 bg-white/5 text-xs text-white focus-visible:border-[#22a653]"
                placeholder="Outro text"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <ActionButton icon={<Sparkles className="h-4 w-4" />} label="Add Intro" onClick={() => addBrandIntroOutro('intro')} tone="primary" />
              <ActionButton icon={<Sparkles className="h-4 w-4" />} label="Add Outro" onClick={() => addBrandIntroOutro('outro')} tone="primary" />
              <ActionButton icon={<Wand2 className="h-4 w-4" />} label="Apply to Text" onClick={applyBrandToExistingText} disabled={!textOverlayCount} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111827] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-white">Watermark</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateBrandKit({ watermarkEnabled: !brandKit.watermarkEnabled })}
                  className={`h-8 rounded-xl px-3 text-[11px] ${
                    brandKit.watermarkEnabled ? 'border-[#22a653]/40 bg-[#22a653]/15 text-[#dcfce7]' : 'border-white/10 bg-white/5 text-white/80'
                  }`}
                >
                  {brandKit.watermarkEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((position) => (
                  <Button
                    key={position}
                    type="button"
                    variant="outline"
                    onClick={() => updateBrandKit({ watermarkPosition: position })}
                    className={`h-8 rounded-xl text-[10px] ${
                      brandKit.watermarkPosition === position ? 'border-[#22a653]/40 bg-[#22a653]/15 text-[#dcfce7]' : 'border-white/10 bg-white/5 text-white/80'
                    }`}
                  >
                    {position.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-bold text-white">Replace video music</div>
              <div className="mt-1 text-[11px] leading-5 text-[#cbd5e1]">
                Select a video clip, mute its original sound, then upload or drag a music/audio file onto an audio track. Preview will play the audio track with the video.
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <ActionButton icon={<AudioLines className="h-4 w-4" />} label="Mute Video Sound" onClick={muteSelectedVideoSound} disabled={!selectedVideoClips.length} tone="primary" />
                <ActionButton icon={<Volume2 className="h-4 w-4" />} label="Restore Video Sound" onClick={restoreSelectedVideoSound} disabled={!selectedVideoClips.length} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <ActionButton icon={<Mic2 className="h-4 w-4" />} label="Voice Enhance" onClick={() => applyAudioPreset('voice')} disabled={!canEdit} />
              <ActionButton icon={<Music className="h-4 w-4" />} label="Music Bed" onClick={() => applyAudioPreset('music')} disabled={!canEdit} />
              <ActionButton icon={<AudioLines className="h-4 w-4" />} label="Mute Clip" onClick={() => applyAudioPreset('mute')} disabled={!canEdit} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] leading-5 text-[#cbd5e1]">
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
                  className="h-auto justify-between rounded-xl border-white/10 bg-white/5 px-3 py-3 text-left hover:bg-white/10 hover:text-[#dcfce7]"
                >
                  <span>
                    <span className="block text-xs font-bold text-white">{preset.label}</span>
                    <span className="text-[10px] text-[#cbd5e1]">{preset.size}</span>
                  </span>
                  <Badge className="rounded-full border border-white/10 bg-[#111827] text-[10px] text-[#cbd5e1]">{preset.badge}</Badge>
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
