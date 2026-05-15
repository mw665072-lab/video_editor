'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useEditorStore, type MediaFile } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  Film,
  Music,
  Image as ImageIcon,
  Trash2,
  Plus,
  FolderOpen,
  Search,
  LayoutGrid,
  List,
  Clock,
  ArrowDownToLine,
  ArrowUpToLine,
  FileVideo,
  FileAudio,
  FileImage,
  Info,
  X,
  Check,
  Loader2,
  GripVertical,
  HardDrive,
  SortAsc,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

type MediaTypeFilter = 'all' | 'video' | 'audio' | 'image';
type SortKey = 'name' | 'dateAdded' | 'duration' | 'size';
type ViewMode = 'grid' | 'list';

interface ImportProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'processing' | 'done' | 'error';
}

// ============================================================
// Helpers
// ============================================================

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatResolution(w: number, h: number): string {
  if (!w || !h) return '';
  return `${w}x${h}`;
}

function getTypeBadge(type: MediaFile['type']): { label: string; color: string; canvasColor: string } {
  switch (type) {
    case 'video':
      return { label: 'VID', color: 'bg-[#ffb32c]/90 text-[#3b1769]', canvasColor: '#ffb32c' };
    case 'audio':
      return { label: 'AUD', color: 'bg-[#7c3aed]/90', canvasColor: '#7c3aed' };
    case 'image':
      return { label: 'IMG', color: 'bg-[#ffb32c]/90 text-[#3b1769]', canvasColor: '#ffb32c' };
    default:
      return { label: 'FILE', color: 'bg-[#8f7bd6]/90', canvasColor: '#8f7bd6' };
  }
}

function getTypeIcon(type: MediaFile['type']) {
  switch (type) {
    case 'video':
      return <Film className="h-3.5 w-3.5 text-[#ffd36b]" />;
    case 'audio':
      return <Music className="w-3.5 h-3.5 text-[#c7b4ff]" />;
    case 'image':
      return <ImageIcon className="w-3.5 h-3.5 text-[#ffb32c]" />;
    default:
      return <Film className="w-3.5 h-3.5 text-[#c7b4ff]" />;
  }
}

function getTypeFileIcon(type: MediaFile['type']) {
  switch (type) {
    case 'video':
      return <FileVideo className="h-4 w-4 text-[#ffd36b]" />;
    case 'audio':
      return <FileAudio className="w-4 h-4 text-[#c7b4ff]" />;
    case 'image':
      return <FileImage className="w-4 h-4 text-[#ffb32c]" />;
    default:
      return <Film className="w-4 h-4 text-[#c7b4ff]" />;
  }
}

// ============================================================
// Properties Dialog
// ============================================================

function PropertiesDialog({
  media,
  open,
  onOpenChange,
}: {
  media: MediaFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!media) return null;

  const badge = getTypeBadge(media.type);
  const properties = [
    { label: 'File Name', value: media.name },
    { label: 'Type', value: media.type.charAt(0).toUpperCase() + media.type.slice(1) },
    { label: 'Duration', value: formatDuration(media.duration) },
    { label: 'Resolution', value: formatResolution(media.width, media.height) || 'N/A' },
    { label: 'File Size', value: formatFileSize(media.file.size) },
    { label: 'MIME Type', value: media.file.type || 'Unknown' },
    { label: 'Last Modified', value: new Date(media.file.lastModified).toLocaleString() },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#100a2f] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Info className="w-4 h-4 text-[#c7b4ff]" />
            Media Properties
          </DialogTitle>
          <DialogDescription className="text-[#c7b4ff]">
            File information and details
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {/* Preview */}
          <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {(media.type === 'video' || media.type === 'image') ? (
              <img
                src={media.thumbnailUrl}
                alt={media.name}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="w-full h-40 flex items-center justify-center">
                <Music className="w-12 h-12 text-[#c7b4ff]/50" />
              </div>
            )}
          </div>
          {/* Properties Table */}
          <div className="space-y-2">
            {properties.map((prop) => (
              <div
                key={prop.label}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/10"
              >
                <span className="text-xs text-[#c7b4ff]">{prop.label}</span>
                <span className="ml-4 truncate text-right text-xs font-medium text-white">
                  {prop.value}
                </span>
              </div>
            ))}
          </div>
          {/* Type Badge */}
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-[10px] text-[#c7b4ff]">
              ID: {media.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Media Grid Card
// ============================================================

function MediaGridCard({
  media,
  onDragStart,
  onAddToTimeline,
}: {
  media: MediaFile;
  onDragStart: (e: React.DragEvent, media: MediaFile) => void;
  onAddToTimeline: (media: MediaFile, position: 'default' | 'start' | 'end') => void;
}) {
  const badge = getTypeBadge(media.type);
  const [imgError, setImgError] = useState(false);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, media)}
          className="group relative cursor-grab overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:border-[#7c3aed]/50 hover:bg-white/10 active:cursor-grabbing"
        >
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden bg-[#10082c]">
            {(media.type === 'video' || media.type === 'image') && !imgError ? (
              <img
                src={media.thumbnailUrl}
                alt={media.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {getTypeFileIcon(media.type)}
              </div>
            )}

            {/* File Type Badge (top-left) */}
            <span
              className={`absolute top-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-white tracking-wider ${badge.color} shadow-sm`}
            >
              {badge.label}
            </span>

            {/* Duration Badge (bottom-right) */}
            {media.duration > 0 && (
              <span className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm">
                {formatDuration(media.duration)}
              </span>
            )}

            {/* Hover Overlay with Add to Timeline */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                size="sm"
                className="h-7 gap-1.5 border border-[#ffb32c]/30 bg-[#100a2f]/90 text-xs text-white shadow-lg backdrop-blur-sm hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToTimeline(media, 'default');
                }}
              >
                <Plus className="w-3 h-3" />
                Add to Timeline
              </Button>
            </div>
          </div>

          {/* Info Footer */}
          <div className="p-2">
            <div className="flex items-center gap-1.5">
              {getTypeIcon(media.type)}
              <p className="flex-1 truncate text-xs font-medium text-white" title={media.name}>
                {media.name}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {media.type === 'video' && media.width > 0 && (
                <span className="font-mono text-[10px] text-[#c7b4ff]">
                  {formatResolution(media.width, media.height)}
                </span>
              )}
              <span className="text-[10px] text-[#8f7bd6]">·</span>
              <span className="text-[10px] text-[#c7b4ff]">
                {formatFileSize(media.file.size)}
              </span>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 border-white/10 bg-[#100a2f] text-white">
        <ContextMenuItem
          className="text-white focus:bg-white/10 focus:text-white"
          onClick={() => onAddToTimeline(media, 'default')}
        >
          <Plus className="w-4 h-4" />
          Add to Timeline
        </ContextMenuItem>
        <ContextMenuItem
          className="text-white focus:bg-white/10 focus:text-white"
          onClick={() => onAddToTimeline(media, 'start')}
        >
          <ArrowUpToLine className="w-4 h-4" />
          Add to Start of Timeline
        </ContextMenuItem>
        <ContextMenuItem
          className="text-white focus:bg-white/10 focus:text-white"
          onClick={() => onAddToTimeline(media, 'end')}
        >
          <ArrowDownToLine className="w-4 h-4" />
          Add to End of Timeline
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem
          variant="destructive"
          className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
          onClick={() => {
            const store = useEditorStore.getState();
            store.removeMediaFile(media.id);
          }}
        >
          <Trash2 className="w-4 h-4" />
          Remove from Library
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ============================================================
// Media List Row
// ============================================================

function MediaListRow({
  media,
  onDragStart,
  onAddToTimeline,
  onShowProperties,
}: {
  media: MediaFile;
  onDragStart: (e: React.DragEvent, media: MediaFile) => void;
  onAddToTimeline: (media: MediaFile, position: 'default' | 'start' | 'end') => void;
  onShowProperties: (media: MediaFile) => void;
}) {
  const badge = getTypeBadge(media.type);
  const [imgError, setImgError] = useState(false);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, media)}
          className="group relative flex cursor-grab items-center gap-2.5 rounded-xl border border-transparent bg-white/5 px-2 py-1.5 transition-colors hover:border-white/10 hover:bg-white/10 active:cursor-grabbing"
        >
          {/* Grip Handle */}
          <GripVertical className="h-3 w-3 flex-shrink-0 text-[#8f7bd6] opacity-0 transition-opacity group-hover:opacity-100" />

          {/* Thumbnail */}
          <div className="relative h-11 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#10082c]">
            {(media.type === 'video' || media.type === 'image') && !imgError ? (
              <img
                src={media.thumbnailUrl}
                alt={media.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-4 w-4 text-[#c7b4ff]/60" />
              </div>
            )}
            {/* Type Badge */}
            <span
              className={`absolute top-0.5 left-0.5 inline-flex items-center px-1 py-px rounded text-[7px] font-bold text-white tracking-wider ${badge.color}`}
            >
              {badge.label}
            </span>
            {/* Duration */}
            {media.duration > 0 && (
              <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-mono px-1 py-px rounded">
                {formatDuration(media.duration)}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {getTypeIcon(media.type)}
              <p className="truncate text-xs font-medium text-white" title={media.name}>
                {media.name}
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {media.type === 'video' && media.width > 0 && (
                <span className="font-mono text-[10px] text-[#c7b4ff]">
                  {formatResolution(media.width, media.height)}
                </span>
              )}
              {(media.type === 'video' && media.width > 0) && (
                <span className="text-[10px] text-[#8f7bd6]">·</span>
              )}
              <span className="text-[10px] text-[#c7b4ff]">
                {formatFileSize(media.file.size)}
              </span>
            </div>
          </div>

          {/* Hover Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/80 hover:text-[#ffd36b]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToTimeline(media, 'default');
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="border-white/10 bg-[#100a2f] text-xs text-white">
                Add to Timeline
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/80 hover:text-[#ffd36b]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowProperties(media);
                  }}
                >
                  <Info className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="border-white/10 bg-[#100a2f] text-xs text-white">
                Properties
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[#c7b4ff] hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    useEditorStore.getState().removeMediaFile(media.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="border-white/10 bg-[#100a2f] text-xs text-white">
                Remove
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 border-white/10 bg-[#100a2f] text-white">
        <ContextMenuItem
          className="text-white focus:bg-white/10 focus:text-white"
          onClick={() => onAddToTimeline(media, 'default')}
        >
          <Plus className="w-4 h-4" />
          Add to Timeline
        </ContextMenuItem>
        <ContextMenuItem
          className="text-white focus:bg-white/10 focus:text-white"
          onClick={() => onAddToTimeline(media, 'start')}
        >
          <ArrowUpToLine className="w-4 h-4" />
          Add to Start of Timeline
        </ContextMenuItem>
        <ContextMenuItem
          className="text-white focus:bg-white/10 focus:text-white"
          onClick={() => onAddToTimeline(media, 'end')}
        >
          <ArrowDownToLine className="w-4 h-4" />
          Add to End of Timeline
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem
          className="text-white focus:bg-white/10 focus:text-white"
          onClick={() => onShowProperties(media)}
        >
          <Info className="w-4 h-4" />
          Properties
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem
          variant="destructive"
          className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
          onClick={() => {
            useEditorStore.getState().removeMediaFile(media.id);
          }}
        >
          <Trash2 className="w-4 h-4" />
          Remove from Library
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ============================================================
// Main Component
// ============================================================

const MediaBrowser: React.FC = () => {
  const store = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<MediaTypeFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded');
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);
  const [propertiesMedia, setPropertiesMedia] = useState<MediaFile | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const dragImageRef = useRef<HTMLCanvasElement | null>(null);

  // ============================================================
  // Import Handling
  // ============================================================

  // Extension-based media type detection (fallback when MIME type is missing)
  const MEDIA_EXTENSIONS = new Set([
    // Video
    'mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', 'ts', 'mts', 'm2ts', '3gp', 'ogv', 'mpg', 'mpeg',
    // Audio
    'mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'opus', 'm4p', 'mid', 'midi', 'aiff',
    // Image
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif',
  ]);

  const isValidMediaFile = (f: File): boolean => {
    // Check MIME type first
    if (f.type && (f.type.startsWith('video/') || f.type.startsWith('audio/') || f.type.startsWith('image/'))) {
      return true;
    }
    // Fallback: check extension
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    return MEDIA_EXTENSIONS.has(ext);
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter(isValidMediaFile);
      if (validFiles.length === 0) return;

      const progressList: ImportProgress[] = validFiles.map((f) => ({
        fileName: f.name,
        progress: 0,
        status: 'pending' as const,
      }));
      setImportProgress(progressList);

      // Track newly added media IDs for auto-add to timeline
      const addedMediaIds: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setImportProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: 'processing', progress: 20 } : p
          )
        );

        try {
          setImportProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, progress: 50 } : p
            )
          );

          const newMedia = await store.addMediaFile(file);
          if (newMedia && newMedia.id) {
            addedMediaIds.push(newMedia.id);
          }

          setImportProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, status: 'done', progress: 100 } : p
            )
          );
        } catch {
          setImportProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, status: 'error', progress: 0 } : p
            )
          );
        }
      }

      // Auto-add imported media to timeline
      if (addedMediaIds.length > 0) {
        let firstClipStartTime = Infinity;

        for (const mediaId of addedMediaIds) {
          const currentState = useEditorStore.getState();
          const media = currentState.mediaFiles.find((m) => m.id === mediaId);
          if (!media) continue;

          const tracks = currentState.tracks;
          // Find the first matching track
          const trackIndex = tracks.findIndex((t) => {
            if (media.type === 'audio') return t.type === 'audio';
            return t.type === 'video';
          });
          if (trackIndex === -1) continue;

          // Find the end of the track to append after the last clip
          const track = tracks[trackIndex];
          const lastClip = track.clips[track.clips.length - 1];
          const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;

          currentState.addClipToTrack(mediaId, trackIndex, startTime);

          if (startTime < firstClipStartTime) {
            firstClipStartTime = startTime;
          }
        }

        // Seek to the first added clip so user sees preview immediately
        if (firstClipStartTime < Infinity) {
          useEditorStore.setState({ currentTime: firstClipStartTime, isPlaying: false });
        }
      }

      // Clear progress after a short delay
      setTimeout(() => setImportProgress([]), 1500);
    },
    [store]
  );

  const clearImportProgress = useCallback(() => {
    setImportProgress([]);
  }, []);

  // ============================================================
  // Drag & Drop
  // ============================================================

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      // Only process external file drops (not internal media drags)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show visual drop overlay for external files (not internal media drags)
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if we're leaving the panel entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, media: MediaFile) => {
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({ mediaId: media.id, type: 'media' })
      );
      e.dataTransfer.effectAllowed = 'copy';

      // Create a ghost drag image with the thumbnail
      try {
        const img = new Image();
        img.src = media.thumbnailUrl;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 120;
          canvas.height = 68;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw thumbnail
            ctx.drawImage(img, 0, 0, 120, 68);
            // Add type badge
            const badge = getTypeBadge(media.type);
            ctx.fillStyle = badge.canvasColor;
            ctx.fillRect(2, 2, 26, 14);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(badge.label, 5, 12);
            // Add name
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 54, 120, 14);
            ctx.fillStyle = '#fff';
            ctx.font = '8px sans-serif';
            const name = media.name.length > 18 ? media.name.slice(0, 16) + '...' : media.name;
            ctx.fillText(name, 3, 64);
            e.dataTransfer.setDragImage(canvas, 60, 34);
          }
        };
        // Fallback: if image hasn't loaded yet, still proceed
        setTimeout(() => {
          // no-op fallback
        }, 100);
      } catch {
        // Fallback to default drag image
      }
    },
    []
  );

  // ============================================================
  // Add to Timeline
  // ============================================================

  const handleAddToTimeline = useCallback(
    (media: MediaFile, position: 'default' | 'start' | 'end') => {
      const currentState = useEditorStore.getState();
      const existingClip = currentState.tracks
        .flatMap((track) => track.clips)
        .find((clip) => clip.mediaId === media.id);

      if (existingClip) {
        useEditorStore.setState({
          selectedClipIds: [existingClip.id],
          currentTime: existingClip.startTime,
          isPlaying: false,
        });
        return;
      }

      const tracks = currentState.tracks;
      // Find the first matching track
      const trackIndex = tracks.findIndex((t) => {
        if (media.type === 'audio') return t.type === 'audio';
        return t.type === 'video';
      });
      if (trackIndex === -1) return;

      let startTime: number | undefined;
      if (position === 'start') {
        startTime = 0;
      } else if (position === 'end') {
        const track = tracks[trackIndex];
        const lastClip = track.clips[track.clips.length - 1];
        startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
      }
      // 'default' passes undefined, so addClipToTrack auto-appends

      store.addClipToTrack(media.id, trackIndex, startTime);
    },
    [store]
  );

  // ============================================================
  // Properties Dialog
  // ============================================================

  const handleShowProperties = useCallback((media: MediaFile) => {
    setPropertiesMedia(media);
    setPropertiesOpen(true);
  }, []);

  // ============================================================
  // Filter, Search, Sort
  // ============================================================

  const filteredMedia = useMemo(() => {
    let items = [...store.mediaFiles];

    // Filter by type
    if (filter !== 'all') {
      items = items.filter((m) => m.type === filter);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter((m) => m.name.toLowerCase().includes(q));
    }

    // Sort
    items.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'dateAdded':
          // Use array index as proxy for date added (last added = highest index)
          return store.mediaFiles.indexOf(b) - store.mediaFiles.indexOf(a);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'size':
          return b.file.size - a.file.size;
        default:
          return 0;
      }
    });

    return items;
  }, [store.mediaFiles, filter, search, sortKey]);

  const mediaCounts = useMemo(() => {
    return {
      all: store.mediaFiles.length,
      video: store.mediaFiles.filter((m) => m.type === 'video').length,
      audio: store.mediaFiles.filter((m) => m.type === 'audio').length,
      image: store.mediaFiles.filter((m) => m.type === 'image').length,
    };
  }, [store.mediaFiles]);

  const hasActiveImport = importProgress.length > 0;

  return (
    <div
      className="relative flex h-full flex-col bg-[#100a2f]/90"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* ========================================
          HEADER
          ======================================== */}
      <div className="flex flex-col space-y-2 border-b border-white/10 px-3 pt-2 pb-2">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Media
          </h3>
          <div className="flex items-center gap-1">
            {/* FIX #7: Replace tiny icon with a visible "Browse" text button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-xl border-white/10 bg-white/5 px-2.5 text-[11px] text-white/80 hover:border-[#ffb32c]/50 hover:bg-white/10 hover:text-[#ffd36b]"
              onClick={openFilePicker}
            >
              <FolderOpen className="w-3 h-3" />
              Browse
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#8f7bd6]" />
          <Input
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 rounded-xl border-white/10 bg-white/5 pl-7 pr-2 text-xs text-white placeholder:text-[#8f7bd6] focus-visible:border-[#ffb32c] focus-visible:ring-[#ffb32c]/20"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8f7bd6] hover:text-[#ffd36b]"
              onClick={() => setSearch('')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter + Sort + View Controls */}
        <div className="flex items-center gap-2">
          {/* Filter Toggle Group */}
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(v) => v && setFilter(v as MediaTypeFilter)}
            className="h-7"
          >
            <ToggleGroupItem
              value="all"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-[10px] text-white/75 data-[state=on]:bg-[#ffb32c]/18 data-[state=on]:text-[#ffd36b]"
            >
              All
              <span className="text-[9px] opacity-60">{mediaCounts.all}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="video"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-[10px] text-white/75 data-[state=on]:bg-[#ffb32c]/18 data-[state=on]:text-[#ffd36b]"
            >
              <Film className="w-3 h-3" />
              <span className="text-[9px] opacity-60">{mediaCounts.video}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="audio"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-[10px] text-white/75 data-[state=on]:bg-[#ffb32c]/18 data-[state=on]:text-[#ffd36b]"
            >
              <Music className="w-3 h-3" />
              <span className="text-[9px] opacity-60">{mediaCounts.audio}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="image"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-[10px] text-white/75 data-[state=on]:bg-[#ffb32c]/18 data-[state=on]:text-[#ffd36b]"
            >
              <ImageIcon className="w-3 h-3" />
              <span className="text-[9px] opacity-60">{mediaCounts.image}</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sort Select */}
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger
              size="sm"
              className="h-7 w-auto min-w-0 rounded-lg border-white/10 bg-white/5 px-2 text-[10px] text-[#c7b4ff]"
            >
              <SortAsc className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#100a2f]">
              <SelectItem value="dateAdded" className="text-xs text-[#f8f7ff] focus:bg-white/10 focus:text-white">Date Added</SelectItem>
              <SelectItem value="name" className="text-xs text-[#f8f7ff] focus:bg-white/10 focus:text-white">Name</SelectItem>
              <SelectItem value="duration" className="text-xs text-[#f8f7ff] focus:bg-white/10 focus:text-white">Duration</SelectItem>
              <SelectItem value="size" className="text-xs text-[#f8f7ff] focus:bg-white/10 focus:text-white">Size</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="h-7"
          >
            <ToggleGroupItem
              value="grid"
              size="sm"
              className="h-7 rounded-lg px-2 text-[#c7b4ff] data-[state=on]:bg-white/10 data-[state=on]:text-white"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              size="sm"
              className="h-7 rounded-lg px-2 text-[#c7b4ff] data-[state=on]:bg-white/10 data-[state=on]:text-white"
            >
              <List className="w-3.5 h-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* ========================================
          IMPORT PROGRESS PANEL
          ======================================== */}
      {hasActiveImport && (
        <div className="space-y-1.5 border-b border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-[#ffb32c]" />
              <span className="text-[10px] font-medium text-[#f2c5ff]">
                Importing {importProgress.length} file{importProgress.length > 1 ? 's' : ''}...
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-white/75 hover:text-[#ffd36b]"
              onClick={clearImportProgress}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1">
            {importProgress.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.status === 'done' ? (
                  <Check className="h-3 w-3 flex-shrink-0 text-[#ffd36b]" />
                ) : item.status === 'error' ? (
                  <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin text-[#c7b4ff]" />
                )}
                <span className="flex-1 truncate text-[10px] text-[#c7b4ff]">
                  {item.fileName}
                </span>
                {item.status !== 'done' && item.status !== 'error' && (
                  <div className="w-16 flex-shrink-0">
                    <Progress
                      value={item.progress}
                      className="h-1 bg-white/10 [&>[data-slot=progress-indicator]]:bg-[#ffb32c]"
                    />
                  </div>
                )}
                {item.status === 'done' && (
                  <span className="flex-shrink-0 text-[9px] text-[#ffd36b]">Done</span>
                )}
                {item.status === 'error' && (
                  <span className="text-[9px] text-red-400 flex-shrink-0">Failed</span>
                )}
              </div>
            ))}
          </div>
          {/* Overall progress */}
          <div className="pt-1">
            <Progress
              value={
                importProgress.length > 0
                  ? (importProgress.filter((p) => p.status === 'done').length /
                      importProgress.length) *
                    100
                  : 0
              }
              className="h-1 bg-white/10 [&>[data-slot=progress-indicator]]:bg-[#ffb32c]"
            />
          </div>
        </div>
      )}

      {/* ========================================
          MEDIA LIST / GRID
          ======================================== */}
      <ScrollArea className="flex-1">
        <div className="relative min-h-[120px]">
          {/* Drag Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-20 m-2 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ffb32c]/40 bg-[#ffb32c]/5 backdrop-blur-[1px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffb32c]/10">
                <Upload className="h-5 w-5 text-[#ffd36b]" />
              </div>
              <p className="text-xs font-medium text-[#ffd36b]">Drop files to import</p>
              <p className="text-[10px] text-[#ffb32c]/70">Video, Audio, or Images</p>
            </div>
          )}

          {/* Empty State */}
          {!isDragOver && filteredMedia.length === 0 && !hasActiveImport && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <FolderOpen className="h-7 w-7 text-[#c7b4ff]" />
              </div>
              <p className="mb-1 text-center text-xs font-medium text-[#f2c5ff]">
                {search || filter !== 'all' ? 'No matching media' : 'No media files yet'}
              </p>
              <p className="mb-4 text-center text-[10px] text-[#8f7bd6]">
                {search || filter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Drag & drop files or browse to get started'}
              </p>
              {!search && filter === 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-xl border border-[#ffb32c]/25 bg-[#ffb32c]/10 text-xs text-[#ffd36b] hover:bg-[#ffb32c]/15 hover:text-white"
                  onClick={openFilePicker}
                >
                  <Upload className="w-3 h-3" />
                  Browse Files
                </Button>
              )}
            </div>
          )}

          {/* No results with items in library */}
          {!isDragOver && filteredMedia.length === 0 && store.mediaFiles.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search className="mb-3 h-8 w-8 text-[#8f7bd6]" />
              <p className="text-center text-xs text-[#c7b4ff]">
                No results for &quot;{search}&quot;
              </p>
            </div>
          )}

          {/* ========================================
              IMPORT AREA (always visible above grid/list)
              ======================================== */}
          {!isDragOver && filteredMedia.length > 0 && !hasActiveImport && (
            <button
              className="group mx-2 mb-1 mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3 transition-all hover:border-[#ffb32c]/50 hover:bg-white/10"
              onClick={openFilePicker}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 transition-colors group-hover:bg-[#ffb32c]/10">
                <Upload className="h-3.5 w-3.5 text-white/75 transition-colors group-hover:text-[#ffd36b]" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-medium text-[#f2c5ff] transition-colors group-hover:text-white">
                  Import Media
                </p>
                <p className="text-[9px] text-[#8f7bd6] transition-colors group-hover:text-[#c7b4ff]">
                  Click to browse or drag &amp; drop files
                </p>
              </div>
            </button>
          )}

          {/* ========================================
              GRID VIEW
              ======================================== */}
          {viewMode === 'grid' && filteredMedia.length > 0 && (
            <div className="p-2 grid grid-cols-2 gap-2">
              {filteredMedia.map((media) => (
                <MediaGridCard
                  key={media.id}
                  media={media}
                  onDragStart={handleDragStart}
                  onAddToTimeline={handleAddToTimeline}
                />
              ))}
            </div>
          )}

          {/* ========================================
              LIST VIEW
              ======================================== */}
          {viewMode === 'list' && filteredMedia.length > 0 && (
            <div className="p-2 space-y-1">
              {filteredMedia.map((media) => (
                <MediaListRow
                  key={media.id}
                  media={media}
                  onDragStart={handleDragStart}
                  onAddToTimeline={handleAddToTimeline}
                  onShowProperties={handleShowProperties}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ========================================
          FOOTER: Stats + Always-visible Import Button
          ======================================== */}
      <div className="flex items-center justify-between border-t border-white/10 bg-[#10082c]/80 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3 w-3 text-[#8f7bd6]" />
          <span className="text-[10px] text-[#c7b4ff]">
            {filteredMedia.length} of {store.mediaFiles.length} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8f7bd6]">
            {formatFileSize(store.mediaFiles.reduce((sum, m) => sum + m.file.size, 0))}
          </span>
          {/* FIX #1: Always-visible "Import Media" button in footer */}
          <Button
            size="sm"
            className="h-6 gap-1 rounded-lg bg-gradient-to-br from-[#ffcf5a] to-[#ffb32c] px-2.5 text-[10px] font-bold text-[#3b1769] shadow-sm hover:from-[#ffd36b] hover:to-[#ffb32c]"
            onClick={openFilePicker}
          >
            <Plus className="w-3 h-3" />
            Import Media
          </Button>
        </div>
      </div>

      {/* ========================================
          PROPERTIES DIALOG
          ======================================== */}
      <PropertiesDialog
        media={propertiesMedia}
        open={propertiesOpen}
        onOpenChange={setPropertiesOpen}
      />

      {/* Hidden file input - accept all files, JS validates media types */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*,.mp4,.webm,.mkv,.avi,.mov,.mp3,.wav,.aac,.flac,.ogg,.m4a,.jpg,.jpeg,.png,.gif,.webp"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
};

export default MediaBrowser;
