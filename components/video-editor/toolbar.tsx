'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  MousePointer2,
  Scissors,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Magnet,
  Download,
  Plus,
  ChevronDown,
  Gauge,
  Waves,
  Film,
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor-store';

// ────────────────────────────────────────────────────────────────
// Speed options
// ────────────────────────────────────────────────────────────────

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function formatSpeed(speed: number): string {
  return speed === 1 ? '1x' : `${speed}x`;
}

// ────────────────────────────────────────────────────────────────
// Reusable ToolButton
// ────────────────────────────────────────────────────────────────

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'ghost' | 'destructive';
  badge?: string | number | null;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  onClick,
  active,
  disabled,
  variant = 'ghost',
  badge,
}) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={`relative h-8 w-8 ${
            active
              ? 'bg-[#ffb32c] text-[#3b1769] hover:bg-[#ffd36b]'
              : 'text-white/80 hover:text-[#ffd36b] hover:bg-white/10'
          }`}
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
          {badge !== undefined && badge !== null && Number(badge) > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ffb32c] text-[9px] font-bold leading-none text-[#3b1769]">
              {badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ────────────────────────────────────────────────────────────────
// Toolbar Separator
// ────────────────────────────────────────────────────────────────

const ToolbarSep: React.FC = () => (
  <Separator orientation="vertical" className="mx-1.5 h-6 bg-white/10" />
);

// ────────────────────────────────────────────────────────────────
// Speed Control
// ────────────────────────────────────────────────────────────────

const SpeedControl: React.FC = () => {
  const store = useEditorStore();
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 gap-1 px-2 text-xs font-medium ${
                  store.playbackSpeed !== 1
                    ? 'text-[#ffb32c] hover:text-[#ffd36b]'
                    : 'text-[#c7b4ff] hover:text-white'
                }`}
              >
                <Gauge className="h-3.5 w-3.5" />
                {formatSpeed(store.playbackSpeed)}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Playback Speed</p>
            <p className="text-muted-foreground">J / L to adjust</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent
        align="center"
        className="w-32 border-white/10 bg-[#100a2f]"
      >
        {SPEED_OPTIONS.map((speed) => (
          <DropdownMenuItem
            key={speed}
            onClick={() => {
              store.setPlaybackSpeed(speed);
              setOpen(false);
            }}
            className={`text-xs cursor-pointer ${
              store.playbackSpeed === speed
                ? 'text-[#ffd36b] bg-white/10'
                : 'text-[#c7b4ff] focus:text-white focus:bg-white/10'
            }`}
          >
            {formatSpeed(speed)}
            {store.playbackSpeed === speed && (
              <span className="ml-auto text-[10px] text-[#ffd36b]">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ────────────────────────────────────────────────────────────────
// Add Track Dropdown
// ────────────────────────────────────────────────────────────────

const AddTrackDropdown: React.FC = () => {
  const store = useEditorStore();

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-xl px-2 text-xs text-[#c7b4ff] hover:text-white hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Add Track</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent
        align="start"
        className="w-40 border-white/10 bg-[#100a2f]"
      >
        <DropdownMenuItem
          onClick={() => store.addTrack('video')}
          className="text-xs text-[#c7b4ff] focus:text-white focus:bg-white/10 cursor-pointer gap-2"
        >
          <Film className="h-3.5 w-3.5 text-[#c7b4ff]" />
          Add Video Track
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={() => store.addTrack('audio')}
          className="text-xs text-[#c7b4ff] focus:text-white focus:bg-white/10 cursor-pointer gap-2"
        >
          <Waves className="h-3.5 w-3.5 text-[#c7b4ff]" />
          Add Audio Track
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ────────────────────────────────────────────────────────────────
// Export Button
// ────────────────────────────────────────────────────────────────

const ExportButton: React.FC = () => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-xl bg-gradient-to-br from-[#ffcf5a] to-[#ffb32c] text-xs font-bold text-[#3b1769] shadow-sm shadow-[#ffb32c]/30 hover:from-[#ffd36b] hover:to-[#ffb32c]"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('editor:export'));
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>Export Video</p>
        <p className="text-muted-foreground">Ctrl+E</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ────────────────────────────────────────────────────────────────
// Clip Info Display
// ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${s}.${ms.toString().padStart(2, '0')}s`;
}

const ClipInfoDisplay: React.FC = () => {
  const store = useEditorStore();

  const selectedClips = store.getSelectedClips();
  if (selectedClips.length === 0) return null;
  if (selectedClips.length > 1) {
    return (
      <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl border border-white/10 bg-white/5">
        <Badge variant="secondary" className="h-5 text-[10px] border-0 bg-white/10 text-[#c7b4ff] font-medium px-1.5">
          {selectedClips.length} clips
        </Badge>
      </div>
    );
  }

  const clip = selectedClips[0];
  const media = clip.mediaId ? store.getMediaFile(clip.mediaId) : null;
  const displayName = clip.label || media?.name || 'Untitled';
  const truncatedName =
    displayName.length > 20 ? displayName.slice(0, 18) + '…' : displayName;

  return (
    <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl border border-white/10 bg-white/5">
      <div
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: clip.color }}
      />
      <span className="text-[11px] text-[#f2c5ff] font-medium truncate max-w-[120px]">
        {truncatedName}
      </span>
      <span className="text-[10px] text-[#c7b4ff] font-mono">
        {formatDuration(clip.duration)}
      </span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Main Toolbar
// ────────────────────────────────────────────────────────────────

const Toolbar: React.FC = () => {
  const store = useEditorStore();

  // Handlers
  const handleDelete = () => {
    if (store.selectedClipIds.length > 0) {
      store.removeClips(store.selectedClipIds);
    }
  };

  const handleRippleDelete = () => {
    if (store.selectedClipIds.length > 0) {
      store.selectedClipIds.forEach((id) => store.rippleDelete(id));
    }
  };

  const handleDuplicate = () => {
    if (store.selectedClipIds.length > 0) {
      store.duplicateClip(store.selectedClipIds[0]);
    }
  };

  const handleSplit = () => {
    if (store.selectedClipIds.length > 0) {
      store.splitClip(store.selectedClipIds[0], store.currentTime);
    }
  };

  const handleSnapToggle = () => {
    useEditorStore.setState({ snapping: !store.snapping });
  };

  // History counts
  const undoSteps = store.historyIndex;
  const redoSteps = store.history.length - 1 - store.historyIndex;

  return (
    <div className="flex h-11 items-center gap-1 overflow-x-auto border-b border-white/10 bg-[#10082c]/95 px-3 py-1.5 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* ── Logo ── */}
      <div className="flex items-center gap-2 mr-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffcf5a] to-[#ffb32c] shadow-[0_8px_24px_rgba(255,179,44,0.22)]">
          <Play className="h-3.5 w-3.5 fill-[#3b1769] text-[#3b1769]" />
        </div>
        <span className="text-sm font-semibold text-white hidden sm:inline tracking-tight">
          Studio Edit
        </span>
      </div>

      <ToolbarSep />

      {/* ── Playback ── */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={<SkipBack className="w-4 h-4" />}
          label="Go to Start (Home)"
          onClick={() => store.setCurrentTime(0)}
        />
        <ToolButton
          icon={
            store.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )
          }
          label="Play / Pause (Space)"
          onClick={store.togglePlay}
          active={store.isPlaying}
        />
        <ToolButton
          icon={<SkipForward className="w-4 h-4" />}
          label="Go to End (End)"
          onClick={() => store.setCurrentTime(store.totalDuration)}
        />
        <SpeedControl />
      </div>

      <ToolbarSep />

      {/* ── Tools: Select / Cut ── */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={<MousePointer2 className="w-4 h-4" />}
          label="Select Tool (V)"
          onClick={() => useEditorStore.setState({ activeTool: 'select' })}
          active={store.activeTool === 'select'}
        />
        <ToolButton
          icon={<Scissors className="w-4 h-4" />}
          label={
            store.activeTool === 'cut'
              ? 'Cut Tool active — click clip to split (C)'
              : 'Cut Tool (C)'
          }
          onClick={() => {
            if (store.activeTool === 'cut') {
              useEditorStore.setState({ activeTool: 'select' });
            } else {
              useEditorStore.setState({ activeTool: 'cut' });
            }
          }}
          active={store.activeTool === 'cut'}
        />
        {/* Prominent tool label */}
        {store.activeTool !== 'select' && (
          <Badge
            variant="outline"
            className={`ml-1 h-5 text-[10px] font-semibold tracking-wide uppercase border-0 px-1.5 ${
              store.activeTool === 'cut'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/10 text-[#c7b4ff]'
            }`}
          >
            {store.activeTool}
          </Badge>
        )}
      </div>

      <ToolbarSep />

      {/* ── Edit ── */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={<Copy className="w-4 h-4" />}
          label="Duplicate (Ctrl+D)"
          onClick={handleDuplicate}
          disabled={store.selectedClipIds.length === 0}
        />
        <ToolButton
          icon={<Trash2 className="w-4 h-4" />}
          label="Delete (Del)"
          onClick={handleDelete}
          disabled={store.selectedClipIds.length === 0}
        />
        <ToolButton
          icon={
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
              <path d="M8 14h.01" />
              <path d="M12 14h.01" />
              <path d="M16 14h.01" />
              <path d="M8 18h.01" />
              <path d="M12 18h.01" />
              <path d="M16 18h.01" />
            </svg>
          }
          label="Ripple Delete (Shift+Del)"
          onClick={handleRippleDelete}
          disabled={store.selectedClipIds.length === 0}
        />
      </div>

      <ToolbarSep />

      {/* ── History ── */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={<Undo2 className="w-4 h-4" />}
          label="Undo (Ctrl+Z)"
          onClick={store.undo}
          disabled={!store.canUndo()}
          badge={undoSteps > 0 ? undoSteps : null}
        />
        <ToolButton
          icon={<Redo2 className="w-4 h-4" />}
          label="Redo (Ctrl+Shift+Z)"
          onClick={store.redo}
          disabled={!store.canRedo()}
          badge={redoSteps > 0 ? redoSteps : null}
        />
      </div>

      <ToolbarSep />

      {/* ── View: Snap / Zoom ── */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={<Magnet className="w-4 h-4" />}
          label={`Snapping ${store.snapping ? 'ON' : 'OFF'} (N)`}
          onClick={handleSnapToggle}
          active={store.snapping}
        />
        <ToolButton
          icon={<ZoomOut className="w-4 h-4" />}
          label="Zoom Out (-)"
          onClick={store.zoomOut}
        />
        <ToolButton
          icon={<ZoomIn className="w-4 h-4" />}
          label="Zoom In (+)"
          onClick={store.zoomIn}
        />
        <ToolButton
          icon={<Maximize2 className="w-4 h-4" />}
          label="Fit to Content (Shift+0)"
          onClick={store.fitZoomToContent}
        />
      </div>

      <ToolbarSep />

      {/* ── Add Track ── */}
      <div className="flex items-center gap-0.5">
        <AddTrackDropdown />
      </div>

      {/* ── Clip Info (pushes Export to the right) ── */}
      <div className="min-w-3 flex-1" />

      <ClipInfoDisplay />

      {/* ── Export ── */}
      <ExportButton />
    </div>
  );
};

export default Toolbar;
