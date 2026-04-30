'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEditorStore, SUPPORTED_PLAYBACK_SPEEDS } from '@/lib/editor-store';
import Toolbar from './toolbar';
import MediaBrowser from './media-browser';
import VideoPreview from './video-preview';
import Timeline from './timeline';
import PropertiesPanel from './properties-panel';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import ExportDialog from './export-dialog';

const VideoEditor: React.FC = () => {
  const store = useEditorStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [showProperties, setShowProperties] = useState(false);

  // Properties stay hidden by default on every screen; users can open them when needed.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    if (mq.matches) {
      setShowProperties(false);
    }

    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setShowProperties(false);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Listen for export event from toolbar
  useEffect(() => {
    const handler = () => setExportOpen(true);
    window.addEventListener('editor:export', handler);
    return () => window.removeEventListener('editor:export', handler);
  }, []);

  // Keyboard shortcuts - production editor standard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLSelectElement) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      switch (true) {
        // ===== Playback =====
        case key === ' ' && !ctrl:
          e.preventDefault();
          store.togglePlay();
          break;

        // J/K/L shuttle (professional editor standard)
        case key === 'j' && !ctrl:
          e.preventDefault();
          if (store.isPlaying && store.playbackSpeed > 0.25) {
            // Slow down / reverse
            const currentIdx = SUPPORTED_PLAYBACK_SPEEDS.indexOf(store.playbackSpeed);
            if (currentIdx > 0) {
              store.setPlaybackSpeed(SUPPORTED_PLAYBACK_SPEEDS[currentIdx - 1]);
            }
          } else {
            // Start playing backwards (or just pause and step back)
            store.setIsPlaying(false);
            store.setCurrentTime(Math.max(0, store.currentTime - 1 / 30));
          }
          break;

        case key === 'k' && !ctrl:
          e.preventDefault();
          store.setIsPlaying(false);
          store.setPlaybackSpeed(1);
          break;

        case key === 'l' && !ctrl:
          e.preventDefault();
          if (!store.isPlaying) {
            store.setIsPlaying(true);
            store.setPlaybackSpeed(1);
          } else {
            // Speed up
            const idx = SUPPORTED_PLAYBACK_SPEEDS.indexOf(store.playbackSpeed);
            if (idx < SUPPORTED_PLAYBACK_SPEEDS.length - 1) {
              store.setPlaybackSpeed(SUPPORTED_PLAYBACK_SPEEDS[idx + 1]);
            }
          }
          break;

        // Frame stepping
        case key === ',' && !ctrl:
          e.preventDefault();
          store.setIsPlaying(false);
          store.setCurrentTime(Math.max(0, store.currentTime - 1 / 30));
          break;

        case key === '.' && !ctrl:
          e.preventDefault();
          store.setIsPlaying(false);
          store.setCurrentTime(store.currentTime + 1 / 30);
          break;

        // ===== Navigation =====
        case key === 'home':
          e.preventDefault();
          store.setCurrentTime(0);
          store.setIsPlaying(false);
          break;

        case key === 'end':
          e.preventDefault();
          store.setCurrentTime(store.totalDuration);
          store.setIsPlaying(false);
          break;

        case key === 'arrowleft':
          e.preventDefault();
          store.setCurrentTime(Math.max(0, store.currentTime - (shift ? 1 : 1 / store.zoom)));
          break;

        case key === 'arrowright':
          e.preventDefault();
          store.setCurrentTime(store.currentTime + (shift ? 1 : 1 / store.zoom));
          break;

        case key === 'arrowup':
          e.preventDefault();
          store.setCurrentTime(Math.max(0, store.currentTime - 5));
          break;

        case key === 'arrowdown':
          e.preventDefault();
          store.setCurrentTime(store.currentTime + 5);
          break;

        // ===== In/Out Points =====
        case key === 'i' && !ctrl:
          e.preventDefault();
          // Set in point (mark current time as in point)
          // For now, just snap to nearest clip start
          {
            const clip = store.getActiveVideoAtTime(store.currentTime);
            if (clip) {
              store.setCurrentTime(clip.startTime);
            }
          }
          break;

        case key === 'o' && !ctrl:
          e.preventDefault();
          // Set out point (mark current time as out point)
          {
            const clip = store.getActiveVideoAtTime(store.currentTime);
            if (clip) {
              store.setCurrentTime(clip.startTime + clip.duration);
            }
          }
          break;

        // ===== Editing =====
        case key === 's' && !ctrl:
          e.preventDefault();
          if (store.selectedClipIds.length > 0) {
            store.splitClip(store.selectedClipIds[0], store.currentTime);
          }
          break;

        case key === 'delete' || key === 'backspace':
          e.preventDefault();
          if (store.selectedClipIds.length > 0) {
            if (shift) {
              // Shift+Delete = Ripple Delete
              store.rippleDelete(store.selectedClipIds[0]);
            } else {
              store.removeClips(store.selectedClipIds);
            }
          }
          break;

        case key === 'd' && ctrl:
          e.preventDefault();
          if (store.selectedClipIds.length > 0) {
            store.duplicateClip(store.selectedClipIds[0]);
          }
          break;

        case key === 'a' && ctrl:
          e.preventDefault();
          {
            const allIds: string[] = [];
            store.tracks.forEach((t) => t.clips.forEach((c) => allIds.push(c.id)));
            if (allIds.length > 0) {
              useEditorStore.setState({ selectedClipIds: allIds });
            }
          }
          break;

        // ===== Tools =====
        case key === 'v' && !ctrl:
          useEditorStore.setState({ activeTool: 'select' });
          break;

        case key === 'c' && !ctrl:
          useEditorStore.setState({ activeTool: 'cut' });
          break;

        case key === 'b' && !ctrl:
          // Toggle snapping
          useEditorStore.setState({ snapping: !store.snapping });
          break;

        // ===== History =====
        case key === 'z' && ctrl && !shift:
          e.preventDefault();
          store.undo();
          break;

        case key === 'z' && ctrl && shift:
          e.preventDefault();
          store.redo();
          break;

        // ===== Zoom =====
        case (key === '=' || key === '+') && ctrl:
          e.preventDefault();
          store.zoomIn();
          break;

        case key === '-' && ctrl:
          e.preventDefault();
          store.zoomOut();
          break;

        case key === '0' && ctrl && shift:
          e.preventDefault();
          store.fitZoomToContent();
          break;

        // ===== Export =====
        case key === 'e' && ctrl:
          e.preventDefault();
          setExportOpen(true);
          break;

        // ===== Speed shortcuts =====
        case key === '1' && !ctrl && !shift:
          // Check if no clip is selected to avoid conflict
          if (store.selectedClipIds.length === 0) {
            store.setPlaybackSpeed(1);
          }
          break;

        case key === '2' && !ctrl && !shift:
          if (store.selectedClipIds.length === 0) {
            store.setPlaybackSpeed(2);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  // Auto-stop playback when reaching end
  useEffect(() => {
    if (store.isPlaying && store.currentTime >= store.totalDuration - 0.1) {
      store.setIsPlaying(false);
      store.setPlaybackSpeed(1);
    }
  }, [store.currentTime, store.isPlaying, store.totalDuration]);

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 overflow-hidden relative z-0">
      {/* Top Toolbar */}
      <Toolbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Media Browser */}
        <div className="w-64 flex-shrink-0 border-r border-zinc-700/50 bg-zinc-900/50 flex">
          <MediaBrowser />
        </div>

        {/* Center - Preview + Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Preview */}
          <div className="h-[45%] min-h-[180px] flex-shrink-0">
            <VideoPreview />
          </div>

          {/* Timeline */}
          <div className="flex-1 min-h-[180px]">
            <Timeline />
          </div>
        </div>

        {/* Right Panel - Properties */}
        {showProperties && (
          <div className="w-[280px] flex-shrink-0 border-l border-zinc-700/50 bg-zinc-900/50 relative">
            {/* Toggle button - positioned at top-left corner of the panel */}
            <div className="absolute top-1 left-1 z-10">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
                      onClick={() => setShowProperties(false)}
                    >
                      <PanelRightClose className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    <p>Hide Properties Panel</p>
                    <p className="text-muted-foreground">Ctrl+P</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <PropertiesPanel />
          </div>
        )}

        {/* Collapsed properties toggle button - shown when panel is hidden */}
        {!showProperties && (
          <div className="flex-shrink-0 flex items-start pt-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
                    onClick={() => setShowProperties(true)}
                  >
                    <PanelRightOpen className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  <p>Show Properties Panel</p>
                  <p className="text-muted-foreground">Ctrl+P</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-t border-zinc-700/50 text-[10px] text-zinc-500 flex-shrink-0 h-6 select-none">
        <div className="flex items-center gap-3">
          <span>
            Tool: <span className={`capitalize font-medium ${store.activeTool === 'cut' ? 'text-red-400' : 'text-zinc-300'}`}>
              {store.activeTool}
            </span>
          </span>
          <span>Zoom: <span className="text-zinc-300">{store.zoom.toFixed(0)}px/s</span></span>
          <span>Speed: <span className={store.playbackSpeed !== 1 ? 'text-amber-400' : 'text-zinc-300'}>{store.playbackSpeed}x</span></span>
          <span>Clips: <span className="text-zinc-300">{store.tracks.reduce((s, t) => s + t.clips.length, 0)}</span></span>
          <span>Tracks: <span className="text-zinc-300">{store.tracks.length}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Time: <span className="text-emerald-400 font-mono">
              {formatStatusBarTime(store.currentTime)}
            </span>
          </span>
          <span className="hidden lg:inline text-zinc-600">
            Space: Play | J/K/L: Shuttle | ,/. : Frame | S: Split | Shift+Del: Ripple
          </span>
          <span className="hidden md:inline lg:hidden text-zinc-600">
            Space: Play | S: Split | Del: Delete
          </span>
        </div>
      </div>
    </div>
  );
};

function formatStatusBarTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export default VideoEditor;
