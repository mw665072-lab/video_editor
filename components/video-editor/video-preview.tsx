'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useEditorStore, type ClipEffects, type ColorGrading, type TextOverlay } from '@/lib/editor-store';
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

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_FPS = 30;
const MAX_VIDEO_RETRIES = 3;
const RETRY_DELAYS = [500, 1500, 3000];

// ============================================================
// Helpers
// ============================================================

function formatTimeCode(seconds: number, fps: number = DEFAULT_FPS): string {
  const totalSeconds = Math.max(0, seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds % 1) * fps);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
}

/** Build a CSS filter string from ClipEffects */
function buildFilterString(effects: ClipEffects): string {
  const filters: string[] = [];
  filters.push(`brightness(${1 + effects.brightness / 100})`);
  filters.push(`contrast(${1 + effects.contrast / 100})`);
  filters.push(`saturate(${1 + effects.saturation / 100})`);
  filters.push(`hue-rotate(${effects.hue}deg)`);
  if (effects.blur > 0) filters.push(`blur(${effects.blur}px)`);
  return filters.join(' ');
}

/** Apply effects to a canvas context */
function applyEffects(ctx: CanvasRenderingContext2D, effects: ClipEffects, colorGrading: ColorGrading) {
  // Build CSS filter string from effects
  const filters: string[] = [];
  filters.push(`brightness(${1 + effects.brightness / 100})`);
  filters.push(`contrast(${1 + effects.contrast / 100})`);
  filters.push(`saturate(${1 + effects.saturation / 100})`);
  filters.push(`hue-rotate(${effects.hue}deg)`);
  if (effects.blur > 0) filters.push(`blur(${effects.blur}px)`);

  // Color grading: temperature → sepia + hue-rotate combination
  if (colorGrading.temperature > 0) {
    filters.push(`sepia(${colorGrading.temperature * 0.4}%)`);
  } else if (colorGrading.temperature < 0) {
    filters.push(`sepia(${Math.abs(colorGrading.temperature) * 0.4}%) hue-rotate(${180 + colorGrading.temperature}deg)`);
  }
  // Color grading: tint → slight hue-rotate shift
  if (Math.abs(colorGrading.tint) > 0) {
    filters.push(`hue-rotate(${colorGrading.tint * 0.3}deg)`);
  }
  // Color grading: lift (shadows), gamma (midtones), gain (highlights) — approximated via CSS filters
  const liftAvg = (colorGrading.lift.r + colorGrading.lift.g + colorGrading.lift.b) / 3;
  const gammaAvg = (colorGrading.gamma.r + colorGrading.gamma.g + colorGrading.gamma.b) / 3;
  const gainAvg = (colorGrading.gain.r + colorGrading.gain.g + colorGrading.gain.b) / 3;
  if (Math.abs(liftAvg) > 0.01) {
    // Affects shadows — approximated with brightness on dark areas
    filters.push(`brightness(${1 + liftAvg * 0.3})`);
  }
  if (Math.abs(gammaAvg) > 0.01) {
    // Affects midtones — approximated with contrast
    filters.push(`contrast(${1 + gammaAvg * 0.3})`);
  }
  if (Math.abs(gainAvg) > 0.01) {
    // Affects highlights — approximated with brightness
    filters.push(`brightness(${1 + gainAvg * 0.3})`);
  }

  ctx.filter = filters.join(' ');
  ctx.globalAlpha = Math.max(0, Math.min(1, effects.opacity));
}

/** Calculate fade alpha for a clip at a given timeline time */
function calculateFadeAlpha(
  currentTime: number,
  clipStartTime: number,
  clipDuration: number,
  fadeInDuration: number,
  fadeOutDuration: number,
): number {
  let alpha = 1;
  const elapsed = currentTime - clipStartTime;

  // Fade in
  if (fadeInDuration > 0 && elapsed < fadeInDuration) {
    alpha = Math.min(1, elapsed / fadeInDuration);
  }

  // Fade out
  if (fadeOutDuration > 0 && elapsed > clipDuration - fadeOutDuration) {
    const remaining = clipDuration - elapsed;
    alpha = Math.min(alpha, remaining / fadeOutDuration);
  }

  return Math.max(0, Math.min(1, alpha));
}

/** Calculate text animation transform/style */
function getTextAnimationStyle(
  overlay: TextOverlay,
  currentTime: number,
): React.CSSProperties {
  const elapsed = currentTime - overlay.startTime;
  const duration = overlay.animationDuration > 0 ? overlay.animationDuration : 0.5;
  const progress = Math.min(1, Math.max(0, elapsed / duration));

  const baseStyle: React.CSSProperties = {
    opacity: 1,
    transform: 'none',
  };

  switch (overlay.animation) {
    case 'fadeIn':
      return { ...baseStyle, opacity: progress };
    case 'fadeOut':
      return { ...baseStyle, opacity: 1 - progress };
    case 'typewriter':
      return { ...baseStyle, clipPath: `inset(0 ${100 - progress * 100}% 0 0)` };
    case 'slideLeft': {
      const offset = (1 - progress) * 100;
      return { ...baseStyle, transform: `translateX(${offset}px)`, opacity: progress };
    }
    case 'slideRight': {
      const offset = (1 - progress) * -100;
      return { ...baseStyle, transform: `translateX(${offset}px)`, opacity: progress };
    }
    case 'slideUp': {
      const offset = (1 - progress) * 100;
      return { ...baseStyle, transform: `translateY(${offset}px)`, opacity: progress };
    }
    case 'slideDown': {
      const offset = (1 - progress) * -100;
      return { ...baseStyle, transform: `translateY(${offset}px)`, opacity: progress };
    }
    case 'bounce': {
      const bounceProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      return { ...baseStyle, transform: `translateY(${(1 - bounceProgress) * -30}px)` };
    }
    case 'glitch': {
      const glitchOffset = Math.sin(elapsed * 20) * 3;
      const skewX = Math.sin(elapsed * 15) * 2;
      return {
        ...baseStyle,
        transform: `translateX(${glitchOffset}px) skewX(${skewX}deg)`,
        opacity: 0.8 + Math.random() * 0.2,
      };
    }
    default:
      return baseStyle;
  }
}

// ============================================================
// Empty State Component
// ============================================================

const EmptyPreviewState: React.FC = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center select-none overflow-hidden bg-black">
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Film icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
          <Clapperboard className="w-9 h-9 text-zinc-500" strokeWidth={1.5} />
        </div>
        <div className="absolute -inset-2 rounded-3xl border border-zinc-700/20 animate-[ping_3s_ease-in-out_infinite]" />
      </div>

      {/* Animated text */}
      <p className="text-zinc-500 text-sm font-medium animate-[fadeInUp_0.6s_ease-out]">
        Drop media to preview
      </p>
      <p className="text-zinc-600 text-xs mt-2 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
        Add clips to the timeline to get started
      </p>
      <div className="flex items-center gap-3 mt-4 animate-[fadeInUp_0.6s_ease-out_0.4s_both]">
        <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700/50 rounded text-[10px] text-zinc-500 font-mono">
          Space
        </kbd>
        <span className="text-zinc-600 text-[10px]">Play / Pause</span>
        <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700/50 rounded text-[10px] text-zinc-500 font-mono">
          J K L
        </kbd>
        <span className="text-zinc-600 text-[10px]">Shuttle</span>
      </div>
    </div>
  );
};

// ============================================================
// Loading State
// ============================================================

const LoadingPreviewState: React.FC<{ name?: string }> = ({ name }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black select-none">
      <div className="w-12 h-12 rounded-full bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
      <p className="text-zinc-400 text-xs font-medium">Loading media...</p>
      {name && (
        <p className="text-zinc-600 text-[10px] mt-1 max-w-[200px] truncate">{name}</p>
      )}
    </div>
  );
};

// ============================================================
// Video Error / Fallback State
// ============================================================

const VideoFallbackPreview: React.FC<{
  media: { thumbnailUrl: string; name: string; width: number; height: number };
  clip: { startTime: number; duration: number; trimStart: number; trimEnd: number; label?: string };
  retryCount: number;
  onRetry: () => void;
  canRetry: boolean;
}> = ({ media, clip, retryCount, onRetry, canRetry }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black select-none overflow-hidden">
      {media.thumbnailUrl && media.thumbnailUrl !== '/placeholder.png' ? (
        <img
          src={media.thumbnailUrl}
          alt={media.name}
          className="max-w-full max-h-full object-contain"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="w-12 h-12 text-zinc-600" />
          <p className="text-zinc-500 text-xs">Video preview unavailable</p>
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-[11px] text-zinc-300 border border-zinc-700/30 space-y-0.5 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <Film className="w-3 h-3 text-zinc-500" />
            <span className="text-zinc-200 font-medium truncate max-w-[200px]">
              {clip.label || media.name}
            </span>
          </div>
        </div>
        <div className="bg-amber-500/20 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-amber-400 border border-amber-500/30 pointer-events-none">
          Static preview
        </div>
      </div>

      {media.width > 0 && media.height > 0 && (
        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded px-2 py-0.5 text-[10px] text-zinc-400 font-mono pointer-events-none">
          {media.width}×{media.height}
        </div>
      )}

      {canRetry && (
        <div className="absolute top-2 left-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[10px] text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg px-2"
            onClick={onRetry}
          >
            <RotateCcw className="w-3 h-3" />
            Retry{retryCount > 0 ? ` (${retryCount}/${MAX_VIDEO_RETRIES})` : ''}
          </Button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Audio Preview State
// ============================================================

const AudioPreviewState: React.FC<{
  media: { name: string; thumbnailUrl: string };
  clip: { label?: string; startTime: number; duration: number };
}> = ({ media, clip }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black select-none overflow-hidden">
      {/* Animated audio visualization */}
      <div className="absolute inset-0 flex items-end justify-center gap-1 px-8 pb-16 opacity-20">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 bg-violet-500 rounded-full animate-[audioBar_1.2s_ease-in-out_infinite]"
            style={{
              height: `${20 + Math.sin(i * 0.5) * 30}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.8 + Math.random() * 0.8}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mb-4 z-10">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Music className="w-8 h-8 text-violet-400" />
        </div>
      </div>

      <p className="text-zinc-300 text-sm font-medium z-10 truncate max-w-[300px] px-4 text-center">
        {clip.label || media.name}
      </p>
      <p className="text-zinc-600 text-xs mt-1 z-10">
        Audio clip · {formatTimeCode(clip.duration)}
      </p>

      <div className="flex items-center gap-1.5 mt-4 z-10">
        <div className="w-1 h-3 bg-emerald-400 rounded-full animate-[audioBar_0.6s_ease-in-out_infinite]" />
        <div className="w-1 h-4 bg-emerald-400 rounded-full animate-[audioBar_0.6s_ease-in-out_infinite_0.2s]" />
        <div className="w-1 h-2 bg-emerald-400 rounded-full animate-[audioBar_0.6s_ease-in-out_infinite_0.4s]" />
        <span className="text-emerald-400 text-[10px] ml-1 font-medium">NOW PLAYING</span>
      </div>
    </div>
  );
};

// ============================================================
// Volume Popup Content
// ============================================================

const VolumePopup: React.FC<{
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
}> = ({ volume, isMuted, onVolumeChange, onMuteToggle }) => {
  const displayVolume = isMuted ? 0 : volume * 100;

  return (
    <div className="flex flex-col items-center gap-3 p-3 w-48">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-400 hover:text-white"
        onClick={onMuteToggle}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="w-4 h-4" />
        ) : volume < 0.5 ? (
          <Volume1 className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </Button>

      <div className="w-full flex items-center justify-center h-32">
        <Slider
          value={[displayVolume]}
          onValueChange={(v) => { onVolumeChange(v[0] / 100); }}
          max={100}
          step={1}
          orientation="vertical"
          className="h-full"
        />
      </div>

      <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
        {Math.round(displayVolume)}%
      </span>
    </div>
  );
};

// ============================================================
// Text Overlay Renderer (DOM layer on top of canvas)
// ============================================================

const TextOverlayRenderer: React.FC<{
  overlays: TextOverlay[];
  currentTime: number;
  canvasWidth: number;
  canvasHeight: number;
}> = ({ overlays, currentTime, canvasWidth, canvasHeight }) => {
  if (canvasWidth === 0 || canvasHeight === 0) return null;

  return (
    <>
      {overlays.map((overlay) => {
        const elapsed = currentTime - overlay.startTime;
        const animationStyle = getTextAnimationStyle(overlay, currentTime);
        const isAnimated = overlay.animation !== 'none';

        // For typewriter animation, calculate visible text
        let displayText = overlay.text;
        if (overlay.animation === 'typewriter') {
          const duration = overlay.animationDuration > 0 ? overlay.animationDuration : 0.5;
          const progress = Math.min(1, Math.max(0, elapsed / duration));
          const charCount = Math.floor(progress * overlay.text.length);
          displayText = overlay.text.substring(0, charCount);
        }

        return (
          <div
            key={overlay.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${overlay.x * 100}%`,
              top: `${overlay.y * 100}%`,
              transform: animationStyle.transform || undefined,
              opacity: animationStyle.opacity !== undefined ? animationStyle.opacity : 1,
              transition: isAnimated ? 'none' : undefined,
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
              ...(overlay.rotation ? { transform: `rotate(${overlay.rotation}deg)` } : {}),
            }}
          >
            {displayText}
          </div>
        );
      })}
    </>
  );
};

// ============================================================
// Main Component
// ============================================================

const VideoPreview: React.FC = () => {
  const store = useEditorStore();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderFrameRef = useRef<number>(0);
  const timeUpdateFrameRef = useRef<number>(0);
  const lastActiveClipKeyRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local UI state
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [volumeOpen, setVolumeOpen] = useState(false);

  // Video loading/error state
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoRetryCount, setVideoRetryCount] = useState(0);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // ============================================================
  // Derived state from store
  // ============================================================
  const activeClip = store.getActiveVideoAtTime(store.currentTime);
  const media = activeClip ? store.getMediaFile(activeClip.mediaId) : null;
  const activeClipId = activeClip?.id ?? null;

  // Get active audio clip
  const activeAudioClip = useEditorStore((s) => {
    for (const track of s.tracks) {
      if (track.type !== 'audio' || track.muted || !track.visible) continue;
      for (let i = track.clips.length - 1; i >= 0; i--) {
        const clip = track.clips[i];
        if (s.currentTime >= clip.startTime && s.currentTime < clip.startTime + clip.duration) {
          return clip;
        }
      }
    }
    return null;
  });
  const audioMedia = activeAudioClip ? useEditorStore.getState().getMediaFile(activeAudioClip.mediaId) : null;

  // Get text overlays at current time
  const textOverlays = store.getTextOverlaysAtTime(store.currentTime);

  // Total clip count
  const totalClips = store.tracks.reduce((sum, track) => sum + track.clips.length, 0);

  // Get clip effects (with safe defaults for clips created before effects existed)
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
  }), [activeClip?.effects?.brightness, activeClip?.effects?.contrast, activeClip?.effects?.saturation, activeClip?.effects?.hue, activeClip?.effects?.blur, activeClip?.effects?.sharpen, activeClip?.effects?.opacity, activeClip?.effects?.speed, activeClip?.effects?.volume, activeClip?.effects?.fadeInDuration, activeClip?.effects?.fadeOutDuration]);

  const clipColorGrading: ColorGrading = useMemo(() => ({
    lift: { r: activeClip?.colorGrading?.lift?.r ?? 0, g: activeClip?.colorGrading?.lift?.g ?? 0, b: activeClip?.colorGrading?.lift?.b ?? 0 },
    gamma: { r: activeClip?.colorGrading?.gamma?.r ?? 0, g: activeClip?.colorGrading?.gamma?.g ?? 0, b: activeClip?.colorGrading?.gamma?.b ?? 0 },
    gain: { r: activeClip?.colorGrading?.gain?.r ?? 0, g: activeClip?.colorGrading?.gain?.g ?? 0, b: activeClip?.colorGrading?.gain?.b ?? 0 },
    temperature: activeClip?.colorGrading?.temperature ?? 0,
    tint: activeClip?.colorGrading?.tint ?? 0,
  }), [activeClip?.colorGrading]);

  // Clip speed and volume (from effects object on TimelineClip)
  const clipSpeed = clipEffects.speed;
  const clipVolume = clipEffects.volume;
  const clipFadeIn = clipEffects.fadeInDuration;
  const clipFadeOut = clipEffects.fadeOutDuration;

  // ============================================================
  // Canvas resize handling
  // ============================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(container);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  // ============================================================
  // Canvas rendering loop
  // ============================================================
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution to match display size
    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    // Clear canvas with black
    ctx.save();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If video is ready and playing/visible, draw frame with effects
    if (video && video.readyState >= 2 && activeClip && media && media.type === 'video') {
      // Calculate letterboxing/pillarboxing to maintain aspect ratio
      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = canvas.width / canvas.height;
      let drawWidth: number;
      let drawHeight: number;
      let drawX: number;
      let drawY: number;

      if (videoAspect > canvasAspect) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / videoAspect;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * videoAspect;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      }

      // Apply effects
      applyEffects(ctx, clipEffects, clipColorGrading);

      // Calculate fade alpha (composited with effects opacity)
      const fadeAlpha = calculateFadeAlpha(
        store.currentTime,
        activeClip.startTime,
        activeClip.duration,
        clipFadeIn,
        clipFadeOut,
      );

      // Apply fade alpha on top of effects opacity
      ctx.globalAlpha = Math.max(0, Math.min(1, ctx.globalAlpha * fadeAlpha));

      // Draw video frame
      ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
    } else if (media && media.type === 'image' && media.thumbnailUrl && media.thumbnailUrl !== '/placeholder.png') {
      // For image clips, draw from thumbnail
      const img = new window.Image();
      img.onload = () => {
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = canvas.width / canvas.height;
        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (imgAspect > canvasAspect) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgAspect;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgAspect;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        }

        applyEffects(ctx, clipEffects, clipColorGrading);
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      };
      img.src = media.thumbnailUrl;
    }

    ctx.restore();
  }, [canvasSize, activeClip, media, clipEffects, clipColorGrading, clipFadeIn, clipFadeOut, store.currentTime]);

  // Canvas render loop
  useEffect(() => {
    let running = true;

    const loop = () => {
      if (!running) return;
      renderCanvas();
      renderFrameRef.current = requestAnimationFrame(loop);
    };

    // Start render loop when there's an active clip
    if (activeClip || store.isPlaying) {
      renderFrameRef.current = requestAnimationFrame(loop);
    } else {
      // Still render once when not playing (for static display)
      renderCanvas();
    }

    return () => {
      running = false;
      cancelAnimationFrame(renderFrameRef.current);
    };
  }, [activeClip, store.isPlaying, renderCanvas]);

  // ============================================================
  // Video load helper
  // ============================================================
  const loadVideoSource = useCallback(
    (video: HTMLVideoElement, url: string) => {
      setVideoError(false);
      setVideoReady(false);
      setVideoLoading(true);

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      video.removeAttribute('crossorigin');
      video.src = url;
      video.preload = 'auto';
      video.load();
    },
    [],
  );

  // ============================================================
  // Sync video source when active clip changes
  // ============================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const clipKey = `${activeClipId}:${media?.url ?? ''}`;

    if (clipKey !== lastActiveClipKeyRef.current) {
      lastActiveClipKeyRef.current = clipKey;
      setVideoRetryCount(0);

      if (media && media.url) {
        loadVideoSource(video, media.url);
      } else {
        setVideoLoading(false);
        setVideoReady(false);
      }
    }
  }, [activeClipId, media, loadVideoSource]);

  // Auto-play when video becomes ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoReady || !activeClip || videoError) return;

    if (store.isPlaying) {
      const clipTime = store.currentTime - activeClip.startTime + activeClip.trimStart;
      if (Math.abs(video.currentTime - clipTime) < 0.5) {
        video.playbackRate = store.playbackSpeed * clipSpeed;
        video.play().catch(() => {});
      }
    }
  }, [videoReady, store.isPlaying, activeClip, store.currentTime, videoError, store.playbackSpeed, clipSpeed]);

  // ============================================================
  // Video event handlers
  // ============================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setVideoLoading(false);
      setVideoReady(true);
      setVideoError(false);
      setVideoRetryCount(0);
    };

    const handleWaiting = () => {
      setVideoLoading(true);
    };

    const handlePlaying = () => {
      setVideoLoading(false);
      setVideoReady(true);
      setVideoError(false);
    };

    const handleError = () => {
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

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
    };
  }, [activeClipId]);

  // Clean up retry timers
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // ============================================================
  // Manual retry
  // ============================================================
  const handleRetryVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || !media?.url) return;
    setVideoRetryCount(0);
    setVideoError(false);
    loadVideoSource(video, media.url);
  }, [media, loadVideoSource]);

  // ============================================================
  // Sync playback position when not playing
  // ============================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip || !media || videoError || !videoReady) return;

    if (!store.isPlaying) {
      const clipTime = store.currentTime - activeClip.startTime + activeClip.trimStart;
      if (Math.abs(video.currentTime - clipTime) > 0.1) {
        video.currentTime = clipTime;
      }
    }
  }, [store.currentTime, activeClip, media, store.isPlaying, videoError, videoReady]);

  // ============================================================
  // Play/Pause sync with speed
  // ============================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!activeClip || videoError) {
      video.pause();
      return;
    }

    if (!videoReady) return;

    if (store.isPlaying) {
      const clipTime = store.currentTime - activeClip.startTime + activeClip.trimStart;
      if (Math.abs(video.currentTime - clipTime) > 0.1) {
        video.currentTime = clipTime;
      }
      // Apply combined speed: global playback speed * clip-specific speed
      video.playbackRate = store.playbackSpeed * clipSpeed;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [store.isPlaying, activeClip, videoError, videoReady, store.playbackSpeed, clipSpeed]);

  // Keep playback rate in sync when speed changes during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (store.isPlaying) {
      video.playbackRate = store.playbackSpeed * clipSpeed;
    }
  }, [store.playbackSpeed, clipSpeed, store.isPlaying]);

  // ============================================================
  // Handle video time update during playback
  // ============================================================
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeClip || !store.isPlaying) return;

    const sourceTime = video.currentTime;
    const timelineTime = activeClip.startTime + sourceTime - activeClip.trimStart;

    if (sourceTime >= activeClip.trimStart + activeClip.duration - activeClip.trimEnd) {
      store.setIsPlaying(false);
      store.setCurrentTime(activeClip.startTime + activeClip.duration);
      return;
    }

    store.setCurrentTime(timelineTime);
  }, [activeClip, store]);

  // ============================================================
  // Animation loop for smooth playhead
  // ============================================================
  useEffect(() => {
    if (store.isPlaying) {
      const tick = () => {
        const video = videoRef.current;
        if (video && !video.paused) {
          handleTimeUpdate();
        }
        timeUpdateFrameRef.current = requestAnimationFrame(tick);
      };
      timeUpdateFrameRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(timeUpdateFrameRef.current);
    }
  }, [store.isPlaying, handleTimeUpdate]);

  // Check if the active clip's track is muted
  const isTrackMuted = useMemo(() => {
    if (!activeClip) return false;
    const track = useEditorStore.getState().tracks.find(
      (t) => t.id === store.tracks.find((t) => t.clips.some((c) => c.id === activeClip.id))?.id
    );
    return track?.muted ?? false;
  }, [activeClip, store.tracks]);

  // ============================================================
  // Volume & audio fade control
  // ============================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Mute video element if user muted OR track is muted
    video.muted = isMuted || isTrackMuted;

    // Apply clip volume * global volume
    const effectiveVolume = volume * clipVolume;

    // Apply fade in/out to volume
    if (activeClip && store.isPlaying) {
      const fadeAlpha = calculateFadeAlpha(
        store.currentTime,
        activeClip.startTime,
        activeClip.duration,
        clipFadeIn,
        clipFadeOut,
      );
      video.volume = effectiveVolume * fadeAlpha;
    } else {
      video.volume = effectiveVolume;
    }
  }, [isMuted, isTrackMuted, volume, clipVolume, clipFadeIn, clipFadeOut, activeClip, store.currentTime, store.isPlaying]);

  // ============================================================
  // Fullscreen toggle
  // ============================================================
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => { setIsFullscreen(!!document.fullscreenElement); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ============================================================
  // Frame stepping
  // ============================================================
  const stepFrame = useCallback(
    (direction: 1 | -1) => {
      store.setIsPlaying(false);
      const step = direction * (1 / DEFAULT_FPS);
      if (direction === 1) {
        store.setCurrentTime(store.currentTime + step);
      } else {
        store.setCurrentTime(Math.max(0, store.currentTime + step));
      }
    },
    [store],
  );

  // ============================================================
  // Cycle playback speed
  // ============================================================
  const cycleSpeed = useCallback(
    (direction: 1 | -1) => {
      const currentIdx = PLAYBACK_SPEEDS.indexOf(store.playbackSpeed);
      let nextIdx: number;
      if (currentIdx === -1) {
        nextIdx = direction === 1 ? PLAYBACK_SPEEDS.indexOf(1) : PLAYBACK_SPEEDS.length - 1;
      } else {
        nextIdx = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, currentIdx + direction));
      }
      store.setPlaybackSpeed(PLAYBACK_SPEEDS[nextIdx]);
    },
    [store],
  );

  // ============================================================
  // J/K/L shuttle control
  // ============================================================
  const handleShuttle = useCallback(
    (key: 'j' | 'k' | 'l') => {
      if (key === 'k') {
        store.setIsPlaying(false);
        return;
      }
      if (key === 'l') {
        if (!store.isPlaying) {
          store.setPlaybackSpeed(1);
          store.setIsPlaying(true);
        } else {
          cycleSpeed(1);
        }
      }
      if (key === 'j') {
        if (!store.isPlaying) {
          stepFrame(-1);
        } else {
          cycleSpeed(-1);
        }
      }
    },
    [store, cycleSpeed, stepFrame],
  );

  // ============================================================
  // Keyboard shortcuts
  // ============================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case ' ':
          e.preventDefault();
          store.togglePlay();
          break;
        case 'j':
          e.preventDefault();
          handleShuttle('j');
          break;
        case 'k':
          e.preventDefault();
          handleShuttle('k');
          break;
        case 'l':
          e.preventDefault();
          handleShuttle('l');
          break;
        case ',':
          e.preventDefault();
          stepFrame(-1);
          break;
        case '.':
          e.preventDefault();
          stepFrame(1);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, stepFrame, handleShuttle]);

  // ============================================================
  // Seek handler
  // ============================================================
  const handleSeek = (value: number[]) => {
    store.setCurrentTime(value[0]);
    store.setIsPlaying(false);
  };

  // ============================================================
  // UI derived values
  // ============================================================
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const speedLabel = store.playbackSpeed === 1 ? '1x' : `${store.playbackSpeed}x`;

  const showVideo = !!(media && media.type === 'video' && !videoError && media.url);
  const showVideoFallback = !!(media && media.type === 'video' && videoError);
  const showAudio = !media && !!audioMedia && !!activeAudioClip;
  const showEmpty = !showVideo && !showVideoFallback && !showAudio;
  const canRetryVideo = videoRetryCount < MAX_VIDEO_RETRIES;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="flex flex-col h-full bg-black" ref={containerRef}>
      {/* Preview Display Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0 bg-black">
        {/* Canvas — main rendering surface for video + effects */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ background: '#000' }}
        />

        {/* Hidden video element for source playback */}
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          preload="auto"
          muted={isMuted}
          autoPlay={store.isPlaying}
          style={{ background: '#000' }}
        />

        {/* Text overlay layer (DOM elements with animations) */}
        {textOverlays.length > 0 && showVideo && (
          <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
            <TextOverlayRenderer
              overlays={textOverlays}
              currentTime={store.currentTime}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
            />
          </div>
        )}

        {/* Loading overlay */}
        {videoLoading && activeClip && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Clip Info Overlay — shown on top of canvas */}
        {showVideo && activeClip && videoReady && (
          <>
            <div className="absolute bottom-2 left-2 z-10 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-[11px] text-zinc-300 border border-zinc-700/30 space-y-0.5 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <Film className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-200 font-medium truncate max-w-[200px]">
                  {activeClip.label || media.name}
                </span>
              </div>
              <div className="text-zinc-500 font-mono tabular-nums">
                <span className="text-zinc-400">
                  {formatTimeCode(activeClip.trimStart)}
                </span>
                {' → '}
                <span className="text-zinc-400">
                  {formatTimeCode(activeClip.trimStart + activeClip.duration - activeClip.trimEnd)}
                </span>
              </div>
              <div className="text-zinc-600 font-mono tabular-nums">
                Timeline: {formatTimeCode(activeClip.startTime)} → {formatTimeCode(activeClip.startTime + activeClip.duration)}
              </div>
              {/* Speed indicator */}
              {clipSpeed !== 1 && (
                <div className="text-amber-400/80 font-mono tabular-nums">
                  Speed: {clipSpeed}x
                </div>
              )}
            </div>

            {/* Resolution overlay */}
            {media.width > 0 && media.height > 0 && (
              <div className="absolute top-2 right-2 z-10 bg-black/50 backdrop-blur-sm rounded px-2 py-0.5 text-[10px] text-zinc-400 font-mono pointer-events-none">
                {media.width}×{media.height}
              </div>
            )}
          </>
        )}

        {/* Video fallback (error state) */}
        {showVideoFallback && activeClip && media && (
          <VideoFallbackPreview
            media={media}
            clip={activeClip}
            retryCount={videoRetryCount}
            onRetry={handleRetryVideo}
            canRetry={canRetryVideo}
          />
        )}

        {/* Audio preview */}
        {showAudio && audioMedia && activeAudioClip && (
          <AudioPreviewState media={audioMedia} clip={activeAudioClip} />
        )}

        {/* Empty state */}
        {showEmpty && <EmptyPreviewState />}
      </div>

      {/* ============================================================ */}
      {/* Transport Controls */}
      {/* ============================================================ */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border-t border-zinc-800">
        {/* Frame step backward */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white"
          onClick={() => stepFrame(-1)}
          title="Previous Frame (,)"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Skip to start */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white"
          onClick={() => { store.setCurrentTime(0); store.setIsPlaying(false); }}
          title="Go to Start"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </Button>

        {/* Play / Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full mx-0.5"
          onClick={store.togglePlay}
          title="Play / Pause (Space)"
        >
          {store.isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>

        {/* Skip to end */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white"
          onClick={() => store.setCurrentTime(store.totalDuration)}
          title="Go to End"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </Button>

        {/* Frame step forward */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white"
          onClick={() => stepFrame(1)}
          title="Next Frame (.)"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-800 mx-1" />

        {/* Time Display */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
          <span className="text-emerald-400">{formatTimeCode(store.currentTime)}</span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-500">{formatTimeCode(store.totalDuration)}</span>
          <span className="text-zinc-700 ml-1.5">|</span>
          <span className="text-zinc-600 ml-1">
            {totalClips} clip{totalClips !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Speed Control */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1 text-[11px] font-mono tabular-nums px-2 ${
                store.playbackSpeed !== 1
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-500 hover:text-white'
              }`}
              title="Playback Speed"
            >
              <Gauge className="w-3 h-3" />
              {speedLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 min-w-[100px]">
            {PLAYBACK_SPEEDS.map((speed) => (
              <DropdownMenuItem
                key={speed}
                className={`text-xs font-mono tabular-nums cursor-pointer ${
                  store.playbackSpeed === speed
                    ? 'text-emerald-400 bg-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                onClick={() => store.setPlaybackSpeed(speed)}
              >
                {speed === 1 ? `${speed}x (Normal)` : `${speed}x`}
                {store.playbackSpeed === speed && (
                  <span className="ml-auto text-emerald-400">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Volume Popup */}
        <Popover open={volumeOpen} onOpenChange={setVolumeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-white"
              title="Volume"
            >
              <VolumeIcon className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            className="bg-zinc-900 border-zinc-800 p-0 w-auto rounded-xl shadow-xl"
          >
            <VolumePopup
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={(v) => { setVolume(v); if (v > 0) setIsMuted(false); }}
              onMuteToggle={() => setIsMuted(!isMuted)}
            />
          </PopoverContent>
        </Popover>

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <Minimize className="w-3.5 h-3.5" />
          ) : (
            <Maximize className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      {/* Seek Bar */}
      <div className="px-3 pb-2 pt-0.5 bg-zinc-900">
        <Slider
          value={[store.currentTime]}
          onValueChange={handleSeek}
          max={store.totalDuration}
          step={0.001}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default VideoPreview;
