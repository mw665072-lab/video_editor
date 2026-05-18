import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Types — Core
// ============================================================

export interface MediaFile {
  id: string;
  name: string;
  file: File;
  url: string;
  duration: number;
  thumbnailUrl: string;
  width: number;
  height: number;
  type: 'video' | 'audio' | 'image';
}

// ============================================================
// Types — Effects & Color Grading
// ============================================================

export interface ClipEffects {
  brightness: number;      // -100 to 100, default 0
  contrast: number;        // -100 to 100, default 0
  saturation: number;      // -100 to 100, default 0
  hue: number;             // -180 to 180, default 0
  blur: number;            // 0 to 20, default 0
  sharpen: number;         // 0 to 100, default 0
  opacity: number;         // 0 to 1, default 1
  speed: number;           // 0.25 to 4, default 1
  volume: number;          // 0 to 2, default 1
  fadeInDuration: number;  // seconds, 0 means no fade
  fadeOutDuration: number; // seconds, 0 means no fade
}

export interface ColorGrading {
  lift: { r: number; g: number; b: number };    // -1 to 1
  gamma: { r: number; g: number; b: number };   // -1 to 1
  gain: { r: number; g: number; b: number };    // -1 to 1
  temperature: number;  // -100 to 100
  tint: number;         // -100 to 100
}

// ============================================================
// Types — Transitions
// ============================================================

export interface ClipTransition {
  type: 'none' | 'crossfade' | 'dipToBlack' | 'dipToWhite' | 'wipeLeft' | 'wipeRight' | 'wipeUp' | 'wipeDown' | 'slideLeft' | 'slideRight';
  duration: number;  // seconds, typically 0.5-2
}

// ============================================================
// Types — Text Overlays
// ============================================================

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  trackIndex: number;
  x: number;            // 0-1 normalized position
  y: number;
  fontSize: number;     // px
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  textAlign: 'left' | 'center' | 'right';
  animation: 'none' | 'fadeIn' | 'fadeOut' | 'typewriter' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'bounce' | 'glitch';
  animationDuration: number; // seconds
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
  lineHeight: number;
  letterSpacing: number;
  maxWidth: number;      // 0 means auto
  rotation: number;      // degrees
}

// ============================================================
// Types — Subtitles
// ============================================================

export interface SubtitleEntry {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  style: Partial<TextOverlay>;
}

// ============================================================
// Types — Keyframes
// ============================================================

export interface Keyframe {
  time: number;
  property: string;
  value: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';
}

// ============================================================
// Types — Timeline
// ============================================================

export interface TimelineClip {
  id: string;
  mediaId: string;
  trackIndex: number;
  startTime: number;       // position on timeline (seconds)
  duration: number;         // visible duration on timeline (seconds)
  trimStart: number;        // trimmed from beginning of source (seconds)
  trimEnd: number;          // trimmed from end of source (seconds)
  label?: string;
  color: string;
  effects: ClipEffects;
  colorGrading: ColorGrading;
  transition: ClipTransition;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio';
  clips: TimelineClip[];
  height: number;
  muted: boolean;
  locked: boolean;
  visible: boolean;
}

export interface HistoryEntry {
  tracks: TimelineTrack[];
  description: string;
}

export interface ClipProperties {
  clip: TimelineClip;
  media: MediaFile | undefined;
  trackId: string;
  trackName: string;
}

// ============================================================
// Types — State
// ============================================================

interface EditorState {
  // Media library
  mediaFiles: MediaFile[];

  // Timeline
  tracks: TimelineTrack[];
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  zoom: number; // pixels per second
  scrollX: number;
  selectedClipIds: string[];
  snapping: boolean;
  snapThreshold: number; // seconds

  // Waveform data (per media ID)
  waveformData: Map<string, number[]>;

  // Waveform cache (per media ID)
  waveformCache: Map<string, number[]>;

  // Playback speed
  playbackSpeed: number;

  // Snap indicators (visual snap lines)
  snapIndicators: { time: number; trackId: string }[];

  // UI
  activeTool: 'select' | 'cut' | 'zoom';
  isDragging: boolean;
  isExporting: boolean;
  exportProgress: number;

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  maxHistory: number;

  // Text overlays
  textOverlays: TextOverlay[];

  // Subtitles
  subtitles: SubtitleEntry[];

  // ============================================================
  // Media Actions
  // ============================================================
  addMediaFile: (file: File) => Promise<MediaFile>;
  addMediaFiles: (files: File[]) => Promise<void>;
  removeMediaFile: (id: string) => void;
  getMediaFile: (id: string) => MediaFile | undefined;

  // ============================================================
  // Track Actions
  // ============================================================
  addTrack: (type: 'video' | 'audio', name?: string) => void;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  moveTrack: (fromIndex: number, toIndex: number) => void;

  // ============================================================
  // Clip Actions
  // ============================================================
  addClipToTrack: (mediaId: string, trackIndex: number, startTime?: number) => void;
  removeClip: (clipId: string) => void;
  removeClips: (clipIds: string[]) => void;
  moveClip: (clipId: string, newTrackIndex: number, newStartTime: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  trimClipLeft: (clipId: string, deltaTime: number) => void;
  trimClipRight: (clipId: string, deltaTime: number) => void;
  duplicateClip: (clipId: string) => void;
  selectClip: (clipId: string, multi?: boolean) => void;
  deselectAll: () => void;
  getSelectedClips: () => TimelineClip[];
  rippleDelete: (clipId: string) => void;
  getClipProperties: (clipId: string) => ClipProperties | null;

  // ============================================================
  // Effects & Color Grading Actions
  // ============================================================
  updateClipEffects: (clipId: string, effects: Partial<ClipEffects>) => void;
  updateClipColorGrading: (clipId: string, grading: Partial<ColorGrading>) => void;
  updateClipTransition: (clipId: string, transition: Partial<ClipTransition>) => void;
  updateClipSpeed: (clipId: string, speed: number) => void;
  resetClipEffects: (clipId: string) => void;

  // ============================================================
  // Text Overlay Actions
  // ============================================================
  addTextOverlay: (overlay: Omit<TextOverlay, 'id'>) => string;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  removeTextOverlay: (id: string) => void;
  getTextOverlaysAtTime: (time: number) => TextOverlay[];

  // ============================================================
  // Subtitle Actions
  // ============================================================
  importSubtitles: (srtContent: string) => SubtitleEntry[];
  addSubtitle: (entry: Omit<SubtitleEntry, 'id'>) => string;
  removeSubtitle: (id: string) => void;

  // ============================================================
  // Playback Actions
  // ============================================================
  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;

  // ============================================================
  // Timeline Actions
  // ============================================================
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitZoomToContent: () => void;
  setScrollX: (scrollX: number) => void;

  // ============================================================
  // History Actions
  // ============================================================
  pushHistory: (description?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // ============================================================
  // Export Actions
  // ============================================================
  setIsExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;

  // ============================================================
  // Utility
  // ============================================================
  getActiveVideoAtTime: (time: number) => TimelineClip | null;
  recalculateDuration: () => void;
  snapTime: (time: number) => number;
  getWaveformData: (mediaId: string) => number[] | null;
}

// ============================================================
// Default Constants
// ============================================================

const DEFAULT_EFFECTS: ClipEffects = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  sharpen: 0,
  opacity: 1,
  speed: 1,
  volume: 1,
  fadeInDuration: 0,
  fadeOutDuration: 0,
};

const DEFAULT_COLOR_GRADING: ColorGrading = {
  lift: { r: 0, g: 0, b: 0 },
  gamma: { r: 0, g: 0, b: 0 },
  gain: { r: 0, g: 0, b: 0 },
  temperature: 0,
  tint: 0,
};

const DEFAULT_TRANSITION: ClipTransition = {
  type: 'none',
  duration: 0.5,
};

// ============================================================
// Helpers — Colors & Playback
// ============================================================

const CLIP_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
];

const SUPPORTED_PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function getRandomColor() {
  return CLIP_COLORS[Math.floor(Math.random() * CLIP_COLORS.length)];
}

// ============================================================
// Helpers — Media Detection
// ============================================================

function detectMediaType(file: File): 'video' | 'audio' | 'image' {
  // First try MIME type
  if (file.type) {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('image/')) return 'image';
  }
  // Fallback: use file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', 'ts', 'mts', 'm2ts', '3gp', 'ogv'];
  const audioExts = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'opus', 'm4p', 'mid', 'midi'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif'];
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (imageExts.includes(ext)) return 'image';
  // Default based on extension category
  if (file.type) return 'video';
  return 'image';
}

// ============================================================
// Helpers — Thumbnail Generation
// ============================================================

function generateThumbnail(file: File): Promise<string> {
  const mediaType = detectMediaType(file);

  // For images, just read as data URL directly
  if (mediaType === 'image') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('/placeholder.png');
      reader.readAsDataURL(file);
    });
  }

  // For audio, create a placeholder with waveform bars
  if (mediaType === 'audio') {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, 160, 90);
        // Draw simple waveform bars
        ctx.fillStyle = '#a78bfa';
        for (let i = 0; i < 20; i++) {
          const h = 10 + Math.random() * 40;
          const x = 10 + i * 7;
          ctx.fillRect(x, 45 - h / 2, 4, h);
        }
      }
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    });
  }

  // For video, extract a frame
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    const cleanup = () => { URL.revokeObjectURL(url); };

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 4);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw black bg
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, 160, 90);
          ctx.drawImage(video, 0, 0, 160, 90);
        }
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        cleanup();
        resolve(thumbnailUrl);
      } catch {
        cleanup();
        resolve('/placeholder.png');
      }
    };

    video.onerror = () => {
      cleanup();
      resolve('/placeholder.png');
    };

    // Timeout fallback
    setTimeout(() => {
      cleanup();
      resolve('/placeholder.png');
    }, 15000);
  });
}

// ============================================================
// Helpers — Media Info Extraction
// ============================================================

function getMediaInfo(file: File): Promise<{ duration: number; width: number; height: number; type: 'video' | 'audio' | 'image' }> {
  return new Promise((resolve) => {
    const mediaType = detectMediaType(file);

    if (mediaType === 'audio') {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      const url = URL.createObjectURL(file);
      audio.src = url;
      const cleanup = () => { URL.revokeObjectURL(url); };
      audio.onloadedmetadata = () => {
        cleanup();
        resolve({ duration: audio.duration, width: 0, height: 0, type: 'audio' });
      };
      audio.onerror = () => {
        cleanup();
        resolve({ duration: 0, width: 0, height: 0, type: 'audio' });
      };
      return;
    }

    if (mediaType === 'image') {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ duration: 0, width: img.naturalWidth || 0, height: img.naturalHeight || 0, type: 'image' });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ duration: 0, width: 0, height: 0, type: 'image' });
      };
      img.src = url;
      // Timeout fallback
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve({ duration: 0, width: 0, height: 0, type: 'image' });
      }, 10000);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;
    const cleanup = () => { URL.revokeObjectURL(url); };
    video.onloadedmetadata = () => {
      cleanup();
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        type: 'video',
      });
    };
    video.onerror = () => {
      cleanup();
      // Still mark as video even on error - let the user try
      resolve({ duration: 0, width: 0, height: 0, type: 'video' });
    };
    // Timeout fallback
    setTimeout(() => {
      cleanup();
      resolve({ duration: 0, width: 0, height: 0, type: 'video' });
    }, 10000);
  });
}

// ============================================================
// Helpers — Waveform Generation (exported for use in components)
// ============================================================

export async function generateWaveform(file: File, samples: number = 200): Promise<number[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Decode audio from video/audio files using OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(1, 1, 44100);
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));

    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let sum = 0;
      const end = Math.min(start + blockSize, channelData.length);
      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }
      waveform.push(sum / (end - start));
    }

    // Normalize to 0-1 range
    const max = Math.max(...waveform, 0.01);
    return waveform.map((v) => v / max);
  } catch {
    // Return flat zero waveform on decode failure (e.g. image files)
    return new Array(samples).fill(0);
  }
}

// ============================================================
// Helpers — SRT Subtitle Parser
// ============================================================

/**
 * Parses standard SRT subtitle format into SubtitleEntry[].
 *
 * Expected SRT format:
 *   1
 *   00:00:01,000 --> 00:00:04,000
 *   Hello, world!
 *
 * Supports:
 *   - Comma or dot as millisecond separator
 *   - Blank lines between entries
 *   - Trailing whitespace and newlines
 *   - Empty content (skipped)
 */
export function parseSRT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];

  if (!content || !content.trim()) return entries;

  // Normalize line endings and split into blocks separated by blank lines
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    // Find the timestamp line (contains "-->")
    let timestampLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampLineIndex = i;
        break;
      }
    }

    if (timestampLineIndex === -1) continue;

    const timestampLine = lines[timestampLineIndex];
    const textLines = lines.slice(timestampLineIndex + 1);
    if (textLines.length === 0) continue;

    // Parse timestamps: "HH:MM:SS,mmm --> HH:MM:SS,mmm" or with dots
    const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/g;
    const times = [...timestampLine.matchAll(timeRegex)];

    if (times.length < 2) continue;

    const startTime = parseSRTTimestamp(times[0]);
    const endTime = parseSRTTimestamp(times[1]);

    if (isNaN(startTime) || isNaN(endTime)) continue;

    const text = textLines.join('\n');
    if (!text.trim()) continue;

    entries.push({
      id: uuidv4(),
      startTime,
      endTime,
      text,
      style: {},
    });
  }

  return entries;
}

function parseSRTTimestamp(match: RegExpMatchArray): number {
  const hours = parseInt(match[1], 10) || 0;
  const minutes = parseInt(match[2], 10) || 0;
  const seconds = parseInt(match[3], 10) || 0;
  const milliseconds = parseInt(match[4], 10) || 0;
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

// ============================================================
// Helpers — Clip Builder
// ============================================================

function createClip(
  mediaId: string,
  trackIndex: number,
  startTime: number,
  duration: number,
  label?: string,
): TimelineClip {
  return {
    id: uuidv4(),
    mediaId,
    trackIndex,
    startTime,
    duration,
    trimStart: 0,
    trimEnd: 0,
    label,
    color: getRandomColor(),
    effects: { ...DEFAULT_EFFECTS },
    colorGrading: {
      lift: { ...DEFAULT_COLOR_GRADING.lift },
      gamma: { ...DEFAULT_COLOR_GRADING.gamma },
      gain: { ...DEFAULT_COLOR_GRADING.gain },
      temperature: DEFAULT_COLOR_GRADING.temperature,
      tint: DEFAULT_COLOR_GRADING.tint,
    },
    transition: { ...DEFAULT_TRANSITION },
  };
}

// ============================================================
// Store
// ============================================================

const DEFAULT_ZOOM = 50; // pixels per second

export const useEditorStore = create<EditorState>((set, get) => ({
  // ============================================================
  // Initial State
  // ============================================================

  mediaFiles: [],
  tracks: [
    {
      id: uuidv4(),
      name: 'Video 1',
      type: 'video',
      clips: [],
      height: 64,
      muted: false,
      locked: false,
      visible: true,
    },
    {
      id: uuidv4(),
      name: 'Video 2',
      type: 'video',
      clips: [],
      height: 64,
      muted: false,
      locked: false,
      visible: true,
    },
    {
      id: uuidv4(),
      name: 'Audio 1',
      type: 'audio',
      clips: [],
      height: 48,
      muted: false,
      locked: false,
      visible: true,
    },
  ],
  currentTime: 0,
  totalDuration: 60,
  isPlaying: false,
  zoom: DEFAULT_ZOOM,
  scrollX: 0,
  selectedClipIds: [],
  snapping: true,
  snapThreshold: 0.1,
  waveformData: new Map<string, number[]>(),
  waveformCache: new Map<string, number[]>(),
  playbackSpeed: 1,
  snapIndicators: [],
  activeTool: 'select',
  isDragging: false,
  isExporting: false,
  exportProgress: 0,
  history: [],
  historyIndex: -1,
  maxHistory: 50,

  // New state fields
  textOverlays: [],
  subtitles: [],

  // ============================================================
  // Media Actions
  // ============================================================

  addMediaFile: async (file: File) => {
    const { mediaFiles, waveformData } = get();
    const id = uuidv4();
    const url = URL.createObjectURL(file);

    const info = await getMediaInfo(file);
    const thumbnailUrl = await generateThumbnail(file);

    // Generate waveform data for audio/video files
    const waveform = await generateWaveform(file);
    const newWaveformData = new Map(waveformData);
    newWaveformData.set(id, waveform);
    const newWaveformCache = new Map(get().waveformCache);
    newWaveformCache.set(id, waveform);

    const mediaFile: MediaFile = {
      id,
      name: file.name,
      file,
      url,
      duration: info.duration,
      thumbnailUrl,
      width: info.width,
      height: info.height,
      type: info.type,
    };

    set({ mediaFiles: [...mediaFiles, mediaFile], waveformData: newWaveformData, waveformCache: newWaveformCache });
    return mediaFile;
  },

  addMediaFiles: async (files: File[]) => {
    for (const file of files) {
      await get().addMediaFile(file);
    }
  },

  removeMediaFile: (id: string) => {
    const { mediaFiles, waveformData, waveformCache } = get();
    const file = mediaFiles.find((f) => f.id === id);
    if (file) URL.revokeObjectURL(file.url);

    // Clean up waveform data and cache
    const newWaveformData = new Map(waveformData);
    newWaveformData.delete(id);
    const newWaveformCache = new Map(waveformCache);
    newWaveformCache.delete(id);

    set({
      mediaFiles: mediaFiles.filter((f) => f.id !== id),
      waveformData: newWaveformData,
      waveformCache: newWaveformCache,
    });
  },

  getMediaFile: (id: string) => {
    return get().mediaFiles.find((f) => f.id === id);
  },

  // ============================================================
  // Track Actions
  // ============================================================

  addTrack: (type: 'video' | 'audio', name?: string) => {
    const { tracks } = get();
    const count = tracks.filter((t) => t.type === type).length + 1;
    const newTrack: TimelineTrack = {
      id: uuidv4(),
      name: name || `${type === 'video' ? 'Video' : 'Audio'} ${count}`,
      type,
      clips: [],
      height: type === 'video' ? 64 : 48,
      muted: false,
      locked: false,
      visible: true,
    };
    // Insert before first track of different type
    const insertIndex = tracks.findIndex((t) => t.type !== type);
    const newTracks = [...tracks];
    if (insertIndex === -1) {
      newTracks.push(newTrack);
    } else {
      newTracks.splice(insertIndex, 0, newTrack);
    }
    set({ tracks: newTracks });
  },

  removeTrack: (trackId: string) => {
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== trackId) }));
  },

  toggleTrackMute: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t
      ),
    }));
  },

  toggleTrackLock: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, locked: !t.locked } : t
      ),
    }));
  },

  toggleTrackVisibility: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, visible: !t.visible } : t
      ),
    }));
  },

  moveTrack: (fromIndex: number, toIndex: number) => {
    const { tracks } = get();
    if (fromIndex < 0 || fromIndex >= tracks.length) return;
    if (toIndex < 0 || toIndex >= tracks.length) return;
    if (fromIndex === toIndex) return;

    const newTracks = [...tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);

    // Update trackIndex on all clips to reflect new positions
    const updatedTracks = newTracks.map((track, index) => ({
      ...track,
      clips: track.clips.map((clip) => ({ ...clip, trackIndex: index })),
    }));

    set({ tracks: updatedTracks });
  },

  // ============================================================
  // Clip Actions
  // ============================================================

  addClipToTrack: (mediaId: string, trackIndex: number, startTime?: number) => {
    const { tracks, mediaFiles } = get();
    const media = mediaFiles.find((f) => f.id === mediaId);
    if (!media) return;

    const track = tracks[trackIndex];
    if (!track || track.locked) return;

    // Find a good start time (end of last clip on track or specified time)
    let clipStartTime = startTime ?? 0;
    if (startTime === undefined) {
      const lastClip = track.clips[track.clips.length - 1];
      if (lastClip) {
        clipStartTime = lastClip.startTime + lastClip.duration;
      }
    }

    // Snap to other clips
    clipStartTime = get().snapTime(clipStartTime);

    const newClip = createClip(
      mediaId,
      trackIndex,
      clipStartTime,
      media.duration === 0 ? 5 : media.duration,
      media.name.replace(/\.[^.]+$/, ''),
    );

    get().pushHistory('Add clip');

    set((state) => ({
      tracks: state.tracks.map((t, i) =>
        i === trackIndex ? { ...t, clips: [...t.clips, newClip] } : t
      ),
    }));

    get().recalculateDuration();
  },

  removeClip: (clipId: string) => {
    get().pushHistory('Remove clip');
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      })),
      selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
    }));
    get().recalculateDuration();
  },

  removeClips: (clipIds: string[]) => {
    get().pushHistory('Remove clips');
    const ids = new Set(clipIds);
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => !ids.has(c.id)),
      })),
      selectedClipIds: [],
    }));
    get().recalculateDuration();
  },

  moveClip: (clipId: string, newTrackIndex: number, newStartTime: number) => {
    const { tracks } = get();
    const oldTrackIndex = tracks.findIndex((t) =>
      t.clips.some((c) => c.id === clipId)
    );
    if (oldTrackIndex === -1) return;

    const oldTrack = tracks[oldTrackIndex];
    const clip = oldTrack.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const newTrack = tracks[newTrackIndex];
    if (!newTrack || newTrack.locked) return;

    // Snap
    newStartTime = get().snapTime(newStartTime);
    newStartTime = Math.max(0, newStartTime);

    // Remove from old track, add to new
    const updatedTracks = tracks.map((t, i) => {
      if (i === oldTrackIndex) {
        return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
      }
      if (i === newTrackIndex) {
        return {
          ...t,
          clips: [
            ...t.clips,
            { ...clip, trackIndex: newTrackIndex, startTime: newStartTime },
          ],
        };
      }
      return t;
    });

    set({ tracks: updatedTracks });
  },

  splitClip: (clipId: string, splitTime: number) => {
    const { tracks } = get();
    let found = false;

    const updatedTracks = tracks.map((t) => {
      if (found) return t;
      const clipIndex = t.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return t;
      if (t.locked) return t;

      const clip = t.clips[clipIndex];
      const clipEndTime = clip.startTime + clip.duration;
      const clipSourceStart = clip.trimStart;
      const clipSourceEnd = clip.duration + clip.trimStart - clip.trimEnd;

      // splitTime must be within this clip
      if (splitTime <= clip.startTime || splitTime >= clipEndTime) return t;

      const splitOffset = splitTime - clip.startTime;
      const sourceSplitPoint = clipSourceStart + splitOffset;

      const firstHalf: TimelineClip = {
        ...clip,
        duration: splitOffset,
      };

      const secondHalf: TimelineClip = {
        ...clip,
        id: uuidv4(),
        startTime: splitTime,
        duration: clip.duration - splitOffset,
        trimStart: sourceSplitPoint,
        // Deep clone nested objects for the second half
        effects: { ...clip.effects },
        colorGrading: {
          lift: { ...clip.colorGrading.lift },
          gamma: { ...clip.colorGrading.gamma },
          gain: { ...clip.colorGrading.gain },
          temperature: clip.colorGrading.temperature,
          tint: clip.colorGrading.tint,
        },
        transition: { ...clip.transition },
      };

      found = true;
      get().pushHistory('Split clip');

      const newClips = [...t.clips];
      newClips.splice(clipIndex, 1, firstHalf, secondHalf);
      return { ...t, clips: newClips };
    });

    set({ tracks: updatedTracks });
  },

  trimClipLeft: (clipId: string, deltaTime: number) => {
    set((state) => {
      const updatedTracks = state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          if (t.locked) return c;

          const newTrimStart = Math.max(0, c.trimStart + deltaTime);
          const actualDelta = newTrimStart - c.trimStart;
          const newStartTime = c.startTime + actualDelta;
          const newDuration = c.duration - actualDelta;

          if (newDuration <= 0.05) return c;

          return {
            ...c,
            trimStart: newTrimStart,
            startTime: Math.max(0, newStartTime),
            duration: newDuration,
          };
        }),
      }));
      return { tracks: updatedTracks };
    });
    get().recalculateDuration();
  },

  trimClipRight: (clipId: string, deltaTime: number) => {
    const { mediaFiles } = get();
    set((state) => {
      const updatedTracks = state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          if (t.locked) return c;

          const media = mediaFiles.find((m) => m.id === c.mediaId);
          const maxTrimEnd = media ? media.duration - (c.trimStart + c.duration) : 0;
          const newTrimEnd = Math.max(0, Math.min(maxTrimEnd, c.trimEnd + deltaTime));
          const actualDelta = newTrimEnd - c.trimEnd;
          const newDuration = c.duration - actualDelta;

          if (newDuration <= 0.05) return c;

          return { ...c, trimEnd: newTrimEnd, duration: newDuration };
        }),
      }));
      return { tracks: updatedTracks };
    });
    get().recalculateDuration();
  },

  duplicateClip: (clipId: string) => {
    const { tracks } = get();
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        const newClip: TimelineClip = {
          ...clip,
          id: uuidv4(),
          startTime: clip.startTime + clip.duration + 0.1,
          color: getRandomColor(),
          // Deep clone nested objects
          effects: { ...clip.effects },
          colorGrading: {
            lift: { ...clip.colorGrading.lift },
            gamma: { ...clip.colorGrading.gamma },
            gain: { ...clip.colorGrading.gain },
            temperature: clip.colorGrading.temperature,
            tint: clip.colorGrading.tint,
          },
          transition: { ...clip.transition },
        };
        get().pushHistory('Duplicate clip');
        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === track.id ? { ...t, clips: [...t.clips, newClip] } : t
          ),
        }));
        get().recalculateDuration();
        return;
      }
    }
  },

  selectClip: (clipId: string, multi = false) => {
    set((state) => {
      if (multi) {
        const ids = state.selectedClipIds.includes(clipId)
          ? state.selectedClipIds.filter((id) => id !== clipId)
          : [...state.selectedClipIds, clipId];
        return { selectedClipIds: ids };
      }
      return { selectedClipIds: [clipId] };
    });
  },

  deselectAll: () => set({ selectedClipIds: [] }),

  getSelectedClips: () => {
    const { tracks, selectedClipIds } = get();
    const clips: TimelineClip[] = [];
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (selectedClipIds.includes(clip.id)) {
          clips.push(clip);
        }
      }
    }
    return clips;
  },

  rippleDelete: (clipId: string) => {
    const { tracks } = get();
    let deletedDuration = 0;
    let targetTrackId = '';

    // Find the clip to delete and its track
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        deletedDuration = clip.duration;
        targetTrackId = track.id;
        break;
      }
    }

    if (!deletedDuration || !targetTrackId) return;

    get().pushHistory('Ripple delete');

    set((state) => ({
      tracks: state.tracks.map((t) => {
        // Remove the clip from its track
        if (t.id === targetTrackId) {
          const clipToRemove = t.clips.find((c) => c.id === clipId);
          if (!clipToRemove) return t;

          const removedStart = clipToRemove.startTime;
          const removedDuration = clipToRemove.duration;

          return {
            ...t,
            clips: t.clips
              .filter((c) => c.id !== clipId)
              .map((c) => {
                // Shift all clips that start after the deleted clip left by its duration
                if (c.startTime >= removedStart + removedDuration) {
                  return { ...c, startTime: c.startTime - removedDuration };
                }
                return c;
              }),
          };
        }
        return t;
      }),
      selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
    }));

    get().recalculateDuration();
  },

  getClipProperties: (clipId: string) => {
    const { tracks, mediaFiles } = get();

    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        const media = mediaFiles.find((m) => m.id === clip.mediaId);
        return {
          clip,
          media,
          trackId: track.id,
          trackName: track.name,
        };
      }
    }

    return null;
  },

  // ============================================================
  // Effects & Color Grading Actions
  // ============================================================

  updateClipEffects: (clipId: string, effects: Partial<ClipEffects>) => {
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          return {
            ...c,
            effects: { ...c.effects, ...effects },
          };
        }),
      })),
    }));
  },

  updateClipColorGrading: (clipId: string, grading: Partial<ColorGrading>) => {
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;

          const newGrading = { ...c.colorGrading };

          if (grading.lift) {
            newGrading.lift = { ...newGrading.lift, ...grading.lift };
          }
          if (grading.gamma) {
            newGrading.gamma = { ...newGrading.gamma, ...grading.gamma };
          }
          if (grading.gain) {
            newGrading.gain = { ...newGrading.gain, ...grading.gain };
          }
          if (grading.temperature !== undefined) {
            newGrading.temperature = grading.temperature;
          }
          if (grading.tint !== undefined) {
            newGrading.tint = grading.tint;
          }

          return { ...c, colorGrading: newGrading };
        }),
      })),
    }));
  },

  updateClipTransition: (clipId: string, transition: Partial<ClipTransition>) => {
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          return {
            ...c,
            transition: { ...c.transition, ...transition },
          };
        }),
      })),
    }));
  },

  updateClipSpeed: (clipId: string, speed: number) => {
    // Clamp speed to valid range
    const clampedSpeed = Math.max(0.25, Math.min(4, speed));
    get().updateClipEffects(clipId, { speed: clampedSpeed });
  },

  resetClipEffects: (clipId: string) => {
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          return {
            ...c,
            effects: { ...DEFAULT_EFFECTS },
            colorGrading: {
              lift: { ...DEFAULT_COLOR_GRADING.lift },
              gamma: { ...DEFAULT_COLOR_GRADING.gamma },
              gain: { ...DEFAULT_COLOR_GRADING.gain },
              temperature: DEFAULT_COLOR_GRADING.temperature,
              tint: DEFAULT_COLOR_GRADING.tint,
            },
            transition: { ...DEFAULT_TRANSITION },
          };
        }),
      })),
    }));
  },

  // ============================================================
  // Text Overlay Actions
  // ============================================================

  addTextOverlay: (overlay: Omit<TextOverlay, 'id'>) => {
    const id = uuidv4();
    const newOverlay: TextOverlay = { ...overlay, id };
    set((state) => ({
      textOverlays: [...state.textOverlays, newOverlay],
    }));
    return id;
  },

  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => {
    set((state) => ({
      textOverlays: state.textOverlays.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    }));
  },

  removeTextOverlay: (id: string) => {
    set((state) => ({
      textOverlays: state.textOverlays.filter((o) => o.id !== id),
    }));
  },

  getTextOverlaysAtTime: (time: number) => {
    const { textOverlays } = get();
    return textOverlays.filter(
      (o) => time >= o.startTime && time < o.startTime + o.duration
    );
  },

  // ============================================================
  // Subtitle Actions
  // ============================================================

  importSubtitles: (srtContent: string) => {
    const parsed = parseSRT(srtContent);
    set((state) => ({
      subtitles: [...state.subtitles, ...parsed],
    }));
    return parsed;
  },

  addSubtitle: (entry: Omit<SubtitleEntry, 'id'>) => {
    const id = uuidv4();
    const newEntry: SubtitleEntry = { ...entry, id };
    set((state) => ({
      subtitles: [...state.subtitles, newEntry],
    }));
    return id;
  },

  removeSubtitle: (id: string) => {
    set((state) => ({
      subtitles: state.subtitles.filter((s) => s.id !== id),
    }));
  },

  // ============================================================
  // Playback Actions
  // ============================================================

  setCurrentTime: (time: number) => {
    set({ currentTime: Math.max(0, time) });
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),

  setPlaybackSpeed: (speed: number) => {
    // Only allow supported playback speeds
    const closest = SUPPORTED_PLAYBACK_SPEEDS.reduce((prev, curr) =>
      Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev
    );
    set({ playbackSpeed: closest });
  },

  // ============================================================
  // Timeline Actions
  // ============================================================

  setZoom: (zoom: number) => {
    set({ zoom: Math.max(5, Math.min(500, zoom)) });
  },

  zoomIn: () => set((state) => ({ zoom: Math.min(500, state.zoom * 1.3) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(5, state.zoom / 1.3) })),

  fitZoomToContent: () => {
    const { totalDuration } = get();
    // Assume timeline width is about 1200px
    const timelineWidth = 1200;
    const newZoom = Math.max(5, Math.min(500, timelineWidth / totalDuration));
    set({ zoom: newZoom, scrollX: 0 });
  },

  setScrollX: (scrollX: number) => {
    set({ scrollX: Math.max(0, scrollX) });
  },

  // ============================================================
  // History Actions
  // ============================================================

  pushHistory: (description = 'Edit') => {
    const { tracks, history, historyIndex, maxHistory } = get();
    // Deep clone tracks
    const snapshot: TimelineTrack[] = JSON.parse(JSON.stringify(tracks));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ tracks: snapshot, description });
    if (newHistory.length > maxHistory) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = JSON.parse(JSON.stringify(history[newIndex].tracks));
    set({ tracks: snapshot, historyIndex: newIndex });
    get().recalculateDuration();
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = JSON.parse(JSON.stringify(history[newIndex].tracks));
    set({ tracks: snapshot, historyIndex: newIndex });
    get().recalculateDuration();
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ============================================================
  // Export Actions
  // ============================================================

  setIsExporting: (exporting: boolean) => set({ isExporting: exporting }),
  setExportProgress: (progress: number) => set({ exportProgress: progress }),

  // ============================================================
  // Utility
  // ============================================================

  getActiveVideoAtTime: (time: number) => {
    const { tracks } = get();
    for (const track of tracks) {
      // For video tracks: only skip if not visible (muted only affects audio, not display)
      // For audio tracks: skip entirely (audio clips don't show in video preview)
      if (track.type !== 'video' || !track.visible) continue;
      for (let i = track.clips.length - 1; i >= 0; i--) {
        const clip = track.clips[i];
        if (time >= clip.startTime && time < clip.startTime + clip.duration) {
          return clip;
        }
      }
    }
    return null;
  },

  recalculateDuration: () => {
    const { tracks } = get();
    let maxEnd = 60;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxEnd) maxEnd = clipEnd;
      }
    }
    set({ totalDuration: maxEnd + 10 });
  },

  snapTime: (time: number) => {
    const { tracks, snapping, snapThreshold, currentTime } = get();
    if (!snapping) {
      set({ snapIndicators: [] });
      return time;
    }

    let bestMatch = time;
    let minDelta = snapThreshold;
    const indicators: { time: number; trackId: string }[] = [];

    // Snap to playhead
    const playheadDelta = Math.abs(time - currentTime);
    if (playheadDelta < minDelta) {
      bestMatch = currentTime;
      minDelta = playheadDelta;
    }

    // Snap to clip edges
    for (const track of tracks) {
      for (const clip of track.clips) {
        const startDelta = Math.abs(time - clip.startTime);
        if (startDelta < minDelta) {
          bestMatch = clip.startTime;
          minDelta = startDelta;
          indicators.length = 0;
          indicators.push({ time: clip.startTime, trackId: track.id });
        } else if (startDelta < snapThreshold && Math.abs(startDelta - minDelta) < 0.001) {
          indicators.push({ time: clip.startTime, trackId: track.id });
        }

        const clipEnd = clip.startTime + clip.duration;
        const endDelta = Math.abs(time - clipEnd);
        if (endDelta < minDelta) {
          bestMatch = clipEnd;
          minDelta = endDelta;
          indicators.length = 0;
          indicators.push({ time: clipEnd, trackId: track.id });
        } else if (endDelta < snapThreshold && Math.abs(endDelta - minDelta) < 0.001) {
          indicators.push({ time: clipEnd, trackId: track.id });
        }
      }
    }

    set({ snapIndicators: indicators });
    return bestMatch;
  },

  getWaveformData: (mediaId: string) => {
    const { waveformCache, waveformData } = get();
    // Check cache first, then fall back to waveformData
    if (waveformCache.has(mediaId)) {
      return waveformCache.get(mediaId)!;
    }
    if (waveformData.has(mediaId)) {
      return waveformData.get(mediaId)!;
    }
    return null;
  },
}));

// Export supported playback speeds for use in components
export { SUPPORTED_PLAYBACK_SPEEDS };
