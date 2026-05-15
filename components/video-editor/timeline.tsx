'use client';

/**
 * Timeline.tsx — Production-Optimized Video Editor Timeline
 *
 * Performance Architecture:
 * - Granular Zustand selectors: each sub-component subscribes only to what it reads
 * - Canvas-rendered ruler & grid: zero DOM overhead for ruler ticks and grid lines
 * - RAF-throttled mouse/scroll handlers: 60 fps max update rate
 * - Windowed clip rendering: clips outside [scrollX-margin, scrollX+viewportW+margin] are skipped
 * - Stable useCallback deps: store actions extracted as stable references, not the store object
 * - Memoized derived values: track tops, waveform bars, clip dimensions all cached
 * - WaveformBars: bars pre-computed in useMemo, painted on canvas, no JSX loop
 * - ThumbnailStrip: only mounts when clipWidth > threshold
 * - Zero-cost cut line: CSS transform instead of setState on every mousemove pixel
 * - Frozen constants outside component tree to avoid re-creation
 */

import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
  memo,
} from 'react';
import {
  useEditorStore,
  type TimelineClip,
  type TimelineTrack,
  type MediaFile,
} from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronRight,
  Plus,
  Film,
  Music,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================
// Frozen Constants (defined once, never recreated)
// ============================================================

const HEADER_WIDTH = 160 as const;
const RULER_HEIGHT = 30 as const;
const FPS = 30 as const;
const MIN_ZOOM = 5 as const;
const MAX_ZOOM = 500 as const;
const ZOOM_FACTOR = 1.12 as const;
/** Pixels beyond viewport to still render clips (avoid pop-in) */
const RENDER_OVERSCAN = 200 as const;
/** Minimum clip width in px before we stop drawing label text */
const LABEL_THRESHOLD = 40 as const;
const DURATION_THRESHOLD = 100 as const;

// Stable empty array ref used as a fallback to prevent new array allocations
const EMPTY_IDS: string[] = [];

// ============================================================
// Pure Utility Functions (module-level, zero closure cost)
// ============================================================

function formatRulerLabel(seconds: number, tickInterval: number): string {
  const s = Math.max(0, seconds);
  if (tickInterval >= 10) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }
  if (tickInterval >= 1) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }
  const sec = Math.floor(s % 60);
  const ff = Math.floor((s % 1) * FPS);
  return `${sec.toString().padStart(2, '0')}:${ff.toString().padStart(2, '0')}`;
}

function formatClipTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/** Stable deterministic pseudo-random value in [0,1] */
function simpleHash(str: string, i: number): number {
  let h = 0;
  for (let c = 0; c < str.length; c++) {
    h = ((h << 5) - h + str.charCodeAt(c)) | 0;
  }
  h = ((h << 5) - h + i) | 0;
  return (Math.abs(h) % 100) / 100;
}

/** Adaptive tick interval for ruler */
function getTickInterval(totalSeconds: number): number {
  if (totalSeconds > 300) return 30;
  if (totalSeconds > 120) return 10;
  if (totalSeconds > 60) return 5;
  if (totalSeconds > 30) return 2;
  if (totalSeconds > 15) return 1;
  if (totalSeconds > 5) return 0.5;
  if (totalSeconds > 2) return 0.25;
  if (totalSeconds > 0.5) return 0.1;
  return 1 / FPS;
}

/** Compute cumulative track top positions once */
function computeTrackTops(tracks: TimelineTrack[]): number[] {
  const tops: number[] = [];
  let acc = 0;
  for (const t of tracks) {
    tops.push(acc);
    acc += t.height + 2;
  }
  return tops;
}

// ============================================================
// RAF Throttle Helper
// ============================================================

function rafThrottle<T extends (...args: Parameters<T>) => void>(fn: T): T {
  let rafId: number | null = null;
  let lastArgs: Parameters<T>;
  return ((...args: Parameters<T>) => {
    lastArgs = args;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      fn(...lastArgs);
    });
  }) as T;
}

// ============================================================
// Waveform Bar Data Cache (module-level, persists across renders)
// ============================================================

const waveformBarCache = new Map<string, number[]>();

function getWaveformBars(
  clipId: string,
  barCount: number,
  waveformData?: Float32Array | number[]
): number[] {
  const key = `${clipId}:${barCount}`;
  if (waveformBarCache.has(key)) return waveformBarCache.get(key)!;

  let bars: number[];
  if (waveformData && waveformData.length > 0) {
    const step = Math.max(1, Math.floor(waveformData.length / barCount));
    bars = Array.from({ length: barCount }, (_, i) => {
      const idx = Math.min(i * step, waveformData.length - 1);
      return Math.max(0.05, Math.min(1, waveformData[idx]));
    });
  } else {
    bars = Array.from({ length: barCount }, (_, i) => 0.2 + simpleHash(clipId, i) * 0.7);
  }

  waveformBarCache.set(key, bars);
  return bars;
}

// ============================================================
// Timeline Ruler — Canvas-rendered, RAF-throttled
// ============================================================

interface RulerProps {
  width: number;
  zoom: number;
  scrollX: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

const TimelineRuler = memo<RulerProps>(({ width, zoom, scrollX, currentTime, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any pending draw
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR at 2
      const w = width;
      const h = RULER_HEIGHT;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
      } else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Background
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, w, h);

      const startTime = scrollX / zoom;
      const endTime = (scrollX + w) / zoom;
      const totalSeconds = endTime - startTime;
      const tickInterval = getTickInterval(totalSeconds);
      const subTickCount = tickInterval >= 1 ? 4 : tickInterval >= 0.25 ? 3 : 2;
      const subInterval = tickInterval / subTickCount;

      ctx.font = '10px ui-monospace, monospace';
      ctx.lineWidth = 1;

      const firstTick = Math.ceil(startTime / tickInterval) * tickInterval;
      for (let t = firstTick; t <= endTime + tickInterval; t += tickInterval) {
        const x = t * zoom - scrollX;

        ctx.beginPath();
        ctx.strokeStyle = '#52525b';
        ctx.moveTo(x, h - 14);
        ctx.lineTo(x, h);
        ctx.stroke();

        ctx.fillStyle = '#a1a1aa';
        ctx.textAlign = 'center';
        ctx.fillText(formatRulerLabel(t, tickInterval), x, h - 17);

        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 0.5;
        for (let s = 1; s < subTickCount; s++) {
          const subX = (t + s * subInterval) * zoom - scrollX;
          ctx.beginPath();
          ctx.moveTo(subX, h - 6);
          ctx.lineTo(subX, h);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      }

      // Bottom border
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, h - 0.5);
      ctx.lineTo(w, h - 0.5);
      ctx.stroke();

      // Playhead
      const phX = currentTime * zoom - scrollX;
      if (phX >= -2 && phX <= w + 2) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(250, 106, 0, 0.3)';
        ctx.lineWidth = 4;
        ctx.moveTo(phX, 0);
        ctx.lineTo(phX, h);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#ffb32c';
        ctx.lineWidth = 1.5;
        ctx.moveTo(phX, 0);
        ctx.lineTo(phX, h);
        ctx.stroke();

        ctx.fillStyle = '#ffb32c';
        ctx.beginPath();
        ctx.moveTo(phX, 0);
        ctx.lineTo(phX - 5, 0);
        ctx.lineTo(phX, 7);
        ctx.lineTo(phX + 5, 0);
        ctx.closePath();
        ctx.fill();
      }

      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [width, zoom, scrollX, currentTime]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      onSeek(Math.max(0, x / zoom));
    },
    [zoom, scrollX, onSeek]
  );

  return (
    <canvas
      ref={canvasRef}
      className="block cursor-pointer flex-shrink-0"
      onClick={handleClick}
      style={{ width, height: RULER_HEIGHT }}
    />
  );
});
TimelineRuler.displayName = 'TimelineRuler';

// ============================================================
// Waveform Canvas (audio) — canvas-rendered, no JSX bar loop
// ============================================================

interface WaveformProps {
  clipId: string;
  width: number;
  color: string;
  waveformData?: Float32Array | number[];
}

const WaveformCanvas = memo<WaveformProps>(({ clipId, width, color, waveformData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const h = canvas.offsetHeight || 40;

    canvas.width = width * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, h);

    const barCount = Math.min(Math.floor(width / 3), 120);
    const bars = getWaveformBars(clipId, barCount, waveformData);

    const barW = 2;
    const gap = Math.max(1, (width - barCount * barW) / barCount);
    const hasReal = !!(waveformData && waveformData.length > 0);
    const alpha = hasReal ? '80' : '50';

    ctx.fillStyle = `${color}${alpha}`;

    for (let i = 0; i < bars.length; i++) {
      const barH = Math.max(2, bars[i] * h * 0.9);
      const x = i * (barW + gap) + gap / 2;
      const y = (h - barH) / 2;
      ctx.beginPath();
      ctx.roundRect?.(x, y, barW, barH, 1) ?? ctx.rect(x, y, barW, barH);
      ctx.fill();
    }
  }, [clipId, width, color, waveformData]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
});
WaveformCanvas.displayName = 'WaveformCanvas';

// ============================================================
// Trim Handle
// ============================================================

const TRIM_HANDLE_STYLE_LEFT: React.CSSProperties = { left: 0 };
const TRIM_HANDLE_STYLE_RIGHT: React.CSSProperties = { right: 0 };

interface TrimHandleProps {
  side: 'left' | 'right';
  onMouseDown: (e: React.MouseEvent) => void;
}

const TrimHandle = memo<TrimHandleProps>(({ side, onMouseDown }) => {
  const isLeft = side === 'left';
  return (
    <div
      className="absolute top-0 bottom-0 w-3 z-10 cursor-col-resize flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-100"
      style={isLeft ? TRIM_HANDLE_STYLE_LEFT : TRIM_HANDLE_STYLE_RIGHT}
      onMouseDown={onMouseDown}
    >
      <div
        className="absolute w-0 h-0"
        style={{
          top: 0,
          ...(isLeft
            ? { left: 0, borderTop: '5px solid rgba(255,255,255,0.7)', borderRight: '5px solid transparent' }
            : { right: 0, borderTop: '5px solid rgba(255,255,255,0.7)', borderLeft: '5px solid transparent' }),
        }}
      />
      <div
        className="absolute w-0 h-0"
        style={{
          bottom: 0,
          ...(isLeft
            ? { left: 0, borderBottom: '5px solid rgba(255,255,255,0.7)', borderRight: '5px solid transparent' }
            : { right: 0, borderBottom: '5px solid rgba(255,255,255,0.7)', borderLeft: '5px solid transparent' }),
        }}
      />
      <div className="absolute top-1 bottom-1 w-px bg-white/30 mx-auto left-0.5 right-0.5" />
    </div>
  );
});
TrimHandle.displayName = 'TrimHandle';

// ============================================================
// Thumbnail Strip
// ============================================================

interface ThumbnailProps {
  thumbnailUrl?: string;
  trimStart: number;
  duration: number;
  mediaDuration: number;
  clipWidth: number;
}

const ThumbnailStrip = memo<ThumbnailProps>(({ thumbnailUrl, trimStart, duration, mediaDuration, clipWidth }) => {
  if (clipWidth < 60 || !thumbnailUrl) return null;

  const thumbWidth = 80;
  const count = Math.max(1, Math.ceil(clipWidth / thumbWidth));

  return (
    <div className="absolute inset-0 opacity-30 overflow-hidden pointer-events-none">
      <div className="flex h-full" style={{ width: count * thumbWidth }}>
        {Array.from({ length: count }, (_, i) => {
          const offset = ((trimStart / mediaDuration) + (i / count) * (duration / mediaDuration)) * 100;
          return (
            <div
              key={i}
              className="flex-shrink-0 bg-cover bg-center"
              style={{
                width: thumbWidth,
                height: '100%',
                backgroundImage: `url(${thumbnailUrl})`,
                backgroundPosition: `${Math.min(100, offset)}% center`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
});
ThumbnailStrip.displayName = 'ThumbnailStrip';

// ============================================================
// Timeline Clip — granular selector, no full store subscription
// ============================================================

interface ClipProps {
  clip: TimelineClip;
  trackId: string;
  trackType: TimelineTrack['type'];
  trackLocked: boolean;
  zoom: number;
  scrollX: number;
  isSelected: boolean;
  media?: MediaFile;
  trackIndex: number;
  viewportWidth: number;
}

const TimelineClipComponent = memo<ClipProps>(({
  clip,
  trackId,
  trackType,
  trackLocked,
  zoom,
  scrollX,
  isSelected,
  media,
  trackIndex,
  viewportWidth,
}) => {
  // Granular action selectors — stable references, never change
  const splitClip = useEditorStore((s) => s.splitClip);
  const selectClip = useEditorStore((s) => s.selectClip);
  const moveClip = useEditorStore((s) => s.moveClip);
  const trimClipLeft = useEditorStore((s) => s.trimClipLeft);
  const trimClipRight = useEditorStore((s) => s.trimClipRight);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const recalculateDuration = useEditorStore((s) => s.recalculateDuration);
  const activeTool = useEditorStore((s) => s.activeTool);
  const selectedClipIds = useEditorStore((s) => s.selectedClipIds);
  const waveformCache = useEditorStore((s) => s.waveformCache);

  const left = clip.startTime * zoom - scrollX;
  const width = clip.duration * zoom;
  const isVisible = left + width >= -RENDER_OVERSCAN && left <= viewportWidth + RENDER_OVERSCAN;

  const isAudioTrack = trackType === 'audio';
  const isVisualMedia = media?.type === 'video' || media?.type === 'image';
  const waveformData = waveformCache.get(clip.mediaId);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (trackLocked) return;

      if (activeTool === 'cut') {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const time = (left + (e.clientX - rect.left)) / zoom;
        if (time > clip.startTime && time < clip.startTime + clip.duration) {
          pushHistory('Cut clip');
          splitClip(clip.id, time);
        }
        return;
      }

      e.stopPropagation();

      if (e.shiftKey) {
        selectClip(clip.id, true);
        return;
      }

      if (!selectedClipIds.includes(clip.id)) {
        selectClip(clip.id);
      }

      const startX = e.clientX;
      const originalStartTime = clip.startTime;
      pushHistory('Move clip');

      const onMove = rafThrottle((moveE: MouseEvent) => {
        const newStartTime = Math.max(0, originalStartTime + (moveE.clientX - startX) / zoom);
        moveClip(clip.id, trackIndex, newStartTime);
      });

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    },
    [trackLocked, activeTool, clip, zoom, left, selectedClipIds, pushHistory, splitClip, selectClip, moveClip, trackIndex]
  );

  const handleTrimLeft = useCallback(
    (e: React.MouseEvent) => {
      if (trackLocked) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      pushHistory('Trim left');

      const onMove = rafThrottle((moveE: MouseEvent) => {
        trimClipLeft(clip.id, -(moveE.clientX - startX) / zoom);
      });

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        recalculateDuration();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [trackLocked, clip.id, zoom, pushHistory, trimClipLeft, recalculateDuration]
  );

  const handleTrimRight = useCallback(
    (e: React.MouseEvent) => {
      if (trackLocked) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      pushHistory('Trim right');

      const onMove = rafThrottle((moveE: MouseEvent) => {
        trimClipRight(clip.id, (moveE.clientX - startX) / zoom);
      });

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        recalculateDuration();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [trackLocked, clip.id, zoom, pushHistory, trimClipRight, recalculateDuration]
  );

  // Visibility culling must happen after hooks so React sees a stable hook order.
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="absolute top-0 h-full group"
      style={{ left, width: Math.max(width, 2) }}
    >
      <div
        className={`relative h-full rounded-sm overflow-hidden cursor-grab active:cursor-grabbing ${isSelected
          ? 'ring-2 ring-[#ffb32c] ring-offset-1 ring-offset-[#100a2f] shadow-lg shadow-[#ffb32c]/20'
          : 'hover:ring-1 hover:ring-white/20'
          } ${activeTool === 'cut' ? 'cursor-crosshair' : ''}`}
        style={{
          backgroundColor: `${clip.color}25`,
          borderTop: `2px solid ${clip.color}`,
          borderBottom: `1px solid ${clip.color}40`,
        }}
        onMouseDown={handleMouseDown}
      >
        {isVisualMedia && (
          <ThumbnailStrip
            thumbnailUrl={media?.thumbnailUrl}
            trimStart={clip.trimStart}
            duration={clip.duration}
            mediaDuration={media?.duration ?? clip.duration}
            clipWidth={width}
          />
        )}

        {isAudioTrack && (
          <WaveformCanvas
            clipId={clip.id}
            width={Math.max(width, 1)}
            color={clip.color}
            waveformData={waveformData}
          />
        )}

        {width > LABEL_THRESHOLD && (
          <div className="relative px-2 py-0.5 h-full flex items-center overflow-hidden z-10">
            <span className="text-[10px] font-medium text-white truncate drop-shadow-md">
              {clip.label || 'Clip'}
            </span>
            {width > DURATION_THRESHOLD && (
              <span className="text-[9px] text-white/60 ml-auto flex-shrink-0 ml-1 drop-shadow-md">
                {formatClipTime(clip.duration)}
              </span>
            )}
          </div>
        )}

        <TrimHandle side="left" onMouseDown={handleTrimLeft} />
        <TrimHandle side="right" onMouseDown={handleTrimRight} />
      </div>
    </div>
  );
});
TimelineClipComponent.displayName = 'TimelineClipComponent';

// ============================================================
// Track Header — subscribes only to its own track's fields
// ============================================================

interface TrackHeaderProps {
  trackId: string;
  index: number;
}

const TrackHeader = memo<TrackHeaderProps>(({ trackId }) => {
  const name = useEditorStore((s) => s.tracks.find((t) => t.id === trackId)?.name ?? '');
  const muted = useEditorStore((s) => s.tracks.find((t) => t.id === trackId)?.muted ?? false);
  const visible = useEditorStore((s) => s.tracks.find((t) => t.id === trackId)?.visible ?? true);
  const locked = useEditorStore((s) => s.tracks.find((t) => t.id === trackId)?.locked ?? false);
  const clipCount = useEditorStore((s) => s.tracks.find((t) => t.id === trackId)?.clips.length ?? 0);
  const toggleMute = useEditorStore((s) => s.toggleTrackMute);
  const toggleVisibility = useEditorStore((s) => s.toggleTrackVisibility);
  const toggleLock = useEditorStore((s) => s.toggleTrackLock);
  const removeTrack = useEditorStore((s) => s.removeTrack);

  const handleRemoveTrack = useCallback(() => {
    if (clipCount > 0 && !window.confirm(`Delete ${name} and its ${clipCount} clip${clipCount === 1 ? '' : 's'}?`)) {
      return;
    }
    removeTrack(trackId);
  }, [clipCount, name, removeTrack, trackId]);

  return (
    <div
      className="flex h-full flex-shrink-0 select-none items-center gap-1 border-b border-white/10 bg-[#10082c] px-2"
      style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH }}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-0.5">
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/80 hover:text-[#ffd36b]"
                  onClick={() => toggleMute(trackId)}
                >
                  {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{muted ? 'Unmute' : 'Mute'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/80 hover:text-[#ffd36b]"
                  onClick={() => toggleVisibility(trackId)}
                >
                  {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{visible ? 'Hide' : 'Show'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/80 hover:text-[#ffd36b]"
                  onClick={() => toggleLock(trackId)}
                >
                  {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{locked ? 'Unlock' : 'Lock'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/70 hover:text-red-300"
                  onClick={handleRemoveTrack}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                Delete track
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 min-w-0 ml-1">
        <p className={`truncate text-[10px] font-medium ${muted ? 'text-[#8f7bd6]' : 'text-[#f2c5ff]'}`}>
          {name}
        </p>
      </div>
    </div>
  );
});
TrackHeader.displayName = 'TrackHeader';

// ============================================================
// Cut Tool Line — CSS transform avoids layout thrash
// ============================================================

interface CutLineProps {
  visible: boolean;
  containerRef: any;
}

const CutToolLine = memo<CutLineProps>(({ visible, containerRef }) => {
  const lineRef = useRef<HTMLDivElement>(null);

  // Expose move method via imperative handle on containerRef's mousemove
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      if (!lineRef.current || !visible) return;
      const rect = container.getBoundingClientRect();
      lineRef.current.style.transform = `translateX(${e.clientX - rect.left}px)`;
    };

    container.addEventListener('mousemove', onMove, { passive: true });
    return () => container.removeEventListener('mousemove', onMove);
  }, [containerRef, visible]);

  if (!visible) return null;

  return (
    <div
      ref={lineRef}
      className="absolute top-0 bottom-0 pointer-events-none z-30 will-change-transform"
      style={{ left: 0 }}
    >
      <div
        className="absolute top-0 bottom-0 w-px"
        style={{ backgroundColor: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}
      />
    </div>
  );
});
CutToolLine.displayName = 'CutToolLine';

// ============================================================
// Empty Drop Zone
// ============================================================

const EmptyDropZone = memo(() => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="text-center animate-pulse">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5">
        <Upload className="h-7 w-7 text-[#c7b4ff]" />
      </div>
      <p className="text-sm font-medium text-[#f2c5ff]">Drop media files here</p>
      <p className="mt-1.5 text-xs text-[#c7b4ff]">Drag video, audio, or image files from your desktop</p>
      <p className="mt-3 text-[10px] text-[#8f7bd6]">Or drag clips from the media panel to begin editing</p>
    </div>
  </div>
));
EmptyDropZone.displayName = 'EmptyDropZone';

// ============================================================
// Track Add Buttons
// ============================================================

const TrackAddButtons = memo(() => {
  const addTrack = useEditorStore((s) => s.addTrack);

  return (
    <div className="flex items-center gap-1 border-t border-white/10 bg-[#10082c] px-2 py-1">
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-[10px] text-white/80 hover:bg-white/10 hover:text-[#ffd36b]"
              onClick={() => addTrack('video')}
            >
              <Plus className="w-3 h-3" /><Film className="w-3 h-3" />Video
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">Add video track</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-[10px] text-white/80 hover:bg-white/10 hover:text-[#ffd36b]"
              onClick={() => addTrack('audio')}
            >
              <Plus className="w-3 h-3" /><Music className="w-3 h-3" />Audio
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">Add audio track</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});
TrackAddButtons.displayName = 'TrackAddButtons';

// ============================================================
// Canvas Grid — replaces SVG, much cheaper to render
// ============================================================

interface GridCanvasProps {
  width: number;
  height: number;
  zoom: number;
  scrollX: number;
}

const GridCanvas = memo<GridCanvasProps>(({ width, height, zoom, scrollX }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.clearRect(0, 0, width, height);

      // Minor grid
      const startX = scrollX % zoom;
      ctx.strokeStyle = 'rgba(255,255,255,0.031)';
      ctx.lineWidth = 1;
      for (let x = -startX; x < width; x += zoom) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Major grid every 5 beats
      const majorZoom = zoom * 5;
      const majorStartX = scrollX % majorZoom;
      ctx.strokeStyle = 'rgba(255,255,255,0.047)';
      for (let x = -majorStartX; x < width; x += majorZoom) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [width, height, zoom, scrollX]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
});
GridCanvas.displayName = 'GridCanvas';

// ============================================================
// Main Timeline Component
// ============================================================

const Timeline: React.FC = () => {
  // Granular store subscriptions — each selector is stable
  const tracks = useEditorStore((s) => s.tracks);
  const zoom = useEditorStore((s) => s.zoom);
  const scrollX = useEditorStore((s) => s.scrollX);
  const currentTime = useEditorStore((s) => s.currentTime);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const activeTool = useEditorStore((s) => s.activeTool);
  const selectedClipIds = useEditorStore((s) => s.selectedClipIds) ?? EMPTY_IDS;
  const getMediaFile = useEditorStore((s) => s.getMediaFile);
  const setScrollX = useEditorStore((s) => s.setScrollX);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const deselectAll = useEditorStore((s) => s.deselectAll);
  const addMediaFiles = useEditorStore((s) => s.addMediaFiles);
  const addClipToTrack = useEditorStore((s) => s.addClipToTrack);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const tracksAreaRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(800);
  const [showTrackHeaders, setShowTrackHeaders] = useState(true);
  const [totalTracksHeight, setTotalTracksHeight] = useState(0);

  // Derived: cumulative track top positions (stable memo)
  const trackTops = useMemo(() => computeTrackTops(tracks), [tracks]);

  // Derived: total height
  useEffect(() => {
    const h = tracks.reduce((sum, t) => sum + t.height + 2, 0);
    setTotalTracksHeight(h);
  }, [tracks]);

  const hasClips = useMemo(() => tracks.some((t) => t.clips.length > 0), [tracks]);

  // ---- ResizeObserver for viewport width ----
  useEffect(() => {
    const el = tracksAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTimelineWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Vertical scroll sync (headers ↔ tracks) ----
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollX(target.scrollLeft);
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollTop = target.scrollTop;
      }
    },
    [setScrollX]
  );

  // ---- Ctrl+wheel zoom, RAF-throttled ----
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Read current values from store directly to avoid stale closure
      const { zoom: z, scrollX: sx } = useEditorStore.getState();
      const timeAtMouse = (sx + mouseX) / z;
      const zoomDelta = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * zoomDelta));
      const newScrollX = Math.max(0, timeAtMouse * newZoom - mouseX);

      setZoom(newZoom);
      setScrollX(newScrollX);
    },
    [setZoom, setScrollX]
  );

  // ---- Cut tool: use CSS transform, no setState per pixel ----
  const isCutMode = activeTool === 'cut';

  // ---- Drop handler ----
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const { zoom: z, scrollX: sx, tracks: currentTracks } = useEditorStore.getState();

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const dropTime = (e.clientX - rect.left + sx) / z;
      const dropY = e.clientY - rect.top;

      // Find target track from Y
      let targetTrackIndex = 0;
      let cumH = 0;
      for (let i = 0; i < currentTracks.length; i++) {
        cumH += currentTracks[i].height + 2;
        if (dropY <= cumH) { targetTrackIndex = i; break; }
        targetTrackIndex = i;
      }

      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        try {
          const parsed = JSON.parse(jsonData);
          if (parsed.type !== 'media') return;
          const media = getMediaFile(parsed.mediaId);
          if (!media) return;
          const idx = currentTracks.findIndex(
            (t) => (media.type === 'video' ? t.type === 'video' : t.type === 'audio') && !t.locked
          );
          addClipToTrack(parsed.mediaId, idx >= 0 ? idx : targetTrackIndex, Math.max(0, dropTime));
        } catch { /* ignore */ }
        return;
      }

      const files = e.dataTransfer.files;
      if (!files?.length) return;

      const validTypes = ['video/', 'audio/', 'image/'];
      const validFiles = Array.from(files).filter((f) => validTypes.some((t) => f.type.startsWith(t)));
      if (!validFiles.length) return;

      await addMediaFiles(validFiles);

      const freshMedia = useEditorStore.getState().mediaFiles;
      for (const file of validFiles) {
        const added = freshMedia.find((m) => m.name === file.name);
        if (!added) continue;
        const isAudio = file.type.startsWith('audio/');
        const idx = currentTracks.findIndex(
          (t) => (isAudio ? t.type === 'audio' : t.type === 'video') && !t.locked
        );
        addClipToTrack(added.id, idx >= 0 ? idx : targetTrackIndex, Math.max(0, dropTime));
      }
    },
    [getMediaFile, addMediaFiles, addClipToTrack]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) deselectAll();
    },
    [deselectAll]
  );

  const handleSeek = useCallback((t: number) => setCurrentTime(t), [setCurrentTime]);

  // Playhead position as CSS transform — no re-layout
  const playheadLeft = currentTime * zoom;

  return (
    <div className="flex h-full select-none flex-col border-t border-white/10 bg-[#100a2f]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#10082c] px-3 py-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Timeline</h3>
          <span className="text-[10px] text-[#c7b4ff]">
            {tracks.length} tracks · {zoom.toFixed(0)}px/s
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white/80 hover:text-[#ffd36b]"
          onClick={() => setShowTrackHeaders((v) => !v)}
        >
          {showTrackHeaders ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Ruler row */}
      <div className="flex flex-shrink-0">
        {showTrackHeaders && (
          <div
            className="flex flex-shrink-0 items-center border-b border-r border-white/10 bg-[#10082c] px-2"
            style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH, height: RULER_HEIGHT }}
          >
            <span className="text-[9px] uppercase tracking-wider text-[#c7b4ff]">Tracks</span>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <TimelineRuler
            width={timelineWidth}
            zoom={zoom}
            scrollX={scrollX}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        </div>
      </div>

      {/* Tracks + Headers */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track headers — vertically synced, no horizontal scroll */}
        {showTrackHeaders && (
          <div
            ref={headerScrollRef}
            className="flex-shrink-0 overflow-hidden border-r border-white/10 bg-[#10082c]"
            style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH }}
          >
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="border-b border-white/10"
                style={{ height: track.height + 2 }}
              >
                <TrackHeader trackId={track.id} index={index} />
              </div>
            ))}
          </div>
        )}

        {/* Scrollable tracks */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative timeline-scroll"
          onScroll={handleScroll}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBackgroundClick}
          onWheel={handleWheel}
        >
          <div
            ref={tracksAreaRef}
            className="relative min-w-full"
            style={{ minHeight: Math.max(totalTracksHeight, 180) }}
          >
            {/* Canvas grid — zero SVG overhead */}
            <GridCanvas
              width={Math.max(timelineWidth, totalDuration * zoom)}
              height={Math.max(totalTracksHeight, 180)}
              zoom={zoom}
              scrollX={scrollX}
            />

            {/* Track rows */}
            {tracks.map((track, trackIndex) => {
              const top = trackTops[trackIndex];
              return (
                <div
                  key={track.id}
                  className={`absolute left-0 right-0 border-b border-white/10 ${track.locked ? 'opacity-60' : ''
                    } ${track.muted ? 'opacity-50' : ''}`}
                  style={{ top, height: track.height }}
                >
                  {track.clips.map((clip) => (
                    <TimelineClipComponent
                      key={clip.id}
                      clip={clip}
                      trackId={track.id}
                      trackType={track.type}
                      trackLocked={track.locked}
                      zoom={zoom}
                      scrollX={scrollX}
                      isSelected={selectedClipIds.includes(clip.id)}
                      media={getMediaFile(clip.mediaId)}
                      trackIndex={trackIndex}
                      viewportWidth={timelineWidth}
                    />
                  ))}
                </div>
              );
            })}

            {/* Playhead — CSS transform, no layout reflow */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20 will-change-transform"
              style={{ left: 0, transform: `translateX(${playheadLeft}px)` }}
            >
              <div
                className="absolute w-0 h-0"
                style={{
                  top: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '7px solid #ffb32c',
                  transform: 'translateX(-5px)',
                }}
              />
              <div
                className="absolute top-1 bottom-0 w-px"
                style={{
                  backgroundColor: '#ffb32c',
                  boxShadow: '0 0 4px rgba(250,106,0,0.4)',
                  transform: 'translateX(-0.5px)',
                }}
              />
            </div>

            {/* Cut tool line — DOM-driven via CSS transform, zero React re-renders */}
            <CutToolLine visible={isCutMode} containerRef={scrollContainerRef} />

            {/* Empty state */}
            {!hasClips && <EmptyDropZone />}
          </div>
        </div>
      </div>

      <TrackAddButtons />
    </div>
  );
};

export default Timeline;
