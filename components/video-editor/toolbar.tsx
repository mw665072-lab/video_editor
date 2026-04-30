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
              ? 'bg-[#fa6a00] text-white hover:bg-[#e84d00]'
              : 'text-[#8a6a45] hover:text-[#fa6a00] hover:bg-[#fa6a00]/10'
          }`}
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
          {badge !== undefined && badge !== null && Number(badge) > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#fa6a00] text-[9px] font-bold leading-none text-white">
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
  <Separator orientation="vertical" className="mx-1.5 h-6 bg-[#2a2118]" />
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
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-[#8a6a45] hover:text-white'
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
        className="w-32 bg-[#13100c] border-[#2a2118]"
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
                ? 'text-[#ffb06a] bg-[#fa6a00]/15'
                : 'text-[#c07040] focus:text-white focus:bg-[#1a100a]'
            }`}
          >
            {formatSpeed(speed)}
            {store.playbackSpeed === speed && (
              <span className="ml-auto text-[10px] text-[#fa6a00]">✓</span>
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
                className="h-7 gap-1 rounded-xl px-2 text-xs text-[#8a6a45] hover:text-white hover:bg-[#1a100a]"
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
        className="w-40 bg-[#13100c] border-[#2a2118]"
      >
        <DropdownMenuItem
          onClick={() => store.addTrack('video')}
          className="text-xs text-[#c07040] focus:text-white focus:bg-[#1a100a] cursor-pointer gap-2"
        >
          <Film className="h-3.5 w-3.5 text-[#8a6a45]" />
          Add Video Track
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#2a2118]" />
        <DropdownMenuItem
          onClick={() => store.addTrack('audio')}
          className="text-xs text-[#c07040] focus:text-white focus:bg-[#1a100a] cursor-pointer gap-2"
        >
          <Waves className="h-3.5 w-3.5 text-[#8a6a45]" />
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
          className="h-8 rounded-xl bg-[#fa6a00] hover:bg-[#e84d00] text-white gap-1.5 text-xs font-semibold shadow-sm shadow-[#fa6a00]/30"
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
      <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#1a100a]/80 border border-[#2a2118]">
        <Badge variant="secondary" className="h-5 text-[10px] bg-[#2a2118] text-[#c07040] border-0 font-medium px-1.5">
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
    <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#1a100a]/80 border border-[#2a2118]">
      <div
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: clip.color }}
      />
      <span className="text-[11px] text-[#c07040] font-medium truncate max-w-[120px]">
        {truncatedName}
      </span>
      <span className="text-[10px] text-[#8a6a45] font-mono">
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
    <div className="flex items-center gap-1 px-3 py-1.5 bg-[#13100c]/95 border-b border-[#2a2118] h-11 select-none">
      {/* ── Logo ── */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)' }}>
          <Play className="w-3.5 h-3.5 text-white fill-white" />
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
                : 'bg-[#2a2118] text-[#c07040]'
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
      <div className="flex-1" />

      <ClipInfoDisplay />

      {/* ── Export ── */}
      <ExportButton />
    </div>
  );
};

export default Toolbar;
