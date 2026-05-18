'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  useEditorStore,
  type ClipEffects,
  type ColorGrading,
  type TextOverlay,
  type ClipTransition,
} from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  Palette,
  Type,
  ArrowLeftRight,
  Sliders,
  RotateCcw,
  Plus,
  Trash2,
  MousePointer2,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

// ============================================================
// Constants
// ============================================================

const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
];

const FONT_WEIGHTS = [
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Bold', value: '700' },
  { label: 'Black', value: '900' },
];

const TEXT_ANIMATIONS = [
  'none',
  'fadeIn',
  'fadeOut',
  'typewriter',
  'slideLeft',
  'slideRight',
  'slideUp',
  'slideDown',
  'bounce',
  'glitch',
] as const;

function formatAnimationType(value: typeof TEXT_ANIMATIONS[number]) {
  switch (value) {
    case 'none': return 'None';
    case 'fadeIn': return 'Fade In';
    case 'fadeOut': return 'Fade Out';
    case 'typewriter': return 'Typewriter';
    case 'slideLeft': return 'Slide Left';
    case 'slideRight': return 'Slide Right';
    case 'slideUp': return 'Slide Up';
    case 'slideDown': return 'Slide Down';
    case 'bounce': return 'Bounce';
    case 'glitch': return 'Glitch';
    default: return String(value);
  }
}

const TRANSITION_TYPES: ClipTransition['type'][] = [
  'none',
  'crossfade',
  'dipToBlack',
  'dipToWhite',
  'wipeLeft',
  'wipeRight',
  'wipeUp',
  'wipeDown',
  'slideLeft',
  'slideRight',
];

// ============================================================
// Reusable Slider with Label
// ============================================================

interface LabeledSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: LabeledSliderProps) {
  const displayValue =
    step < 1 ? parseFloat(value.toFixed(2)) : Math.round(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-zinc-400 font-normal">{label}</Label>
        <span className="text-[10px] text-zinc-500 font-mono tabular-nums min-w-[40px] text-right">
          {displayValue}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="w-full h-3"
      />
    </div>
  );
}

// ============================================================
// Section Header
// ============================================================

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

// ============================================================
// Toggle Button (for shadow/outline)
// ============================================================

interface ToggleButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleButton({ checked, onChange }: ToggleButtonProps) {
  return (
    <button
      type="button"
      className={`w-7 h-4 rounded-full transition-colors relative ${
        checked ? 'bg-emerald-600' : 'bg-zinc-700'
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-3.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ============================================================
// Main Properties Panel
// ============================================================

const PropertiesPanel: React.FC = () => {
  const {
    tracks,
    selectedClipIds,
    getMediaFile,
    brandKit,
    textOverlays,
    updateClipEffects,
    updateClipColorGrading,
    updateClipTransition,
    resetClipEffects,
    addTextOverlay,
    updateTextOverlay,
    removeTextOverlay,
  } = useEditorStore();

  // Get selected clip (first one)
  const selectedClipId = selectedClipIds.length > 0 ? selectedClipIds[0] : null;

  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [tracks, selectedClipId]);

  const selectedMedia = useMemo(() => {
    if (!selectedClip) return undefined;
    return getMediaFile(selectedClip.mediaId);
  }, [selectedClip, getMediaFile]);

  const [expandedTextOverlay, setExpandedTextOverlay] = useState<string | null>(null);

  // Update clip label in store
  const updateClipLabel = useCallback(
    (label: string) => {
      if (!selectedClipId) return;
      useEditorStore.setState((state) => ({
        tracks: state.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) =>
            c.id === selectedClipId ? { ...c, label } : c
          ),
        })),
      }));
    },
    [selectedClipId]
  );

  // Update trim start/end
  const updateClipTrim = useCallback(
    (field: 'trimStart' | 'trimEnd', value: number) => {
      if (!selectedClipId) return;
      useEditorStore.setState((state) => ({
        tracks: state.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (c.id !== selectedClipId) return c;
            return field === 'trimStart'
              ? { ...c, trimStart: Math.max(0, value) }
              : { ...c, trimEnd: Math.max(0, value) };
          }),
        })),
      }));
    },
    [selectedClipId]
  );

  // Add text overlay for the selected clip
  const handleAddTextOverlay = useCallback(() => {
    if (!selectedClip) return;
    const newId = addTextOverlay({
      text: 'New Text',
      startTime: selectedClip.startTime,
      duration: selectedClip.duration,
      trackIndex: selectedClip.trackIndex,
      x: 0.5,
      y: 0.5,
      fontSize: 24,
      fontFamily: brandKit.fontFamily,
      fontWeight: '700',
      color: brandKit.primaryColor,
      backgroundColor: brandKit.secondaryColor,
      backgroundOpacity: 0,
      textAlign: 'center',
      animation: 'none',
      animationDuration: 1,
      shadow: false,
      shadowColor: '#000000',
      shadowBlur: 4,
      outline: false,
      outlineColor: '#000000',
      outlineWidth: 2,
      lineHeight: 1.2,
      letterSpacing: 0,
      maxWidth: 0,
      rotation: 0,
    });
    // Select the new overlay for expansion
    setExpandedTextOverlay(newId);
  }, [addTextOverlay, brandKit, selectedClip]);

  // Filter text overlays for this clip
  const clipTextOverlays = useMemo(() => {
    if (!selectedClip) return [];
    return textOverlays.filter(
      (t) =>
        t.trackIndex === selectedClip.trackIndex &&
        t.startTime >= selectedClip.startTime &&
        t.startTime < selectedClip.startTime + selectedClip.duration
    );
  }, [textOverlays, selectedClip]);

  // ============================================================
  // Empty state
  // ============================================================

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <MousePointer2 className="w-8 h-8 text-zinc-600 mb-3" />
        <p className="text-xs text-zinc-500">Select a clip to edit properties</p>
        <p className="text-[10px] text-zinc-600 mt-1">
          Click on any clip in the timeline
        </p>
      </div>
    );
  }

  const { effects, colorGrading, transition } = selectedClip;

  // ============================================================
  // Render
  // ============================================================

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const formatTransitionType = (t: string) => {
    if (t === 'none') return 'None';
    return t.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  };

  const formatAnimationType = (a: string) => {
    if (a === 'none') return 'None';
    return a.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-700/50">
      {/* Panel Header */}
      <div className="px-3 py-2 border-b border-zinc-700/50 flex items-center gap-2 flex-shrink-0">
        <Sliders className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-300">Properties</span>
        <span className="text-[10px] text-zinc-600 truncate ml-auto max-w-[120px]">
          {selectedClip.label || 'Clip'}
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="properties" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-2 pt-1.5 flex-shrink-0">
          <TabsList className="w-full h-7 bg-zinc-800/80 p-0.5">
            <TabsTrigger
              value="properties"
              className="flex-1 h-[22px] text-[10px] gap-0.5 px-1 data-[state=active]:bg-zinc-600/60 data-[state=active]:text-zinc-100"
            >
              <Settings className="w-2.5 h-2.5" />
              <span className="hidden xl:inline">Props</span>
            </TabsTrigger>
            <TabsTrigger
              value="effects"
              className="flex-1 h-[22px] text-[10px] gap-0.5 px-1 data-[state=active]:bg-zinc-600/60 data-[state=active]:text-zinc-100"
            >
              <Sliders className="w-2.5 h-2.5" />
              <span className="hidden xl:inline">FX</span>
            </TabsTrigger>
            <TabsTrigger
              value="color"
              className="flex-1 h-[22px] text-[10px] gap-0.5 px-1 data-[state=active]:bg-zinc-600/60 data-[state=active]:text-zinc-100"
            >
              <Palette className="w-2.5 h-2.5" />
              <span className="hidden xl:inline">Color</span>
            </TabsTrigger>
            <TabsTrigger
              value="transition"
              className="flex-1 h-[22px] text-[10px] gap-0.5 px-1 data-[state=active]:bg-zinc-600/60 data-[state=active]:text-zinc-100"
            >
              <ArrowLeftRight className="w-2.5 h-2.5" />
              <span className="hidden xl:inline">Trans</span>
            </TabsTrigger>
            <TabsTrigger
              value="text"
              className="flex-1 h-[22px] text-[10px] gap-0.5 px-1 data-[state=active]:bg-zinc-600/60 data-[state=active]:text-zinc-100"
            >
              <Type className="w-2.5 h-2.5" />
              <span className="hidden xl:inline">Text</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 h-full min-h-0 overflow-hidden">
          {/* ============================================================ */}
          {/* Tab 1: Properties */}
          {/* ============================================================ */}
          <TabsContent value="properties" className="p-2.5 space-y-3 mt-0 overflow-hidden">
            {/* Clip Name */}
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400 font-normal">
                Clip Name
              </Label>
              <Input
                value={selectedClip.label || ''}
                onChange={(e) => updateClipLabel(e.target.value)}
                className="h-6 text-[11px] bg-zinc-800 border-zinc-700/50 text-zinc-200 px-2"
              />
            </div>

            <Separator className="bg-zinc-700/40" />

            {/* Duration Display */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">Duration</span>
              <span className="text-[10px] text-zinc-300 font-mono tabular-nums">
                {formatTime(selectedClip.duration)}
              </span>
            </div>

            {selectedMedia && selectedMedia.duration > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Source</span>
                <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
                  {formatTime(selectedMedia.duration)}
                </span>
              </div>
            )}

            <Separator className="bg-zinc-700/40" />

            {/* Trim */}
            <SectionHeader
              icon={<Settings className="w-3 h-3 text-zinc-500" />}
              title="Trim"
            />
            <LabeledSlider
              label="Trim Start"
              value={parseFloat(selectedClip.trimStart.toFixed(2))}
              min={0}
              max={
                selectedMedia
                  ? Math.max(
                      0,
                      selectedMedia.duration -
                        selectedClip.duration -
                        selectedClip.trimEnd
                    )
                  : 60
              }
              step={0.01}
              unit="s"
              onChange={(v) => updateClipTrim('trimStart', v)}
            />
            <LabeledSlider
              label="Trim End"
              value={parseFloat(selectedClip.trimEnd.toFixed(2))}
              min={0}
              max={
                selectedMedia
                  ? Math.max(
                      0,
                      selectedMedia.duration -
                        selectedClip.duration -
                        selectedClip.trimStart
                    )
                  : 60
              }
              step={0.01}
              unit="s"
              onChange={(v) => updateClipTrim('trimEnd', v)}
            />

            <Separator className="bg-zinc-700/40" />

            {/* Playback */}
            <SectionHeader
              icon={<Sliders className="w-3 h-3 text-zinc-500" />}
              title="Playback"
            />
            <LabeledSlider
              label="Speed"
              value={effects.speed}
              min={0.25}
              max={4}
              step={0.25}
              unit="x"
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { speed: v })
              }
            />
            <LabeledSlider
              label="Volume"
              value={Math.round(effects.volume * 100)}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { volume: v / 100 })
              }
            />
            <LabeledSlider
              label="Opacity"
              value={Math.round(effects.opacity * 100)}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { opacity: v / 100 })
              }
            />

            <Separator className="bg-zinc-700/40" />

            {/* Fade */}
            <SectionHeader
              icon={<Eye className="w-3 h-3 text-zinc-500" />}
              title="Fade"
            />
            <LabeledSlider
              label="Fade In"
              value={effects.fadeInDuration}
              min={0}
              max={3}
              step={0.1}
              unit="s"
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { fadeInDuration: v })
              }
            />
            <LabeledSlider
              label="Fade Out"
              value={effects.fadeOutDuration}
              min={0}
              max={3}
              step={0.1}
              unit="s"
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { fadeOutDuration: v })
              }
            />
          </TabsContent>

          {/* ============================================================ */}
          {/* Tab 2: Effects */}
          {/* ============================================================ */}
          <TabsContent value="effects" className="p-2.5 space-y-3 mt-0">
            <div className="flex items-center justify-between mb-1">
              <SectionHeader
                icon={<Sliders className="w-3 h-3 text-zinc-500" />}
                title="Effects"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50"
                onClick={() => resetClipEffects(selectedClip.id)}
              >
                <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                Reset
              </Button>
            </div>

            <LabeledSlider
              label="Brightness"
              value={effects.brightness}
              min={-100}
              max={100}
              step={1}
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { brightness: v })
              }
            />

            <LabeledSlider
              label="Contrast"
              value={effects.contrast}
              min={-100}
              max={100}
              step={1}
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { contrast: v })
              }
            />

            <LabeledSlider
              label="Saturation"
              value={effects.saturation}
              min={-100}
              max={100}
              step={1}
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { saturation: v })
              }
            />

            <LabeledSlider
              label="Hue"
              value={effects.hue}
              min={-180}
              max={180}
              step={1}
              unit="°"
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { hue: v })
              }
            />

            <Separator className="bg-zinc-700/40" />

            <LabeledSlider
              label="Blur"
              value={effects.blur}
              min={0}
              max={20}
              step={0.5}
              unit="px"
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { blur: v })
              }
            />

            <LabeledSlider
              label="Sharpen"
              value={effects.sharpen}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) =>
                updateClipEffects(selectedClip.id, { sharpen: v })
              }
            />
          </TabsContent>

          {/* ============================================================ */}
          {/* Tab 3: Color Grading */}
          {/* ============================================================ */}
          <TabsContent value="color" className="p-2.5 space-y-3 mt-0">
            <div className="flex items-center justify-between mb-1">
              <SectionHeader
                icon={<Palette className="w-3 h-3 text-zinc-500" />}
                title="Color Grading"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50"
                onClick={() => {
                  updateClipColorGrading(selectedClip.id, {
                    lift: { r: 0, g: 0, b: 0 },
                    gamma: { r: 0, g: 0, b: 0 },
                    gain: { r: 0, g: 0, b: 0 },
                    temperature: 0,
                    tint: 0,
                  });
                }}
              >
                <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                Reset
              </Button>
            </div>

            {/* Lift (Shadows) */}
            <div>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Lift (Shadows)
              </span>
              <div className="space-y-1.5 mt-1.5">
                <LabeledSlider
                  label="R"
                  value={parseFloat(colorGrading.lift.r.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      lift: { ...colorGrading.lift, r: v },
                    })
                  }
                />
                <LabeledSlider
                  label="G"
                  value={parseFloat(colorGrading.lift.g.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      lift: { ...colorGrading.lift, g: v },
                    })
                  }
                />
                <LabeledSlider
                  label="B"
                  value={parseFloat(colorGrading.lift.b.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      lift: { ...colorGrading.lift, b: v },
                    })
                  }
                />
              </div>
            </div>

            <Separator className="bg-zinc-700/40" />

            {/* Gamma (Midtones) */}
            <div>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Gamma (Midtones)
              </span>
              <div className="space-y-1.5 mt-1.5">
                <LabeledSlider
                  label="R"
                  value={parseFloat(colorGrading.gamma.r.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      gamma: { ...colorGrading.gamma, r: v },
                    })
                  }
                />
                <LabeledSlider
                  label="G"
                  value={parseFloat(colorGrading.gamma.g.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      gamma: { ...colorGrading.gamma, g: v },
                    })
                  }
                />
                <LabeledSlider
                  label="B"
                  value={parseFloat(colorGrading.gamma.b.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      gamma: { ...colorGrading.gamma, b: v },
                    })
                  }
                />
              </div>
            </div>

            <Separator className="bg-zinc-700/40" />

            {/* Gain (Highlights) */}
            <div>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Gain (Highlights)
              </span>
              <div className="space-y-1.5 mt-1.5">
                <LabeledSlider
                  label="R"
                  value={parseFloat(colorGrading.gain.r.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      gain: { ...colorGrading.gain, r: v },
                    })
                  }
                />
                <LabeledSlider
                  label="G"
                  value={parseFloat(colorGrading.gain.g.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      gain: { ...colorGrading.gain, g: v },
                    })
                  }
                />
                <LabeledSlider
                  label="B"
                  value={parseFloat(colorGrading.gain.b.toFixed(2))}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) =>
                    updateClipColorGrading(selectedClip.id, {
                      gain: { ...colorGrading.gain, b: v },
                    })
                  }
                />
              </div>
            </div>

            <Separator className="bg-zinc-700/40" />

            {/* Temperature & Tint */}
            <LabeledSlider
              label="Temperature"
              value={colorGrading.temperature}
              min={-100}
              max={100}
              step={1}
              onChange={(v) =>
                updateClipColorGrading(selectedClip.id, { temperature: v })
              }
            />

            <LabeledSlider
              label="Tint"
              value={colorGrading.tint}
              min={-100}
              max={100}
              step={1}
              onChange={(v) =>
                updateClipColorGrading(selectedClip.id, { tint: v })
              }
            />
          </TabsContent>

          {/* ============================================================ */}
          {/* Tab 4: Transition */}
          {/* ============================================================ */}
          <TabsContent value="transition" className="p-2.5 space-y-3 mt-0">
            <SectionHeader
              icon={<ArrowLeftRight className="w-3 h-3 text-zinc-500" />}
              title="Transition"
            />

            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400 font-normal">
                Type
              </Label>
              <Select
                value={transition.type}
                onValueChange={(v) =>
                  updateClipTransition(selectedClip.id, {
                    type: v as ClipTransition['type'],
                  })
                }
              >
                <SelectTrigger className="h-7 text-[11px] bg-zinc-800 border-zinc-700/50 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700/50">
                  {TRANSITION_TYPES.map((t) => (
                    <SelectItem
                      key={t}
                      value={t}
                      className="text-[11px] text-zinc-200 focus:bg-zinc-700/50 focus:text-zinc-100"
                    >
                      {formatTransitionType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {transition.type !== 'none' && (
              <LabeledSlider
                label="Duration"
                value={transition.duration}
                min={0}
                max={3}
                step={0.1}
                unit="s"
                onChange={(v) =>
                  updateClipTransition(selectedClip.id, { duration: v })
                }
              />
            )}
          </TabsContent>

          {/* ============================================================ */}
          {/* Tab 5: Text */}
          {/* ============================================================ */}
          <TabsContent value="text" className="p-2.5 space-y-2.5 mt-0">
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={<Type className="w-3 h-3 text-zinc-500" />}
                title="Text Overlays"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
                onClick={handleAddTextOverlay}
              >
                <Plus className="w-2.5 h-2.5 mr-0.5" />
                Add
              </Button>
            </div>

            {clipTextOverlays.length === 0 ? (
              <div className="text-center py-6">
                <Type className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                <p className="text-[10px] text-zinc-600">No text overlays</p>
                <p className="text-[9px] text-zinc-700 mt-0.5">
                  Click &quot;Add&quot; to create one
                </p>
              </div>
            ) : (
              clipTextOverlays.map((overlay, idx) => (
                <TextOverlayEditor
                  key={overlay.id}
                  index={idx}
                  overlay={overlay}
                  onUpdate={(updates) =>
                    updateTextOverlay(overlay.id, updates)
                  }
                  onDelete={() => removeTextOverlay(overlay.id)}
                />
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

// ============================================================
// Text Overlay Editor (sub-component)
// ============================================================

interface TextOverlayEditorProps {
  index: number;
  overlay: TextOverlay;
  onUpdate: (updates: Partial<TextOverlay>) => void;
  onDelete: () => void;
}

const TextOverlayEditor: React.FC<TextOverlayEditorProps> = ({
  index,
  overlay,
  onUpdate,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="border border-zinc-700/40 rounded-md overflow-hidden bg-zinc-800/40">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-zinc-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Type className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          <span className="text-[10px] text-zinc-300 truncate">
            {overlay.text || 'Empty Text'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <span className="text-[9px] text-zinc-600">#{index + 1}</span>
          <svg
            className={`w-3 h-3 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-zinc-700/30">
          {/* Text Content */}
          <div className="space-y-1 pt-1.5">
            <Label className="text-[10px] text-zinc-400 font-normal">
              Content
            </Label>
            <Textarea
              value={overlay.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className="text-[11px] bg-zinc-800 border-zinc-700/50 text-zinc-200 px-2 py-1 min-h-[48px] resize-y"
              rows={2}
            />
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <LabeledSlider
              label="Position X"
              value={Math.round(overlay.x * 100)}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onUpdate({ x: v / 100 })}
            />
            <LabeledSlider
              label="Position Y"
              value={Math.round(overlay.y * 100)}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onUpdate({ y: v / 100 })}
            />
          </div>

          {/* Font Size */}
          <LabeledSlider
            label="Font Size"
            value={overlay.fontSize}
            min={8}
            max={120}
            step={1}
            unit="px"
            onChange={(v) => onUpdate({ fontSize: v })}
          />

          {/* Font Family */}
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-400 font-normal">
              Font Family
            </Label>
            <Select
              value={overlay.fontFamily}
              onValueChange={(v) => onUpdate({ fontFamily: v })}
            >
              <SelectTrigger className="h-6 text-[11px] bg-zinc-800 border-zinc-700/50 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700/50">
                {FONT_FAMILIES.map((f) => (
                  <SelectItem
                    key={f}
                    value={f}
                    className="text-[11px] text-zinc-200 focus:bg-zinc-700/50"
                  >
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Weight */}
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-400 font-normal">
              Font Weight
            </Label>
            <Select
              value={overlay.fontWeight}
              onValueChange={(v) =>
                onUpdate({ fontWeight: v as TextOverlay['fontWeight'] })
              }
            >
              <SelectTrigger className="h-6 text-[11px] bg-zinc-800 border-zinc-700/50 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700/50">
                {FONT_WEIGHTS.map((w) => (
                  <SelectItem
                    key={w.value}
                    value={w.value}
                    className="text-[11px] text-zinc-200 focus:bg-zinc-700/50"
                  >
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text Color & Align */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400 font-normal">
                Text Color
              </Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={overlay.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-5 h-5 rounded border border-zinc-600 cursor-pointer bg-transparent"
                />
                <span className="text-[9px] text-zinc-500 font-mono">
                  {overlay.color}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400 font-normal">
                Align
              </Label>
              <div className="flex items-center gap-0.5">
                {(
                  ['left', 'center', 'right'] as TextOverlay['textAlign'][]
                ).map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                      overlay.textAlign === align
                        ? 'bg-zinc-600/60 text-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40'
                    }`}
                    onClick={() => onUpdate({ textAlign: align })}
                  >
                    {align === 'left' && (
                      <AlignLeft className="w-3 h-3" />
                    )}
                    {align === 'center' && (
                      <AlignCenter className="w-3 h-3" />
                    )}
                    {align === 'right' && (
                      <AlignRight className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Background */}
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-400 font-normal">
              Background
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={overlay.backgroundColor}
                onChange={(e) =>
                  onUpdate({ backgroundColor: e.target.value })
                }
                className="w-5 h-5 rounded border border-zinc-600 cursor-pointer bg-transparent"
              />
              <span className="text-[9px] text-zinc-500 font-mono">
                {overlay.backgroundColor}
              </span>
            </div>
            <LabeledSlider
              label="BG Opacity"
              value={overlay.backgroundOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => onUpdate({ backgroundOpacity: v })}
            />
          </div>

          {/* Animation */}
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-400 font-normal">
              Animation
            </Label>
            <Select
              value={overlay.animation}
              onValueChange={(v) =>
                onUpdate({ animation: v as TextOverlay['animation'] })
              }
            >
              <SelectTrigger className="h-6 text-[11px] bg-zinc-800 border-zinc-700/50 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700/50">
                {TEXT_ANIMATIONS.map((a) => (
                  <SelectItem
                    key={a}
                    value={a}
                    className="text-[11px] text-zinc-200 focus:bg-zinc-700/50"
                  >
                    {formatAnimationType(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {overlay.animation !== 'none' && (
            <LabeledSlider
              label="Anim Duration"
              value={overlay.animationDuration}
              min={0.1}
              max={5}
              step={0.1}
              unit="s"
              onChange={(v) => onUpdate({ animationDuration: v })}
            />
          )}

          <Separator className="bg-zinc-700/30" />

          {/* Line Height & Letter Spacing */}
          <div className="grid grid-cols-2 gap-2">
            <LabeledSlider
              label="Line Height"
              value={overlay.lineHeight}
              min={0.5}
              max={3}
              step={0.1}
              onChange={(v) => onUpdate({ lineHeight: v })}
            />
            <LabeledSlider
              label="Letter Space"
              value={overlay.letterSpacing}
              min={-5}
              max={20}
              step={0.5}
              unit="px"
              onChange={(v) => onUpdate({ letterSpacing: v })}
            />
          </div>

          {/* Rotation */}
          <LabeledSlider
            label="Rotation"
            value={overlay.rotation}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => onUpdate({ rotation: v })}
          />

          <Separator className="bg-zinc-700/30" />

          {/* Shadow */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-zinc-400 font-normal">
                Shadow
              </Label>
              <ToggleButton
                checked={overlay.shadow}
                onChange={(v) => onUpdate({ shadow: v })}
              />
            </div>
            {overlay.shadow && (
              <div className="space-y-1.5 pl-2 border-l border-zinc-700/40">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[9px] text-zinc-500">Color</Label>
                  <input
                    type="color"
                    value={overlay.shadowColor}
                    onChange={(e) =>
                      onUpdate({ shadowColor: e.target.value })
                    }
                    className="w-4 h-4 rounded border border-zinc-600 cursor-pointer bg-transparent"
                  />
                </div>
                <LabeledSlider
                  label="Blur"
                  value={overlay.shadowBlur}
                  min={0}
                  max={20}
                  step={1}
                  unit="px"
                  onChange={(v) => onUpdate({ shadowBlur: v })}
                />
              </div>
            )}
          </div>

          {/* Outline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-zinc-400 font-normal">
                Outline
              </Label>
              <ToggleButton
                checked={overlay.outline}
                onChange={(v) => onUpdate({ outline: v })}
              />
            </div>
            {overlay.outline && (
              <div className="space-y-1.5 pl-2 border-l border-zinc-700/40">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[9px] text-zinc-500">Color</Label>
                  <input
                    type="color"
                    value={overlay.outlineColor}
                    onChange={(e) =>
                      onUpdate({ outlineColor: e.target.value })
                    }
                    className="w-4 h-4 rounded border border-zinc-600 cursor-pointer bg-transparent"
                  />
                </div>
                <LabeledSlider
                  label="Width"
                  value={overlay.outlineWidth}
                  min={0}
                  max={10}
                  step={0.5}
                  unit="px"
                  onChange={(v) => onUpdate({ outlineWidth: v })}
                />
              </div>
            )}
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-[10px] text-red-400/70 hover:text-red-400 hover:bg-red-900/20 mt-1"
            onClick={onDelete}
          >
            <Trash2 className="w-2.5 h-2.5 mr-1" />
            Delete Text Overlay
          </Button>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
