'use client';

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  memo,
} from 'react';
import { useEditorStore, type BrandKit, type ClipEffects, type ColorGrading, type TextOverlay } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  Film,
  Clapperboard,
  Music,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from 'lucide-react';

// ============================================================
// Constants
// ============================================================

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const DEFAULT_FPS = 30;
const FRAME_DURATION = 1 / DEFAULT_FPS;
const MAX_VIDEO_RETRIES = 3;
const RETRY_DELAYS = [500, 1500, 3000] as const;
const PLAYBACK_TIME_PUBLISH_INTERVAL_MS = 90;

// ============================================================
// Pure helpers (module-level, never recreated)
// ============================================================

function formatTimeCode(seconds: number, fps: number = DEFAULT_FPS): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const frames = Math.floor((s % 1) * fps);
  return (
    `${h.toString().padStart(2, '0')}:` +
    `${m.toString().padStart(2, '0')}:` +
    `${sec.toString().padStart(2, '0')}.` +
    `${frames.toString().padStart(2, '0')}`
  );
}

function getWatermarkPositionClass(position: BrandKit['watermarkPosition']) {
  switch (position) {
    case 'top-left':
      return 'left-4 top-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'top-right':
    default:
      return 'right-4 top-4';
  }
}

/** Build a CSS filter string combining ClipEffects + ColorGrading. Pure function. */
function buildCanvasFilter(effects: ClipEffects, cg: ColorGrading): string {
  const f: string[] = [
    `brightness(${1 + effects.brightness / 100})`,
    `contrast(${1 + effects.contrast / 100})`,
    `saturate(${1 + effects.saturation / 100})`,
    `hue-rotate(${effects.hue}deg)`,
  ];
  if (effects.blur > 0) f.push(`blur(${effects.blur}px)`);

  if (cg.temperature > 0) {
    f.push(`sepia(${cg.temperature * 0.4}%)`);
  } else if (cg.temperature < 0) {
    f.push(`sepia(${Math.abs(cg.temperature) * 0.4}%) hue-rotate(${180 + cg.temperature}deg)`);
  }
  if (Math.abs(cg.tint) > 0.001) f.push(`hue-rotate(${cg.tint * 0.3}deg)`);

  const liftAvg = (cg.lift.r + cg.lift.g + cg.lift.b) / 3;
  const gammaAvg = (cg.gamma.r + cg.gamma.g + cg.gamma.b) / 3;
  const gainAvg = (cg.gain.r + cg.gain.g + cg.gain.b) / 3;
  if (Math.abs(liftAvg) > 0.01) f.push(`brightness(${1 + liftAvg * 0.3})`);
  if (Math.abs(gammaAvg) > 0.01) f.push(`contrast(${1 + gammaAvg * 0.3})`);
  if (Math.abs(gainAvg) > 0.01) f.push(`brightness(${1 + gainAvg * 0.3})`);

  return f.join(' ');
}

function calculateFadeAlpha(
  currentTime: number,
  clipStartTime: number,
  clipDuration: number,
  fadeIn: number,
  fadeOut: number,
): number {
  const elapsed = currentTime - clipStartTime;
  let alpha = 1;
  if (fadeIn > 0 && elapsed < fadeIn) alpha = elapsed / fadeIn;
  if (fadeOut > 0 && elapsed > clipDuration - fadeOut) {
    alpha = Math.min(alpha, (clipDuration - elapsed) / fadeOut);
  }
  return Math.max(0, Math.min(1, alpha));
}

function getTextAnimationStyle(overlay: TextOverlay, currentTime: number): React.CSSProperties {
  const elapsed = currentTime - overlay.startTime;
  const duration = overlay.animationDuration > 0 ? overlay.animationDuration : 0.5;
  const progress = Math.min(1, Math.max(0, elapsed / duration));

  switch (overlay.animation) {
    case 'fadeIn': return { opacity: progress };
    case 'fadeOut': return { opacity: 1 - progress };
    case 'typewriter': return { clipPath: `inset(0 ${100 - progress * 100}% 0 0)` };
    case 'slideLeft': return { transform: `translateX(${(1 - progress) * 100}px)`, opacity: progress };
    case 'slideRight': return { transform: `translateX(${(1 - progress) * -100}px)`, opacity: progress };
    case 'slideUp': return { transform: `translateY(${(1 - progress) * 100}px)`, opacity: progress };
    case 'slideDown': return { transform: `translateY(${(1 - progress) * -100}px)`, opacity: progress };
    case 'bounce': {
      const bp = progress < 0.5 ? 2 * progress ** 2 : 1 - (-2 * progress + 2) ** 2 / 2;
      return { transform: `translateY(${(1 - bp) * -30}px)` };
    }
    case 'glitch': {
      const ox = Math.sin(elapsed * 20) * 3;
      const sk = Math.sin(elapsed * 15) * 2;
      return { transform: `translateX(${ox}px) skewX(${sk}deg)`, opacity: 0.8 + Math.random() * 0.2 };
    }
    default: return {};
  }
}

// ============================================================
// Empty / Loading / Fallback / Audio — memoised pure components
// ============================================================

const EmptyPreviewState = memo(() => (
  <div className="absolute inset-0 flex flex-col items-center justify-center select-none overflow-hidden bg-black">
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)`,
        backgroundSize: '32px 32px',
      }}
    />
    <div className="relative mb-6">
      <div className="flex h-20 w-20 animate-[pulse_3s_ease-in-out_infinite] items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Clapperboard className="h-9 w-9 text-[#c7b4ff]" strokeWidth={1.5} />
      </div>
      <div className="absolute -inset-2 animate-[ping_3s_ease-in-out_infinite] rounded-3xl border border-[#ffb32c]/20" />
    </div>
    <p className="text-sm font-medium text-[#f2c5ff]">Drop media to preview</p>
    <p className="mt-2 text-xs text-[#c7b4ff]">Add clips to the timeline to get started</p>
    <div className="flex items-center gap-3 mt-4">
      <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#c7b4ff]">Space</kbd>
      <span className="text-[10px] text-[#8f7bd6]">Play / Pause</span>
      <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#c7b4ff]">J K L</kbd>
      <span className="text-[10px] text-[#8f7bd6]">Shuttle</span>
    </div>
  </div>
));
EmptyPreviewState.displayName = 'EmptyPreviewState';

const LoadingPreviewState = memo<{ name?: string }>(({ name }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black select-none">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
      <Loader2 className="h-6 w-6 animate-spin text-[#ffb32c]" />
    </div>
    <p className="text-xs font-medium text-[#f2c5ff]">Loading media...</p>
    {name && <p className="mt-1 max-w-[200px] truncate text-[10px] text-[#8f7bd6]">{name}</p>}
  </div>
));
LoadingPreviewState.displayName = 'LoadingPreviewState';

interface VideoFallbackProps {
  mediaName: string;
  mediaThumbnail: string;
  mediaWidth: number;
  mediaHeight: number;
  clipLabel?: string;
  retryCount: number;
  onRetry: () => void;
  canRetry: boolean;
}

const VideoFallbackPreview = memo<VideoFallbackProps>(
  ({ mediaName, mediaThumbnail, mediaWidth, mediaHeight, clipLabel, retryCount, onRetry, canRetry }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black select-none overflow-hidden">
      {mediaThumbnail && mediaThumbnail !== '/placeholder.png' ? (
        <img src={mediaThumbnail} alt={mediaName} className="max-w-full max-h-full object-contain w-full h-full" />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-12 w-12 text-[#8f7bd6]" />
          <p className="text-xs text-[#c7b4ff]">Video preview unavailable</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="pointer-events-none space-y-0.5 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-[11px] text-[#f2c5ff] backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <Film className="h-3 w-3 text-[#c7b4ff]" />
            <span className="max-w-[200px] truncate font-medium text-white">{clipLabel || mediaName}</span>
          </div>
        </div>
        <div className="bg-amber-500/20 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-amber-400 border border-amber-500/30 pointer-events-none">
          Static preview
        </div>
      </div>
      {mediaWidth > 0 && mediaHeight > 0 && (
        <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 font-mono text-[10px] text-[#f2c5ff] backdrop-blur-sm">
          {mediaWidth}×{mediaHeight}
        </div>
      )}
      {canRetry && (
        <div className="absolute top-2 left-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2 text-[10px] text-[#f2c5ff] hover:bg-white/15 hover:text-white"
            onClick={onRetry}
          >
            <RotateCcw className="w-3 h-3" />
            Retry{retryCount > 0 ? ` (${retryCount}/${MAX_VIDEO_RETRIES})` : ''}
          </Button>
        </div>
      )}
    </div>
  ),
);
VideoFallbackPreview.displayName = 'VideoFallbackPreview';

interface AudioPreviewProps {
  mediaName: string;
  clipLabel?: string;
  clipDuration: number;
}
const AudioPreviewState = memo<AudioPreviewProps>(({ mediaName, clipLabel, clipDuration }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black select-none overflow-hidden">
    <div className="absolute inset-0 flex items-end justify-center gap-1 px-8 pb-16 opacity-20">
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          className="w-1.5 animate-[audioBar_1.2s_ease-in-out_infinite] rounded-full bg-[#ffb32c]"
          style={{ height: `${20 + Math.sin(i * 0.5) * 30}%`, animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
    <div className="relative mb-4 z-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ffb32c]/20 bg-[#ffb32c]/10">
        <Music className="h-8 w-8 text-[#f2c5ff]" />
      </div>
    </div>
    <p className="z-10 max-w-[300px] truncate px-4 text-center text-sm font-medium text-white">{clipLabel || mediaName}</p>
    <p className="z-10 mt-1 text-xs text-[#8f7bd6]">Audio clip · {formatTimeCode(clipDuration)}</p>
    <div className="flex items-center gap-1.5 mt-4 z-10">
      <div className="h-3 w-1 animate-[audioBar_0.6s_ease-in-out_infinite] rounded-full bg-[#ffb32c]" />
      <div className="h-4 w-1 animate-[audioBar_0.6s_ease-in-out_infinite_0.2s] rounded-full bg-[#ffb32c]" />
      <div className="h-2 w-1 animate-[audioBar_0.6s_ease-in-out_infinite_0.4s] rounded-full bg-[#ffb32c]" />
      <span className="ml-1 text-[10px] font-medium text-[#ffd36b]">NOW PLAYING</span>
    </div>
  </div>
));
AudioPreviewState.displayName = 'AudioPreviewState';

// ============================================================
// Volume Popup — memoised, stable callbacks via props
// ============================================================

interface VolumePopupProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
}
const VolumePopup = memo<VolumePopupProps>(({ volume, isMuted, onVolumeChange, onMuteToggle }) => {
  const displayVolume = isMuted ? 0 : volume * 100;
  return (
    <div className="flex flex-col items-center gap-3 p-3 w-48">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#c7b4ff] hover:text-white" onClick={onMuteToggle}>
        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </Button>
      <div className="w-full flex items-center justify-center h-32">
        <Slider value={[displayVolume]} onValueChange={(v) => onVolumeChange(v[0] / 100)} max={100} step={1} orientation="vertical" className="h-full" />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-[#c7b4ff]">{Math.round(displayVolume)}%</span>
    </div>
  );
});
VolumePopup.displayName = 'VolumePopup';

// ============================================================
// Text Overlay Renderer — only re-renders when overlays/time changes
// ============================================================

interface TextOverlayRendererProps {
  overlays: TextOverlay[];
  currentTime: number;
}
const TextOverlayRenderer = memo<TextOverlayRendererProps>(({ overlays, currentTime }) => (
  <>
    {overlays.map((overlay) => {
      const elapsed = currentTime - overlay.startTime;
      const animStyle = getTextAnimationStyle(overlay, currentTime);

      let displayText = overlay.text;
      if (overlay.animation === 'typewriter') {
        const dur = overlay.animationDuration > 0 ? overlay.animationDuration : 0.5;
        const progress = Math.min(1, Math.max(0, elapsed / dur));
        displayText = overlay.text.substring(0, Math.floor(progress * overlay.text.length));
      }

      return (
        <div
          key={overlay.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${overlay.x * 100}%`,
            top: `${overlay.y * 100}%`,
            ...animStyle,
            ...(overlay.rotation ? { transform: `${animStyle.transform ?? ''} rotate(${overlay.rotation}deg)`.trim() } : {}),
            fontSize: `${overlay.fontSize}px`,
            fontFamily: overlay.fontFamily || 'sans-serif',
            color: overlay.color || '#ffffff',
            backgroundColor: overlay.backgroundColor || 'transparent',
            textAlign: overlay.textAlign || 'center',
            fontWeight: overlay.fontWeight || 'normal',
            textShadow: overlay.shadow ? `0 0 ${overlay.shadowBlur}px ${overlay.shadowColor}` : 'none',
            WebkitTextStroke: overlay.outline && overlay.outlineWidth > 0 ? `${overlay.outlineWidth}px ${overlay.outlineColor}` : undefined,
            lineHeight: overlay.lineHeight || 1.2,
            letterSpacing: `${overlay.letterSpacing || 0}px`,
            maxWidth: overlay.maxWidth > 0 ? `${overlay.maxWidth}px` : undefined,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        >
          {displayText}
        </div>
      );
    })}
  </>
));
TextOverlayRenderer.displayName = 'TextOverlayRenderer';

// ============================================================
// Clip Info overlay — only re-renders on relevant prop changes
// ============================================================

interface ClipInfoOverlayProps {
  clipLabel?: string;
  mediaName: string;
  mediaWidth: number;
  mediaHeight: number;
  trimStart: number;
  trimEnd: number;
  duration: number;
  startTime: number;
  clipSpeed: number;
}
const ClipInfoOverlay = memo<ClipInfoOverlayProps>(
  ({ clipLabel, mediaName, mediaWidth, mediaHeight, trimStart, trimEnd, duration, startTime, clipSpeed }) => (
    <>
      <div className="pointer-events-none absolute bottom-2 left-2 z-10 space-y-0.5 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-[11px] text-[#f2c5ff] backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Film className="h-3 w-3 text-[#c7b4ff]" />
          <span className="max-w-[200px] truncate font-medium text-white">{clipLabel || mediaName}</span>
        </div>
        <div className="font-mono tabular-nums text-[#c7b4ff]">
          <span className="text-[#f2c5ff]">{formatTimeCode(trimStart)}</span>
          {' → '}
          <span className="text-[#f2c5ff]">{formatTimeCode(trimStart + duration - trimEnd)}</span>
        </div>
        <div className="font-mono tabular-nums text-[#8f7bd6]">
          Timeline: {formatTimeCode(startTime)} → {formatTimeCode(startTime + duration)}
        </div>
        {clipSpeed !== 1 && (
          <div className="text-amber-400/80 font-mono tabular-nums">Speed: {clipSpeed}x</div>
        )}
      </div>
      {mediaWidth > 0 && mediaHeight > 0 && (
        <div className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-black/50 px-2 py-0.5 font-mono text-[10px] text-[#f2c5ff] backdrop-blur-sm">
          {mediaWidth}×{mediaHeight}
        </div>
      )}
    </>
  ),
);
ClipInfoOverlay.displayName = 'ClipInfoOverlay';

// ============================================================
// Transport Controls — split out to reduce re-renders from time ticks
// ============================================================

interface TransportProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  totalClips: number;
  playbackSpeed: number;
  isMuted: boolean;
  volume: number;
  volumeOpen: boolean;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onSeekToStart: () => void;
  onSeekToEnd: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onSeek: (v: number[]) => void;
  onSetSpeed: (s: number) => void;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
  onVolumeOpenChange: (o: boolean) => void;
  onToggleFullscreen: () => void;
}

const TransportControls = memo<TransportProps>(({
  isPlaying, currentTime, totalDuration, totalClips, playbackSpeed,
  isMuted, volume, volumeOpen, isFullscreen,
  onTogglePlay, onSeekToStart, onSeekToEnd, onStepBack, onStepForward,
  onSeek, onSetSpeed, onVolumeChange, onMuteToggle, onVolumeOpenChange, onToggleFullscreen,
}) => {
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const speedLabel = playbackSpeed === 1 ? '1x' : `${playbackSpeed}x`;

  return (
    <>
      <div className="flex items-center gap-1 border-t border-white/10 bg-[#10082c] px-3 py-1.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#c7b4ff] hover:text-white" onClick={onStepBack} title="Previous Frame (,)">
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#c7b4ff] hover:text-white" onClick={onSeekToStart} title="Go to Start">
          <SkipBack className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="mx-0.5 h-8 w-8 rounded-full bg-gradient-to-br from-[#ffcf5a] to-[#ffb32c] text-[#3b1769] hover:from-[#ffd36b] hover:to-[#ffb32c] hover:text-[#3b1769]"
          onClick={onTogglePlay}
          title="Play / Pause (Space)"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#c7b4ff] hover:text-white" onClick={onSeekToEnd} title="Go to End">
          <SkipForward className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#c7b4ff] hover:text-white" onClick={onStepForward} title="Next Frame (.)">
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>

        <div className="mx-1 h-5 w-px bg-white/10" />

        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
          <span className="text-[#ffd36b]">{formatTimeCode(currentTime)}</span>
          <span className="text-[#8f7bd6]">/</span>
          <span className="text-[#c7b4ff]">{formatTimeCode(totalDuration)}</span>
          <span className="ml-1.5 text-[#8f7bd6]">|</span>
          <span className="ml-1 text-[#8f7bd6]">{totalClips} clip{totalClips !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1 px-2 font-mono text-[11px] tabular-nums ${playbackSpeed !== 1 ? 'text-[#ffb32c] hover:text-[#ffd36b]' : 'text-[#c7b4ff] hover:text-white'}`}
              title="Playback Speed"
            >
              <Gauge className="w-3 h-3" />
              {speedLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[100px] border-white/10 bg-[#100a2f]">
            {PLAYBACK_SPEEDS.map((speed) => (
              <DropdownMenuItem
                key={speed}
                className={`cursor-pointer font-mono text-xs tabular-nums ${playbackSpeed === speed ? 'bg-white/10 text-[#ffd36b]' : 'text-[#c7b4ff] hover:bg-white/10 hover:text-white'}`}
                onClick={() => onSetSpeed(speed)}
              >
                {speed === 1 ? `${speed}x (Normal)` : `${speed}x`}
                {playbackSpeed === speed && <span className="ml-auto text-[#ffd36b]">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover open={volumeOpen} onOpenChange={onVolumeOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#c7b4ff] hover:text-white" title="Volume">
              <VolumeIcon className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-auto rounded-xl border-white/10 bg-[#100a2f] p-0 shadow-xl">
            <VolumePopup volume={volume} isMuted={isMuted} onVolumeChange={onVolumeChange} onMuteToggle={onMuteToggle} />
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#c7b4ff] hover:text-white" onClick={onToggleFullscreen} title="Toggle Fullscreen">
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <div className="bg-[#10082c] px-3 pb-2 pt-0.5">
        <Slider value={[currentTime]} onValueChange={onSeek} max={totalDuration} step={0.001} className="w-full" />
      </div>
    </>
  );
});
TransportControls.displayName = 'TransportControls';

// ============================================================
// Stable default objects (avoid creating new objects each render)
// ============================================================

const DEFAULT_EFFECTS: ClipEffects = {
  brightness: 0, contrast: 0, saturation: 0, hue: 0,
  blur: 0, sharpen: 0, opacity: 1, speed: 1, volume: 1,
  fadeInDuration: 0, fadeOutDuration: 0,
};
const DEFAULT_LIFT = { r: 0, g: 0, b: 0 };
const DEFAULT_COLOR_GRADING: ColorGrading = {
  lift: DEFAULT_LIFT, gamma: DEFAULT_LIFT, gain: DEFAULT_LIFT,
  temperature: 0, tint: 0,
};

// ============================================================
// Main Component
// ============================================================

const VideoPreview: React.FC = () => {
  // ── Store subscriptions: granular selectors to minimise re-renders ──
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const playbackSpeed = useEditorStore((s) => s.playbackSpeed);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const tracks = useEditorStore((s) => s.tracks);
  const brandKit = useEditorStore((s) => s.brandKit);

  // Actions (stable references from zustand — will not cause re-renders)
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setPlaybackSpeed = useEditorStore((s) => s.setPlaybackSpeed);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const getActiveVideoAtTime = useEditorStore((s) => s.getActiveVideoAtTime);
  const getMediaFile = useEditorStore((s) => s.getMediaFile);
  const getTextOverlaysAtTime = useEditorStore((s) => s.getTextOverlaysAtTime);

  // Derived: active video clip
  const activeClip = useMemo(() => getActiveVideoAtTime(currentTime), [currentTime, getActiveVideoAtTime]);
  const media = useMemo(() => (activeClip ? getMediaFile(activeClip.mediaId) : null), [activeClip, getMediaFile]);
  const activeClipId = activeClip?.id ?? null;

  // Derived: active audio clip (only when no video)
  const activeAudioClip = useMemo(() => {
    if (activeClip) return null;
    for (const track of tracks) {
      if (track.type !== 'audio' || track.muted || !track.visible) continue;
      for (let i = track.clips.length - 1; i >= 0; i--) {
        const clip = track.clips[i];
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) return clip;
      }
    }
    return null;
  }, [activeClip, tracks, currentTime]);

  const audioMedia = useMemo(
    () => (activeAudioClip ? getMediaFile(activeAudioClip.mediaId) : null),
    [activeAudioClip, getMediaFile],
  );

  // Text overlays
  const textOverlays = useMemo(() => getTextOverlaysAtTime(currentTime), [currentTime, getTextOverlaysAtTime]);

  // Clip effects — stabilised with deep equality avoided via individual field deps
  const clipEffects: ClipEffects = useMemo(() => ({
    brightness: activeClip?.effects?.brightness ?? 0,
    contrast: activeClip?.effects?.contrast ?? 0,
    saturation: activeClip?.effects?.saturation ?? 0,
    hue: activeClip?.effects?.hue ?? 0,
    blur: activeClip?.effects?.blur ?? 0,
    sharpen: activeClip?.effects?.sharpen ?? 0,
    opacity: activeClip?.effects?.opacity ?? 1,
    speed: activeClip?.effects?.speed ?? 1,
    volume: activeClip?.effects?.volume ?? 1,
    fadeInDuration: activeClip?.effects?.fadeInDuration ?? 0,
    fadeOutDuration: activeClip?.effects?.fadeOutDuration ?? 0,
  }), [
    activeClip?.effects?.brightness, activeClip?.effects?.contrast,
    activeClip?.effects?.saturation, activeClip?.effects?.hue,
    activeClip?.effects?.blur, activeClip?.effects?.sharpen,
    activeClip?.effects?.opacity, activeClip?.effects?.speed,
    activeClip?.effects?.volume, activeClip?.effects?.fadeInDuration,
    activeClip?.effects?.fadeOutDuration,
  ]);

  const clipColorGrading: ColorGrading = useMemo(() => ({
    lift: { r: activeClip?.colorGrading?.lift?.r ?? 0, g: activeClip?.colorGrading?.lift?.g ?? 0, b: activeClip?.colorGrading?.lift?.b ?? 0 },
    gamma: { r: activeClip?.colorGrading?.gamma?.r ?? 0, g: activeClip?.colorGrading?.gamma?.g ?? 0, b: activeClip?.colorGrading?.gamma?.b ?? 0 },
    gain: { r: activeClip?.colorGrading?.gain?.r ?? 0, g: activeClip?.colorGrading?.gain?.g ?? 0, b: activeClip?.colorGrading?.gain?.b ?? 0 },
    temperature: activeClip?.colorGrading?.temperature ?? 0,
    tint: activeClip?.colorGrading?.tint ?? 0,
  }), [activeClip?.colorGrading]);

  // Precompute filter string (only when effects change, not every frame)
  const filterString = useMemo(
    () => buildCanvasFilter(clipEffects, clipColorGrading),
    [clipEffects, clipColorGrading],
  );

  const clipSpeed = clipEffects.speed;
  const clipVolume = clipEffects.volume;
  const clipFadeIn = clipEffects.fadeInDuration;
  const clipFadeOut = clipEffects.fadeOutDuration;

  // Total clip count
  const totalClips = useMemo(() => tracks.reduce((sum, t) => sum + t.clips.length, 0), [tracks]);

  // Is active clip's track muted?
  const isTrackMuted = useMemo(() => {
    if (!activeClip) return false;
    for (const t of tracks) {
      if (t.clips.some((c) => c.id === activeClip.id)) return t.muted ?? false;
    }
    return false;
  }, [activeClip, tracks]);

  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const timeRafRef = useRef<number>(0);
  const lastPublishedTimeRef = useRef({ time: 0, at: 0 });
  const lastClipKeyRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable refs for rAF callbacks (avoid stale closures without triggering re-render)
  const activeClipRef = useRef(activeClip);
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const playbackSpeedRef = useRef(playbackSpeed);
  const clipSpeedRef = useRef(clipSpeed);
  const clipFadeInRef = useRef(clipFadeIn);
  const clipFadeOutRef = useRef(clipFadeOut);

  // Keep stable refs in sync
  useEffect(() => { activeClipRef.current = activeClip; }, [activeClip]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { clipSpeedRef.current = clipSpeed; }, [clipSpeed]);
  useEffect(() => { clipFadeInRef.current = clipFadeIn; }, [clipFadeIn]);
  useEffect(() => { clipFadeOutRef.current = clipFadeOut; }, [clipFadeOut]);

  // ── Local UI state ──
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoRetryCount, setVideoRetryCount] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Cache image elements for image clips to avoid re-creating on each render frame
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // ── Canvas resize via ResizeObserver ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Image cache preloading when media changes ──
  useEffect(() => {
    if (!media || media.type !== 'image' || !media.thumbnailUrl || media.thumbnailUrl === '/placeholder.png') return;
    if (imageCache.current.has(media.thumbnailUrl)) return;
    const img = new window.Image();
    img.src = media.thumbnailUrl;
    imageCache.current.set(media.thumbnailUrl, img);
  }, [media]);

  // ── Canvas render (rAF loop) ──
  // Store render-critical values in a single ref object to avoid stale closures in rAF
  const renderStateRef = useRef({
    filterString,
    opacity: clipEffects.opacity,
    fadeIn: clipFadeIn,
    fadeOut: clipFadeOut,
  });
  useEffect(() => {
    renderStateRef.current = {
      filterString,
      opacity: clipEffects.opacity,
      fadeIn: clipFadeIn,
      fadeOut: clipFadeOut,
    };
  });

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const { width, height } = canvasSize;
    if (!canvas || width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const clip = activeClipRef.current;
    const rs = renderStateRef.current;

    if (video && video.readyState >= 2 && clip && media?.type === 'video') {
      const vAspect = video.videoWidth / video.videoHeight;
      const cAspect = width / height;
      let dw: number, dh: number, dx: number, dy: number;
      if (vAspect > cAspect) {
        dw = width; dh = width / vAspect; dx = 0; dy = (height - dh) / 2;
      } else {
        dh = height; dw = height * vAspect; dx = (width - dw) / 2; dy = 0;
      }

      const fadeAlpha = calculateFadeAlpha(currentTimeRef.current, clip.startTime, clip.duration, rs.fadeIn, rs.fadeOut);
      ctx.filter = rs.filterString;
      ctx.globalAlpha = Math.max(0, Math.min(1, rs.opacity * fadeAlpha));
      ctx.drawImage(video, dx, dy, dw, dh);

    } else if (media?.type === 'image' && media.thumbnailUrl && media.thumbnailUrl !== '/placeholder.png') {
      const img = imageCache.current.get(media.thumbnailUrl);
      if (img && img.complete && img.naturalWidth > 0) {
        const iAspect = img.naturalWidth / img.naturalHeight;
        const cAspect = width / height;
        let dw: number, dh: number, dx: number, dy: number;
        if (iAspect > cAspect) {
          dw = width; dh = width / iAspect; dx = 0; dy = (height - dh) / 2;
        } else {
          dh = height; dw = height * iAspect; dx = (width - dw) / 2; dy = 0;
        }
        ctx.filter = rs.filterString;
        ctx.globalAlpha = Math.max(0, Math.min(1, rs.opacity));
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    }

    ctx.restore();
  }, [canvasSize, media]); // media identity change triggers a new stable callback

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      renderCanvas();
      rafRef.current = requestAnimationFrame(loop);
    };
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      renderCanvas();
    }
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, renderCanvas]);

  useEffect(() => {
    if (!isPlaying) renderCanvas();
  }, [currentTime, isPlaying, renderCanvas, videoReady]);

  // ── Video source loading ──
  const loadVideoSource = useCallback((video: HTMLVideoElement, url: string) => {
    setVideoError(false);
    setVideoReady(false);
    setVideoLoading(true);
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    video.removeAttribute('crossorigin');
    video.src = url;
    video.preload = 'auto';
    video.load();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const key = `${activeClipId}:${media?.url ?? ''}`;
    if (key === lastClipKeyRef.current) return;
    lastClipKeyRef.current = key;
    setVideoRetryCount(0);
    if (media?.url) {
      loadVideoSource(video, media.url);
    } else {
      setVideoLoading(false);
      setVideoReady(false);
    }
  }, [activeClipId, media, loadVideoSource]);

  // ── Video event handlers ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const markReady = () => {
      setVideoLoading(false);
      setVideoReady(true);
      setVideoError(false);
      setVideoRetryCount(0);
      renderCanvas();
    };
    const onCanPlay = markReady;
    const onLoadedData = markReady;
    const onWaiting = () => setVideoLoading(true);
    const onSeeked = () => renderCanvas();
    const onPlaying = markReady;
    const onError = () => {
      setVideoLoading(false);
      setVideoError(true);
      setVideoReady(false);
      setVideoRetryCount((prev) => {
        const next = prev + 1;
        if (next < MAX_VIDEO_RETRIES) {
          const delay = RETRY_DELAYS[Math.min(next - 1, RETRY_DELAYS.length - 1)];
          retryTimerRef.current = setTimeout(() => {
            const v = videoRef.current;
            const url = v?.src;
            if (v && url) {
              v.src = '';
              v.load();
              setTimeout(() => { v.src = url; v.load(); }, 50);
            }
          }, delay);
        }
        return next;
      });
    };

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
    };
  }, [activeClipId, renderCanvas]);

  useEffect(() => () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); }, []);

  const handleRetryVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || !media?.url) return;
    setVideoRetryCount(0);
    setVideoError(false);
    loadVideoSource(video, media.url);
  }, [media, loadVideoSource]);

  // ── Seek sync when paused ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip || !media || videoError || !videoReady || isPlaying) return;
    const clipTime = currentTime - activeClip.startTime + activeClip.trimStart;
    if (Math.abs(video.currentTime - clipTime) > 0.1) {
      video.currentTime = clipTime;
    } else {
      renderCanvas();
    }
  }, [currentTime, activeClip, media, isPlaying, videoError, videoReady, renderCanvas]);

  // ── Play/pause + rate sync ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!activeClip || videoError || !videoReady) {
      video.pause();
      return;
    }
    if (isPlaying) {
      const clipTime = currentTime - activeClip.startTime + activeClip.trimStart;
      if (Math.abs(video.currentTime - clipTime) > 0.1) video.currentTime = clipTime;
      video.playbackRate = playbackSpeed * clipSpeed;
      video.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, activeClip, videoError, videoReady, playbackSpeed, clipSpeed, setIsPlaying]); // intentionally excludes currentTime to avoid re-seeking during playback

  // Keep playback rate synced mid-play without seeking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;
    video.playbackRate = playbackSpeed * clipSpeed;
  }, [playbackSpeed, clipSpeed, isPlaying]);

  // ── Volume sync ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted || isTrackMuted;
    const fadeAlpha = activeClip && isPlaying
      ? calculateFadeAlpha(currentTime, activeClip.startTime, activeClip.duration, clipFadeIn, clipFadeOut)
      : 1;
    video.volume = Math.max(0, Math.min(1, volume * clipVolume * fadeAlpha));
  }, [isMuted, isTrackMuted, volume, clipVolume, clipFadeIn, clipFadeOut, activeClip, currentTime, isPlaying]);

  // ── rAF-based time update during playback (smooth playhead) ──
  useEffect(() => {
    if (!isPlaying) return;
    const tick = () => {
      const video = videoRef.current;
      const clip = activeClipRef.current;
      if (!video || !clip || video.paused) { timeRafRef.current = requestAnimationFrame(tick); return; }

      const sourceTime = video.currentTime;
      const trimEnd = clip.trimEnd ?? 0;
      if (sourceTime >= clip.trimStart + clip.duration - trimEnd) {
        setIsPlaying(false);
        setCurrentTime(clip.startTime + clip.duration);
        return;
      }
      const timelineTime = clip.startTime + sourceTime - clip.trimStart;
      const now = performance.now();
      const last = lastPublishedTimeRef.current;
      if (now - last.at >= PLAYBACK_TIME_PUBLISH_INTERVAL_MS || Math.abs(timelineTime - last.time) >= 0.25) {
        lastPublishedTimeRef.current = { time: timelineTime, at: now };
        setCurrentTime(timelineTime);
      } else {
        currentTimeRef.current = timelineTime;
      }
      timeRafRef.current = requestAnimationFrame(tick);
    };
    timeRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timeRafRef.current);
  }, [isPlaying, setCurrentTime, setIsPlaying]);

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { el.requestFullscreen().catch(() => { }); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Frame stepping ──
  const stepFrame = useCallback((direction: 1 | -1) => {
    setIsPlaying(false);
    setCurrentTime((t) => Math.max(0, t + direction * FRAME_DURATION));
  }, [setIsPlaying, setCurrentTime]);

  // ── Speed cycling (used by shuttle) ──
  const cycleSpeed = useCallback((direction: 1 | -1) => {
    const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeedRef.current as typeof PLAYBACK_SPEEDS[number]);
    const current = idx === -1 ? PLAYBACK_SPEEDS.indexOf(1) : idx;
    const next = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, current + direction));
    setPlaybackSpeed(PLAYBACK_SPEEDS[next]);
  }, [setPlaybackSpeed]);

  // ── Shuttle (J/K/L) ──
  const handleShuttle = useCallback((key: 'j' | 'k' | 'l') => {
    if (key === 'k') { setIsPlaying(false); return; }
    if (key === 'l') {
      if (!isPlayingRef.current) { setPlaybackSpeed(1); setIsPlaying(true); }
      else cycleSpeed(1);
    }
    if (key === 'j') {
      if (!isPlayingRef.current) stepFrame(-1);
      else cycleSpeed(-1);
    }
  }, [setIsPlaying, setPlaybackSpeed, cycleSpeed, stepFrame]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'j': e.preventDefault(); handleShuttle('j'); break;
        case 'k': e.preventDefault(); handleShuttle('k'); break;
        case 'l': e.preventDefault(); handleShuttle('l'); break;
        case ',': e.preventDefault(); stepFrame(-1); break;
        case '.': e.preventDefault(); stepFrame(1); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, handleShuttle, stepFrame]);

  // ── Seek handler (stable) ──
  const handleSeek = useCallback((v: number[]) => {
    setCurrentTime(v[0]);
    setIsPlaying(false);
  }, [setCurrentTime, setIsPlaying]);

  // ── Transport callbacks (stable) ──
  const handleSeekToStart = useCallback(() => { setCurrentTime(0); setIsPlaying(false); }, [setCurrentTime, setIsPlaying]);
  const handleSeekToEnd = useCallback(() => setCurrentTime(totalDuration), [setCurrentTime, totalDuration]);
  const handleStepBack = useCallback(() => stepFrame(-1), [stepFrame]);
  const handleStepForward = useCallback(() => stepFrame(1), [stepFrame]);
  const handleVolumeChange = useCallback((v: number) => { setVolume(v); if (v > 0) setIsMuted(false); }, []);
  const handleMuteToggle = useCallback(() => setIsMuted((m) => !m), []);

  // ── Derived display flags ──
  const showVideo = !!(media?.type === 'video' && !videoError && media.url);
  const showVideoFallback = !!(media?.type === 'video' && videoError);
  const showAudio = !activeClip && !!audioMedia && !!activeAudioClip;
  const showEmpty = !showVideo && !showVideoFallback && !showAudio;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="flex flex-col h-full bg-black" ref={containerRef}>
      {/* Preview Display Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0 bg-black">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ background: '#000' }}
        />

        {/* Hidden video source element */}
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          preload="auto"
          muted={isMuted}
          style={{ background: '#000' }}
        />

        {/* Text overlay DOM layer */}
        {textOverlays.length > 0 && showVideo && (
          <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
            <TextOverlayRenderer overlays={textOverlays} currentTime={currentTime} />
          </div>
        )}

        {brandKit.logoUrl && brandKit.watermarkEnabled && showVideo && (
          <img
            src={brandKit.logoUrl}
            alt={`${brandKit.name || 'Brand'} watermark`}
            className={`pointer-events-none absolute z-10 max-h-12 max-w-28 rounded-lg object-contain opacity-85 drop-shadow-[0_8px_20px_rgba(0,0,0,0.65)] ${getWatermarkPositionClass(brandKit.watermarkPosition)}`}
          />
        )}

        {/* Buffering indicator */}
        {videoLoading && activeClip && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <Loader2 className="h-8 w-8 animate-spin text-[#ffb32c]" />
          </div>
        )}

        {/* Clip info HUD */}
        {showVideo && activeClip && videoReady && (
          <ClipInfoOverlay
            clipLabel={activeClip.label}
            mediaName={media!.name}
            mediaWidth={media!.width}
            mediaHeight={media!.height}
            trimStart={activeClip.trimStart}
            trimEnd={activeClip.trimEnd}
            duration={activeClip.duration}
            startTime={activeClip.startTime}
            clipSpeed={clipSpeed}
          />
        )}

        {showVideoFallback && activeClip && media && (
          <VideoFallbackPreview
            mediaName={media.name}
            mediaThumbnail={media.thumbnailUrl}
            mediaWidth={media.width}
            mediaHeight={media.height}
            clipLabel={activeClip.label}
            retryCount={videoRetryCount}
            onRetry={handleRetryVideo}
            canRetry={videoRetryCount < MAX_VIDEO_RETRIES}
          />
        )}

        {showAudio && audioMedia && activeAudioClip && (
          <AudioPreviewState
            mediaName={audioMedia.name}
            clipLabel={activeAudioClip.label}
            clipDuration={activeAudioClip.duration}
          />
        )}

        {showEmpty && <EmptyPreviewState />}
      </div>

      {/* Transport + Seekbar */}
      <TransportControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        totalClips={totalClips}
        playbackSpeed={playbackSpeed}
        isMuted={isMuted}
        volume={volume}
        volumeOpen={volumeOpen}
        isFullscreen={isFullscreen}
        onTogglePlay={togglePlay}
        onSeekToStart={handleSeekToStart}
        onSeekToEnd={handleSeekToEnd}
        onStepBack={handleStepBack}
        onStepForward={handleStepForward}
        onSeek={handleSeek}
        onSetSpeed={setPlaybackSpeed}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onVolumeOpenChange={setVolumeOpen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
};

export default VideoPreview;
