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

function getTypeBadge(type: MediaFile['type']): { label: string; color: string } {
  switch (type) {
    case 'video':
      return { label: 'VID', color: 'bg-sky-500/90' };
    case 'audio':
      return { label: 'AUD', color: 'bg-violet-500/90' };
    case 'image':
      return { label: 'IMG', color: 'bg-[#fa6a00]/90' };
    default:
      return { label: 'FILE', color: 'bg-[#8a6a45]/90' };
  }
}

function getTypeIcon(type: MediaFile['type']) {
  switch (type) {
    case 'video':
      return <Film className="w-3.5 h-3.5 text-sky-400" />;
    case 'audio':
      return <Music className="w-3.5 h-3.5 text-violet-400" />;
    case 'image':
      return <ImageIcon className="w-3.5 h-3.5 text-[#ffb06a]" />;
    default:
      return <Film className="w-3.5 h-3.5 text-[#8a6a45]" />;
  }
}

function getTypeFileIcon(type: MediaFile['type']) {
  switch (type) {
    case 'video':
      return <FileVideo className="w-4 h-4 text-sky-400" />;
    case 'audio':
      return <FileAudio className="w-4 h-4 text-violet-400" />;
    case 'image':
      return <FileImage className="w-4 h-4 text-[#ffb06a]" />;
    default:
      return <Film className="w-4 h-4 text-[#8a6a45]" />;
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
      <DialogContent className="bg-[#13100c] border-[#2a2118] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Info className="w-4 h-4 text-[#8a6a45]" />
            Media Properties
          </DialogTitle>
          <DialogDescription className="text-[#8a6a45]">
            File information and details
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {/* Preview */}
          <div className="rounded-2xl overflow-hidden bg-[#1a100a] border border-[#2a2118] mb-4">
            {(media.type === 'video' || media.type === 'image') ? (
              <img
                src={media.thumbnailUrl}
                alt={media.name}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="w-full h-40 flex items-center justify-center">
                <Music className="w-12 h-12 text-violet-400/50" />
              </div>
            )}
          </div>
          {/* Properties Table */}
          <div className="space-y-2">
            {properties.map((prop) => (
              <div
                key={prop.label}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#1a100a]/70"
              >
                <span className="text-xs text-[#8a6a45]">{prop.label}</span>
                <span className="text-xs text-[#f6e0c8] font-medium truncate ml-4 text-right">
                  {prop.value}
                </span>
              </div>
            ))}
          </div>
          {/* Type Badge */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#2a2118]">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-[10px] text-[#8a6a45]">
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
          className="group relative rounded-xl bg-[#1a100a]/70 hover:bg-[#21150d] border border-[#2a2118] hover:border-[#5c3920] transition-all cursor-grab active:cursor-grabbing overflow-hidden"
        >
          {/* Thumbnail */}
          <div className="relative aspect-video bg-[#0d0905] overflow-hidden">
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
                className="h-7 text-xs gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm shadow-lg"
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
              <p className="text-xs text-[#f6e0c8] truncate font-medium flex-1" title={media.name}>
                {media.name}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {media.type === 'video' && media.width > 0 && (
                <span className="text-[10px] text-[#8a6a45] font-mono">
                  {formatResolution(media.width, media.height)}
                </span>
              )}
              <span className="text-[10px] text-[#5d4226]">·</span>
              <span className="text-[10px] text-[#8a6a45]">
                {formatFileSize(media.file.size)}
              </span>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-[#13100c] border-[#2a2118] text-[#f6e0c8] w-52">
        <ContextMenuItem
          className="text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white"
          onClick={() => onAddToTimeline(media, 'default')}
        >
          <Plus className="w-4 h-4" />
          Add to Timeline
        </ContextMenuItem>
        <ContextMenuItem
          className="text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white"
          onClick={() => onAddToTimeline(media, 'start')}
        >
          <ArrowUpToLine className="w-4 h-4" />
          Add to Start of Timeline
        </ContextMenuItem>
        <ContextMenuItem
          className="text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white"
          onClick={() => onAddToTimeline(media, 'end')}
        >
          <ArrowDownToLine className="w-4 h-4" />
          Add to End of Timeline
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#2a2118]" />
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
          className="group relative flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-[#1a100a]/50 hover:bg-[#21150d] cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-[#2a2118]"
        >
          {/* Grip Handle */}
          <GripVertical className="w-3 h-3 text-[#5d4226] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Thumbnail */}
          <div className="w-20 h-11 rounded-lg bg-[#0d0905] overflow-hidden flex-shrink-0 border border-[#2a2118] relative">
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
                <Music className="w-4 h-4 text-violet-400/60" />
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
              <p className="text-xs text-[#f6e0c8] truncate font-medium" title={media.name}>
                {media.name}
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {media.type === 'video' && media.width > 0 && (
                <span className="text-[10px] text-[#8a6a45] font-mono">
                  {formatResolution(media.width, media.height)}
                </span>
              )}
              {(media.type === 'video' && media.width > 0) && (
                <span className="text-[10px] text-[#5d4226]">·</span>
              )}
              <span className="text-[10px] text-[#8a6a45]">
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
                  className="h-6 w-6 text-[#8a6a45] hover:text-[#ffb06a]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToTimeline(media, 'default');
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs bg-[#1a100a] border-[#2a2118] text-[#f6e0c8]">
                Add to Timeline
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[#8a6a45] hover:text-[#ffb06a]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowProperties(media);
                  }}
                >
                  <Info className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs bg-[#1a100a] border-[#2a2118] text-[#f6e0c8]">
                Properties
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[#8a6a45] hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    useEditorStore.getState().removeMediaFile(media.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs bg-[#1a100a] border-[#2a2118] text-[#f6e0c8]">
                Remove
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-[#13100c] border-[#2a2118] text-[#f6e0c8] w-52">
        <ContextMenuItem
          className="text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white"
          onClick={() => onAddToTimeline(media, 'default')}
        >
          <Plus className="w-4 h-4" />
          Add to Timeline
        </ContextMenuItem>
        <ContextMenuItem
          className="text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white"
          onClick={() => onAddToTimeline(media, 'start')}
        >
          <ArrowUpToLine className="w-4 h-4" />
          Add to Start of Timeline
        </ContextMenuItem>
        <ContextMenuItem
          className="text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white"
          onClick={() => onAddToTimeline(media, 'end')}
        >
          <ArrowDownToLine className="w-4 h-4" />
          Add to End of Timeline
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#2a2118]" />
        <ContextMenuItem
          className="text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white"
          onClick={() => onShowProperties(media)}
        >
          <Info className="w-4 h-4" />
          Properties
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#2a2118]" />
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
        const currentState = useEditorStore.getState();
        let firstClipStartTime = Infinity;

        for (const mediaId of addedMediaIds) {
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
            ctx.fillStyle = badge.color;
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
      const tracks = useEditorStore.getState().tracks;
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
      className="flex h-full flex-col bg-[#13100c]/90 relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* ========================================
          HEADER
          ======================================== */}
      <div className="flex flex-col border-b border-[#2a2118] px-3 pt-2 pb-2 space-y-2">
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
              className="h-7 rounded-xl px-2.5 text-[11px] gap-1.5 bg-[#1a100a] border-[#2a1a08] text-[#c07040] hover:text-[#fa6a00] hover:bg-[#fa6a00]/10 hover:border-[#fa6a00]/50"
              onClick={openFilePicker}
            >
              <FolderOpen className="w-3 h-3" />
              Browse
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6b4e2e]" />
          <Input
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 rounded-xl pl-7 pr-2 text-xs bg-[#1a100a] border-[#2a1a08] text-white placeholder:text-[#6b4e2e] focus-visible:ring-[#fa6a00]/20 focus-visible:border-[#fa6a00]"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6b4e2e] hover:text-[#fa6a00]"
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
              className="h-7 rounded-lg px-2 text-[10px] data-[state=on]:bg-[#fa6a00]/20 data-[state=on]:text-[#ffb06a] text-[#8a6a45] gap-1"
            >
              All
              <span className="text-[9px] opacity-60">{mediaCounts.all}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="video"
              size="sm"
              className="h-7 rounded-lg px-2 text-[10px] data-[state=on]:bg-[#fa6a00]/20 data-[state=on]:text-[#ffb06a] text-[#8a6a45] gap-1"
            >
              <Film className="w-3 h-3" />
              <span className="text-[9px] opacity-60">{mediaCounts.video}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="audio"
              size="sm"
              className="h-7 rounded-lg px-2 text-[10px] data-[state=on]:bg-[#fa6a00]/20 data-[state=on]:text-[#ffb06a] text-[#8a6a45] gap-1"
            >
              <Music className="w-3 h-3" />
              <span className="text-[9px] opacity-60">{mediaCounts.audio}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="image"
              size="sm"
              className="h-7 rounded-lg px-2 text-[10px] data-[state=on]:bg-[#fa6a00]/20 data-[state=on]:text-[#ffb06a] text-[#8a6a45] gap-1"
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
              className="h-7 w-auto min-w-0 rounded-lg px-2 text-[10px] bg-[#1a100a]/70 border-[#2a2118] text-[#8a6a45]"
            >
              <SortAsc className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#13100c] border-[#2a2118]">
              <SelectItem value="dateAdded" className="text-xs text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white">Date Added</SelectItem>
              <SelectItem value="name" className="text-xs text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white">Name</SelectItem>
              <SelectItem value="duration" className="text-xs text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white">Duration</SelectItem>
              <SelectItem value="size" className="text-xs text-[#f6e0c8] focus:bg-[#1a100a] focus:text-white">Size</SelectItem>
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
              className="h-7 rounded-lg px-2 data-[state=on]:bg-[#2a2118] data-[state=on]:text-white text-[#8a6a45]"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              size="sm"
              className="h-7 rounded-lg px-2 data-[state=on]:bg-[#2a2118] data-[state=on]:text-white text-[#8a6a45]"
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
        <div className="border-b border-[#2a2118] px-3 py-2 space-y-1.5 bg-[#1a100a]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 text-[#fa6a00] animate-spin" />
              <span className="text-[10px] text-[#c07040] font-medium">
                Importing {importProgress.length} file{importProgress.length > 1 ? 's' : ''}...
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[#8a6a45] hover:text-[#ffb06a]"
              onClick={clearImportProgress}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1">
            {importProgress.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.status === 'done' ? (
                  <Check className="w-3 h-3 text-[#ffb06a] flex-shrink-0" />
                ) : item.status === 'error' ? (
                  <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-3 h-3 text-[#8a6a45] animate-spin flex-shrink-0" />
                )}
                <span className="text-[10px] text-[#8a6a45] truncate flex-1">
                  {item.fileName}
                </span>
                {item.status !== 'done' && item.status !== 'error' && (
                  <div className="w-16 flex-shrink-0">
                    <Progress
                      value={item.progress}
                      className="h-1 bg-[#2a2118] [&>[data-slot=progress-indicator]]:bg-[#fa6a00]"
                    />
                  </div>
                )}
                {item.status === 'done' && (
                  <span className="text-[9px] text-[#ffb06a] flex-shrink-0">Done</span>
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
              className="h-1 bg-[#2a2118] [&>[data-slot=progress-indicator]]:bg-[#fa6a00]"
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
            <div className="absolute inset-0 z-20 bg-[#fa6a00]/5 border-2 border-dashed border-[#fa6a00]/40 rounded-2xl m-2 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
              <div className="w-10 h-10 rounded-xl bg-[#fa6a00]/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#ffb06a]" />
              </div>
              <p className="text-[#ffb06a] text-xs font-medium">Drop files to import</p>
              <p className="text-[#ffb06a]/60 text-[10px]">Video, Audio, or Images</p>
            </div>
          )}

          {/* Empty State */}
          {!isDragOver && filteredMedia.length === 0 && !hasActiveImport && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1a100a]/80 flex items-center justify-center mb-4 border border-[#2a2118]">
                <FolderOpen className="w-7 h-7 text-[#8a6a45]" />
              </div>
              <p className="text-xs text-[#c07040] text-center mb-1 font-medium">
                {search || filter !== 'all' ? 'No matching media' : 'No media files yet'}
              </p>
              <p className="text-[10px] text-[#5d4226] text-center mb-4">
                {search || filter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Drag & drop files or browse to get started'}
              </p>
              {!search && filter === 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-xl text-xs text-[#ffb06a] hover:text-white gap-1.5 bg-[#fa6a00]/10 hover:bg-[#fa6a00]/15 border border-[#fa6a00]/25"
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
              <Search className="w-8 h-8 text-[#5d4226] mb-3" />
              <p className="text-xs text-[#8a6a45] text-center">
                No results for &quot;{search}&quot;
              </p>
            </div>
          )}

          {/* ========================================
              IMPORT AREA (always visible above grid/list)
              ======================================== */}
          {!isDragOver && filteredMedia.length > 0 && !hasActiveImport && (
            <button
              className="mx-2 mt-2 mb-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[#2a2118] hover:border-[#fa6a00]/50 hover:bg-[#fa6a00]/10 transition-all cursor-pointer group"
              onClick={openFilePicker}
            >
              <div className="w-7 h-7 rounded-xl bg-[#1a100a] group-hover:bg-[#fa6a00]/10 flex items-center justify-center transition-colors">
                <Upload className="w-3.5 h-3.5 text-[#8a6a45] group-hover:text-[#ffb06a] transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-[11px] text-[#c07040] group-hover:text-[#f6e0c8] font-medium transition-colors">
                  Import Media
                </p>
                <p className="text-[9px] text-[#5d4226] group-hover:text-[#8a6a45] transition-colors">
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
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#2a2118] bg-[#13100c]/80">
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3 h-3 text-[#5d4226]" />
          <span className="text-[10px] text-[#8a6a45]">
            {filteredMedia.length} of {store.mediaFiles.length} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#5d4226]">
            {formatFileSize(store.mediaFiles.reduce((sum, m) => sum + m.file.size, 0))}
          </span>
          {/* FIX #1: Always-visible "Import Media" button in footer */}
          <Button
            size="sm"
            className="h-6 rounded-lg px-2.5 text-[10px] gap-1 bg-[#fa6a00] hover:bg-[#e84d00] text-white font-medium shadow-sm"
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
