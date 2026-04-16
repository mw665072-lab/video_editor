'use client';

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
  Upload,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================
// Constants
// ============================================================

const HEADER_WIDTH = 160;
const RULER_HEIGHT = 30;
const FPS = 30;
const MIN_ZOOM = 5;
const MAX_ZOOM = 500;
const ZOOM_FACTOR = 1.12;

// ============================================================
// Utility
// ============================================================

/** Format time as HH:MM:SS:FF (frames at 30fps) for the ruler */
function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ff = Math.floor((s % 1) * FPS);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}:${ff.toString().padStart(2, '0')}`;
}

/** Short ruler label when space is tight */
function formatRulerLabel(seconds: number, tickInterval: number): string {
  const s = Math.max(0, seconds);
  if (tickInterval >= 10) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }
  if (tickInterval >= 1) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
  // Show SS:FF when zoomed in
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

/** Deterministic hash for stable random waveform bars */
function simpleHash(str: string, i: number): number {
  let h = 0;
  for (let c = 0; c < str.length; c++) {
    h = ((h << 5) - h + str.charCodeAt(c)) | 0;
  }
  h = ((h << 5) - h + i) | 0;
  return (Math.abs(h) % 100) / 100;
}

// ============================================================
// Timeline Ruler
// ============================================================

const TimelineRuler: React.FC<{
  width: number;
  zoom: number;
  scrollX: number;
  currentTime: number;
  onSeek: (time: number) => void;
}> = ({ width, zoom, scrollX, currentTime, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = RULER_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, width, RULER_HEIGHT);

    // Visible range
    const startTime = scrollX / zoom;
    const endTime = (scrollX + width) / zoom;
    const totalSeconds = endTime - startTime;

    // Adaptive tick interval
    let tickInterval: number;
    if (totalSeconds > 300) tickInterval = 30;
    else if (totalSeconds > 120) tickInterval = 10;
    else if (totalSeconds > 60) tickInterval = 5;
    else if (totalSeconds > 30) tickInterval = 2;
    else if (totalSeconds > 15) tickInterval = 1;
    else if (totalSeconds > 5) tickInterval = 0.5;
    else if (totalSeconds > 2) tickInterval = 0.25;
    else if (totalSeconds > 0.5) tickInterval = 0.1;
    else tickInterval = 1 / FPS;

    const subTickCount = tickInterval >= 1 ? 4 : tickInterval >= 0.25 ? 3 : 2;

    // Draw ticks and timecode labels
    const firstTick = Math.ceil(startTime / tickInterval) * tickInterval;
    for (let t = firstTick; t <= endTime + tickInterval; t += tickInterval) {
      const x = t * zoom - scrollX;

      // Main tick
      ctx.beginPath();
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 1;
      ctx.moveTo(x, RULER_HEIGHT - 14);
      ctx.lineTo(x, RULER_HEIGHT);
      ctx.stroke();

      // Timecode label
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatRulerLabel(t, tickInterval), x, RULER_HEIGHT - 17);

      // Sub-ticks
      const subInterval = tickInterval / subTickCount;
      for (let s = 1; s < subTickCount; s++) {
        const subX = (t + s * subInterval) * zoom - scrollX;
        ctx.beginPath();
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 0.5;
        ctx.moveTo(subX, RULER_HEIGHT - 6);
        ctx.lineTo(subX, RULER_HEIGHT);
        ctx.stroke();
      }
    }

    // Bottom border
    ctx.beginPath();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.moveTo(0, RULER_HEIGHT - 0.5);
    ctx.lineTo(width, RULER_HEIGHT - 0.5);
    ctx.stroke();

    // Playhead
    const phX = currentTime * zoom - scrollX;
    if (phX >= -2 && phX <= width + 2) {
      // Glow
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 4;
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX, RULER_HEIGHT);
      ctx.stroke();

      // Line
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX, RULER_HEIGHT);
      ctx.stroke();

      // Triangle marker at top
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX - 5, 0);
      ctx.lineTo(phX, 7);
      ctx.lineTo(phX + 5, 0);
      ctx.closePath();
      ctx.fill();
    }
  }, [width, zoom, scrollX, currentTime]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const time = x / zoom;
      onSeek(Math.max(0, time));
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
};

// ============================================================
// Waveform Renderer (audio tracks)
// ============================================================

const WaveformBars: React.FC<{
  clip: TimelineClip;
  width: number;
  color: string;
}> = memo(({ clip, width, color }) => {
  const waveformCache = useEditorStore((s) => s.waveformCache);
  const waveformData = waveformCache.get(clip.mediaId);
  const barCount = Math.min(Math.floor(width / 3), 120);

  const bars = useMemo(() => {
    if (waveformData && waveformData.length > 0) {
      // Use real waveform data
      const step = Math.max(1, Math.floor(waveformData.length / barCount));
      return Array.from({ length: barCount }, (_, i) => {
        const idx = Math.min(i * step, waveformData.length - 1);
        return Math.max(0.05, Math.min(1, waveformData[idx]));
      });
    }
    // Placeholder: deterministic pseudo-random based on clip id
    return Array.from({ length: barCount }, (_, i) => {
      return 0.2 + simpleHash(clip.id, i) * 0.7;
    });
  }, [waveformData, barCount, clip.id]);

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-px px-1 overflow-hidden">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full flex-shrink-0"
          style={{
            backgroundColor: waveformData ? `${color}80` : `${color}50`,
            height: `${Math.max(8, h * 90)}%`,
          }}
        />
      ))}
    </div>
  );
});
WaveformBars.displayName = 'WaveformBars';

// ============================================================
// Trim Handle Notch
// ============================================================

const TrimHandle: React.FC<{
  side: 'left' | 'right';
  onMouseDown: (e: React.MouseEvent) => void;
  visible: boolean;
}> = memo(({ side, onMouseDown, visible }) => {
  return (
    <div
      className={`absolute top-0 bottom-0 w-3 z-10 cursor-col-resize flex items-center transition-opacity duration-100 ${
        visible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
      style={side === 'left' ? { left: 0 } : { right: 0 }}
      onMouseDown={onMouseDown}
    >
      {/* Top notch triangle */}
      <div
        className="absolute w-0 h-0"
        style={{
          top: 0,
          ...(side === 'left'
            ? {
                left: 0,
                borderTop: '5px solid rgba(255,255,255,0.7)',
                borderRight: '5px solid transparent',
              }
            : {
                right: 0,
                borderTop: '5px solid rgba(255,255,255,0.7)',
                borderLeft: '5px solid transparent',
              }),
        }}
      />
      {/* Bottom notch triangle */}
      <div
        className="absolute w-0 h-0"
        style={{
          bottom: 0,
          ...(side === 'left'
            ? {
                left: 0,
                borderBottom: '5px solid rgba(255,255,255,0.7)',
                borderRight: '5px solid transparent',
              }
            : {
                right: 0,
                borderBottom: '5px solid rgba(255,255,255,0.7)',
                borderLeft: '5px solid transparent',
              }),
        }}
      />
      {/* Vertical line */}
      <div className="absolute top-1 bottom-1 w-px bg-white/30 mx-auto left-0.5 right-0.5" />
    </div>
  );
});
TrimHandle.displayName = 'TrimHandle';

// ============================================================
// Clip Thumbnail Strip (video tracks)
// ============================================================

const ThumbnailStrip: React.FC<{
  media: MediaFile;
  clip: TimelineClip;
  clipWidth: number;
}> = memo(({ media, clip, clipWidth }) => {
  if (clipWidth < 60) return null;

  // Calculate how many thumbnails fit based on width
  // Each thumbnail is about 80px wide on the clip
  const thumbWidth = 80;
  const count = Math.max(1, Math.ceil(clipWidth / thumbWidth));

  return (
    <div className="absolute inset-0 opacity-30 overflow-hidden">
      <div
        className="flex h-full"
        style={{
          width: `${count * thumbWidth}px`,
        }}
      >
        {Array.from({ length: count }).map((_, i) => {
          const pct = clip.trimStart / (media.duration || 1);
          const segDuration = clip.duration / count;
          const offset = (pct + (i / count) * (clip.duration / (media.duration || 1))) * 100;
          return (
            <div
              key={i}
              className="flex-shrink-0 bg-cover bg-center"
              style={{
                width: `${thumbWidth}px`,
                height: '100%',
                backgroundImage: `url(${media.thumbnailUrl})`,
                backgroundPosition: `${Math.min(100, offset)}% center`,
                backgroundSize: 'cover',
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
// Timeline Clip
// ============================================================

const TimelineClipComponent: React.FC<{
  clip: TimelineClip;
  track: TimelineTrack;
  zoom: number;
  scrollX: number;
  isSelected: boolean;
  media?: MediaFile;
  trackTop: number;
  trackHeight: number;
  trackIndex: number;
}> = ({ clip, track, zoom, scrollX, isSelected, media, trackTop, trackHeight, trackIndex }) => {
  const store = useEditorStore();

  const left = clip.startTime * zoom - scrollX;
  const width = clip.duration * zoom;
  const isVisible = !(left + width < -10 || left > 4000);

  // All hooks before conditional return
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (track.locked) return;
      if (store.activeTool === 'cut') {
        // Cut tool: split clip at click position
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const time = (left + clickX) / zoom;
        if (time > clip.startTime && time < clip.startTime + clip.duration) {
          store.pushHistory('Cut clip');
          store.splitClip(clip.id, time);
        }
        return;
      }
      e.stopPropagation();

      if (e.shiftKey) {
        store.selectClip(clip.id, true);
        return;
      }

      if (!store.selectedClipIds.includes(clip.id)) {
        store.selectClip(clip.id);
      }

      const startX = e.clientX;
      const originalStartTime = clip.startTime;

      store.pushHistory('Move clip');

      const handleMouseMove = (moveE: MouseEvent) => {
        const deltaX = moveE.clientX - startX;
        const deltaTime = deltaX / zoom;
        let newStartTime = originalStartTime + deltaTime;
        newStartTime = Math.max(0, newStartTime);
        store.moveClip(clip.id, trackIndex, newStartTime);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    },
    [clip, track, zoom, store, left]
  );

  const handleTrimLeftMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (track.locked) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const originalTrimStart = clip.trimStart;
      const originalStartTime = clip.startTime;
      const originalDuration = clip.duration;

      store.pushHistory('Trim left');

      const handleMouseMove = (moveE: MouseEvent) => {
        const deltaX = moveE.clientX - startX;
        const deltaTime = -deltaX / zoom;
        store.trimClipLeft(clip.id, deltaTime);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        store.recalculateDuration();
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [clip, track, zoom, store]
  );

  const handleTrimRightMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (track.locked) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const originalTrimEnd = clip.trimEnd;
      const originalDuration = clip.duration;

      const { mediaFiles } = useEditorStore.getState();
      const mediaItem = mediaFiles.find((m) => m.id === clip.mediaId);
      const maxSourceEnd = mediaItem ? mediaItem.duration : originalDuration + originalTrimEnd;

      store.pushHistory('Trim right');

      const handleMouseMove = (moveE: MouseEvent) => {
        const deltaX = moveE.clientX - startX;
        const deltaTime = deltaX / zoom;
        store.trimClipRight(clip.id, deltaTime);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        store.recalculateDuration();
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [clip, track, zoom, store]
  );

  if (!isVisible) return null;

  const isVideoClip = media && media.type === 'video';
  const isAudioTrack = track.type === 'audio';
  const showTrimHandles = isSelected || true; // always show on hover via CSS class group-hover

  return (
    <div
      className="absolute top-0 h-full group"
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 2)}px`,
      }}
    >
      <div
        className={`relative h-full rounded-sm overflow-hidden cursor-grab active:cursor-grabbing clip-transition ${
          isSelected
            ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-900 shadow-lg shadow-emerald-500/20'
            : 'hover:ring-1 hover:ring-white/20'
        } ${store.activeTool === 'cut' ? 'cursor-crosshair' : ''}`}
        style={{
          backgroundColor: `${clip.color}25`,
          borderTop: `2px solid ${clip.color}`,
          borderBottom: `1px solid ${clip.color}40`,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Video thumbnail strip */}
        {isVideoClip && (
          <ThumbnailStrip media={media} clip={clip} clipWidth={width} />
        )}

        {/* Audio waveform */}
        {isAudioTrack && (
          <WaveformBars clip={clip} width={width} color={clip.color} />
        )}

        {/* Clip label */}
        {width > 40 && (
          <div className="relative px-2 py-0.5 h-full flex items-center overflow-hidden">
            <span className="text-[10px] font-medium text-white truncate drop-shadow-md">
              {clip.label || 'Clip'}
            </span>
            {width > 100 && (
              <span className="text-[9px] text-white/60 ml-auto flex-shrink-0 ml-1 drop-shadow-md">
                {formatClipTime(clip.duration)}
              </span>
            )}
          </div>
        )}

        {/* Trim handles - visible on hover, ALWAYS visible when selected */}
        <TrimHandle
          side="left"
          onMouseDown={handleTrimLeftMouseDown}
          visible={showTrimHandles}
        />
        <TrimHandle
          side="right"
          onMouseDown={handleTrimRightMouseDown}
          visible={showTrimHandles}
        />
      </div>
    </div>
  );
};

// ============================================================
// Track Header
// ============================================================

const TrackHeader: React.FC<{
  track: TimelineTrack;
  index: number;
}> = memo(({ track, index }) => {
  const store = useEditorStore();

  return (
    <div
      className="flex items-center gap-1 px-2 h-full bg-zinc-900 border-b border-zinc-800 select-none flex-shrink-0"
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
                  className="h-5 w-5 text-zinc-500 hover:text-zinc-300"
                  onClick={() => store.toggleTrackMute(track.id)}
                >
                  {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {track.muted ? 'Unmute' : 'Mute'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-zinc-500 hover:text-zinc-300"
                  onClick={() => store.toggleTrackVisibility(track.id)}
                >
                  {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {track.visible ? 'Hide' : 'Show'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-zinc-500 hover:text-zinc-300"
                  onClick={() => store.toggleTrackLock(track.id)}
                >
                  {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {track.locked ? 'Unlock' : 'Lock'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 min-w-0 ml-1">
        <p
          className={`text-[10px] font-medium truncate ${
            track.muted ? 'text-zinc-600' : 'text-zinc-300'
          }`}
        >
          {track.name}
        </p>
      </div>
    </div>
  );
});
TrackHeader.displayName = 'TrackHeader';

// ============================================================
// Cut Tool Cursor Line
// ============================================================

const CutToolLine: React.FC<{
  x: number;
  visible: boolean;
}> = ({ x, visible }) => {
  if (!visible) return null;
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-30"
      style={{ left: x }}
    >
      <div
        className="absolute top-0 bottom-0 w-px"
        style={{
          backgroundColor: '#ef4444',
          boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)',
        }}
      />
    </div>
  );
};

// ============================================================
// Empty State Drop Zone
// ============================================================

const EmptyDropZone: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center animate-pulse">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center">
          <Upload className="w-7 h-7 text-zinc-500" />
        </div>
        <p className="text-zinc-500 text-sm font-medium">Drop media files here</p>
        <p className="text-zinc-600 text-xs mt-1.5">
          Drag video, audio, or image files from your desktop
        </p>
        <p className="text-zinc-700 text-[10px] mt-3">
          Or drag clips from the media panel to begin editing
        </p>
      </div>
    </div>
  );
};

// ============================================================
// Track Add Buttons
// ============================================================

const TrackAddButtons: React.FC = () => {
  const store = useEditorStore();

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-t border-zinc-800 bg-zinc-900">
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              onClick={() => store.addTrack('video')}
            >
              <Plus className="w-3 h-3" />
              <Film className="w-3 h-3" />
              Video
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">
            Add video track
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              onClick={() => store.addTrack('audio')}
            >
              <Plus className="w-3 h-3" />
              <Music className="w-3 h-3" />
              Audio
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">
            Add audio track
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// ============================================================
// Main Timeline Component
// ============================================================

const Timeline: React.FC = () => {
  const store = useEditorStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const tracksAreaRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(800);
  const [showTrackHeaders, setShowTrackHeaders] = useState(true);

  // Cut tool cursor position
  const [cutLineX, setCutLineX] = useState<number | null>(null);
  const [isCutLineVisible, setIsCutLineVisible] = useState(false);

  const scrollX = store.scrollX;

  // Observe timeline width
  useEffect(() => {
    const el = tracksAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTimelineWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---- Vertical scroll sync ----
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      store.setScrollX(target.scrollLeft);

      // Sync header vertical scroll
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollTop = target.scrollTop;
      }
    },
    [store]
  );

  // ---- Mouse wheel zoom ----
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+wheel = horizontal zoom centered on cursor
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const timeAtMouse = (scrollX + mouseX) / store.zoom;

        const zoomDelta = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, store.zoom * zoomDelta));

        // Adjust scrollX so the time under the cursor stays in place
        const newScrollX = timeAtMouse * newZoom - mouseX;
        store.setZoom(newZoom);
        store.setScrollX(Math.max(0, newScrollX));
      }
      // Plain wheel = normal browser horizontal scroll (handled natively)
    },
    [store, scrollX]
  );

  // ---- Cut tool mouse tracking ----
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (store.activeTool === 'cut') {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setCutLineX(x);
        setIsCutLineVisible(true);
      } else {
        setIsCutLineVisible(false);
      }
    },
    [store.activeTool]
  );

  const handleMouseLeave = useCallback(() => {
    setIsCutLineVisible(false);
  }, []);

  // ---- Drop handler (media panel + desktop files) ----
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsCutLineVisible(false);

      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left + scrollX;
      const dropTime = dropX / store.zoom;
      const y = e.clientY - rect.top;

      // Determine track index from Y position
      let trackIndex = 0;
      let cumulativeHeight = 0;
      for (let i = 0; i < store.tracks.length; i++) {
        cumulativeHeight += store.tracks[i].height + 2;
        if (y <= cumulativeHeight) {
          trackIndex = i;
          break;
        }
        trackIndex = i;
      }

      // 1) Check for internal media panel drag (application/json)
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        try {
          const parsed = JSON.parse(jsonData);
          if (parsed.type !== 'media') return;

          const media = store.getMediaFile(parsed.mediaId);
          if (!media) return;

          const targetTrackIndex = store.tracks.findIndex(
            (t) => (media.type === 'video' ? t.type === 'video' : t.type === 'audio') && !t.locked
          );
          if (targetTrackIndex === -1) return;

          store.addClipToTrack(parsed.mediaId, targetTrackIndex, Math.max(0, dropTime));
        } catch {
          // ignore parse errors
        }
        return;
      }

      // 2) Desktop file drop
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const validTypes = ['video/', 'audio/', 'image/'];
        const validFiles = Array.from(files).filter((f) =>
          validTypes.some((t) => f.type.startsWith(t))
        );

        if (validFiles.length > 0) {
          // Add files to the media library
          await store.addMediaFiles(validFiles);

          // Add each file to the timeline
          const currentMediaFiles = useEditorStore.getState().mediaFiles;
          for (const file of validFiles) {
            const added = currentMediaFiles.find((m) => m.name === file.name);
            if (added) {
              const isVideo = file.type.startsWith('video/');
              const isAudio = file.type.startsWith('audio/');
              const isImage = file.type.startsWith('image/');

              let targetIdx = store.tracks.findIndex(
                (t) => !t.locked
              );
              if (isAudio) {
                targetIdx = store.tracks.findIndex(
                  (t) => t.type === 'audio' && !t.locked
                );
              } else if (isVideo || isImage) {
                targetIdx = store.tracks.findIndex(
                  (t) => t.type === 'video' && !t.locked
                );
              }

              if (targetIdx !== -1) {
                store.addClipToTrack(added.id, targetIdx, Math.max(0, dropTime));
              }
            }
          }
        }
      }
    },
    [store, scrollX]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // ---- Click empty area to deselect ----
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        store.deselectAll();
      }
    },
    [store]
  );

  // ---- Calculate total tracks height ----
  const totalTracksHeight = useMemo(
    () => store.tracks.reduce((sum, t) => sum + t.height + 2, 0),
    [store.tracks]
  );

  // ---- Sync header scroll on track changes ----
  useEffect(() => {
    if (headerScrollRef.current && scrollContainerRef.current) {
      headerScrollRef.current.scrollTop = scrollContainerRef.current.scrollTop;
    }
  }, [store.tracks.length]);

  const hasClips = store.tracks.some((t) => t.clips.length > 0);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800 select-none">
      {/* Timeline Header Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Timeline
          </h3>
          <span className="text-[10px] text-zinc-600">
            {store.tracks.length} tracks &middot; {store.zoom.toFixed(0)}px/s
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
            onClick={() => setShowTrackHeaders(!showTrackHeaders)}
          >
            {showTrackHeaders ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Ruler row */}
      <div className="flex flex-shrink-0">
        {showTrackHeaders && (
          <div
            className="flex-shrink-0 bg-zinc-900 border-b border-r border-zinc-800"
            style={{
              width: HEADER_WIDTH,
              minWidth: HEADER_WIDTH,
              height: RULER_HEIGHT,
            }}
          >
            <div className="px-2 py-1 h-full flex items-center">
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
                Tracks
              </span>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <TimelineRuler
            width={timelineWidth}
            zoom={store.zoom}
            scrollX={scrollX}
            currentTime={store.currentTime}
            onSeek={(t) => store.setCurrentTime(t)}
          />
        </div>
      </div>

      {/* Tracks area with synced vertical scroll */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track headers — scrollable vertically in sync */}
        {showTrackHeaders && (
          <div
            ref={headerScrollRef}
            className="flex-shrink-0 overflow-hidden border-r border-zinc-800 bg-zinc-900"
            style={{
              width: HEADER_WIDTH,
              minWidth: HEADER_WIDTH,
            }}
          >
            <div>
              {store.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="border-b border-zinc-800"
                  style={{ height: track.height + 2 }}
                >
                  <TrackHeader track={track} index={index} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable tracks area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative timeline-scroll"
          onScroll={handleScroll}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBackgroundClick}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div
            ref={tracksAreaRef}
            className="relative min-w-full"
            style={{ minHeight: totalTracksHeight }}
          >
            {/* Grid lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ minWidth: store.totalDuration * store.zoom }}
            >
              <defs>
                <pattern
                  id="grid"
                  width={`${store.zoom}`}
                  height="100%"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="1"
                    y1="0"
                    x2="1"
                    y2="100%"
                    stroke="#ffffff08"
                    strokeWidth="1"
                  />
                </pattern>
                <pattern
                  id="grid-major"
                  width={`${store.zoom * 5}`}
                  height="100%"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="1"
                    y1="0"
                    x2="1"
                    y2="100%"
                    stroke="#ffffff0c"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <rect width="100%" height="100%" fill="url(#grid-major)" />
            </svg>

            {/* Track rows */}
            {store.tracks.map((track, trackIndex) => {
              const top = store.tracks
                .slice(0, trackIndex)
                .reduce((sum, t) => sum + t.height + 2, 0);
              return (
                <div
                  key={track.id}
                  className={`absolute left-0 right-0 border-b border-zinc-800/60 ${
                    track.locked ? 'opacity-60' : ''
                  } ${track.muted ? 'opacity-50' : ''}`}
                  style={{
                    top,
                    height: track.height,
                  }}
                >
                  {/* Clips */}
                  {track.clips.map((clip) => (
                    <TimelineClipComponent
                      key={clip.id}
                      clip={clip}
                      track={track}
                      zoom={store.zoom}
                      scrollX={scrollX}
                      isSelected={store.selectedClipIds.includes(clip.id)}
                      media={store.getMediaFile(clip.mediaId)}
                      trackTop={top}
                      trackHeight={track.height}
                      trackIndex={trackIndex}
                    />
                  ))}
                </div>
              );
            })}

            {/* Playhead */}
            {(() => {
              const phX = store.currentTime * store.zoom;
              return (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-20"
                  style={{ left: phX }}
                >
                  {/* Playhead triangle */}
                  <div
                    className="absolute -top-0 w-0 h-0"
                    style={{
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: '7px solid #10b981',
                      transform: 'translateX(-5px)',
                    }}
                  />
                  {/* Playhead line */}
                  <div
                    className="absolute top-1 bottom-0 w-px"
                    style={{
                      backgroundColor: '#10b981',
                      boxShadow: '0 0 4px rgba(16, 185, 129, 0.4)',
                      transform: 'translateX(-0.5px)',
                    }}
                  />
                </div>
              );
            })()}

            {/* Cut tool vertical line */}
            <CutToolLine
              x={cutLineX ?? 0}
              visible={isCutLineVisible && store.activeTool === 'cut'}
            />

            {/* Empty state */}
            {!hasClips && <EmptyDropZone />}
          </div>
        </div>
      </div>

      {/* Track add buttons */}
      <TrackAddButtons />
    </div>
  );
};

export default Timeline;
