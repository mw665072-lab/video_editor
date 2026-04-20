'use client';

import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Folder,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { SUPPORTED_PLAYBACK_SPEEDS } from '@/types/editor-store';
import MediaBrowser from './video-editor/media-browser';
import PropertiesPanel from './video-editor/properties-panel';
import Toolbar from './video-editor/toolbar';
import VideoPreview from './video-editor/video-preview';
import { useEditorStore } from '@/lib/editor-store';
import Timeline from './video-editor/timeline';
import ExportDialog from './video-editor/export-dialog';
import { formatStatusBarTime } from '@/lib/utils';

const VideoEditor: React.FC = () => {
  const store = useEditorStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showMediaBrowser, setShowMediaBrowser] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive: hide side panels on small screens and enable mobile toggles
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    setShowProperties(!mq.matches);
    setShowMediaBrowser(!mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
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

        case key === 'p' && ctrl:
          e.preventDefault();
          setShowProperties((value) => !value);
          break;

        case key === 'm' && ctrl:
          e.preventDefault();
          setShowMediaBrowser((value) => !value);
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
    <div className="h-full w-full min-h-0 flex flex-col bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_30%),_linear-gradient(180deg,_#020617,_#090a10)] text-slate-100 overflow-hidden relative">
      {/* Top Toolbar */}
      <Toolbar />

      <div className="flex flex-1 min-h-0 overflow-hidden lg:flex-row flex-col">
        {/* Left Panel - Media Browser */}
        <div className="hidden lg:flex lg:w-72 xl:w-80 flex-col flex-shrink-0 border-r border-zinc-800/70 bg-zinc-900/95 shadow-[inset_2px_0_0_rgba(148,163,184,0.03)]">
          <div className="px-4 py-3 border-b border-zinc-800/70 bg-zinc-950/80 text-xs uppercase tracking-[0.18em] text-slate-400">
            Media Browser
          </div>
          <MediaBrowser />
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800/70 bg-zinc-950/85 lg:hidden">
            <div>
              <p className="text-sm font-semibold text-slate-100">Visual Editor</p>
              <p className="text-[11px] text-slate-500">Responsive editing for every screen.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                title="Open media browser (Ctrl+M)"
                onClick={() => setShowMediaBrowser(true)}
              >
                <Folder className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Toggle properties panel (Ctrl+P)"
                onClick={() => setShowProperties((value) => !value)}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 py-4 sm:px-5 sm:py-5 space-y-4 min-h-0">
            <div className="rounded-[28px] border border-zinc-800/75 bg-zinc-950/90 shadow-[0_30px_80px_rgba(0,0,0,0.18)] overflow-hidden min-h-[260px] h-[38vh] sm:h-[42vh] lg:h-[45vh]">
              <VideoPreview />
            </div>

            <div className="rounded-[28px] border border-zinc-800/70 bg-zinc-950/85 shadow-inner overflow-hidden min-h-[220px] h-[24vh] sm:h-[26vh] lg:h-[28vh]">
              <Timeline />
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        {showProperties && (
          <div className="w-full lg:w-[300px] flex-shrink-0 flex flex-col h-full border-t border-zinc-800/60 lg:border-t-0 lg:border-l bg-zinc-900/95 relative">
            <div className="absolute top-3 right-3 z-10 lg:left-3 lg:right-auto">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                      onClick={() => setShowProperties(false)}
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    <p>Hide Properties</p>
                    <p className="text-muted-foreground">Ctrl+P</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <PropertiesPanel />
          </div>
        )}

        {!showProperties && !isMobile && (
          <div className="flex-shrink-0 flex items-start pt-1 px-3">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                    onClick={() => setShowProperties(true)}
                  >
                    <PanelRightOpen className="w-4 h-4" />
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

      {isMobile && showMediaBrowser && (
        <div className="absolute inset-0 z-30 bg-zinc-950/95 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">Media Browser</p>
              <p className="text-xs text-slate-500">Tap to choose clips and assets.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowMediaBrowser(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-hidden rounded-[28px] border border-zinc-800/70 bg-zinc-900/95 shadow-2xl">
            <MediaBrowser />
          </div>
        </div>
      )}

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />

      <div className="flex flex-col gap-2 px-4 py-3 bg-zinc-950/90 border-t border-zinc-800/70 text-[11px] text-zinc-300 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-200">
            Tool: <span className={`capitalize font-medium ${store.activeTool === 'cut' ? 'text-red-400' : 'text-slate-300'}`}>
              {store.activeTool}
            </span>
          </span>
          <span>Zoom: <span className="text-slate-300">{store.zoom.toFixed(0)}px/s</span></span>
          <span>Speed: <span className={store.playbackSpeed !== 1 ? 'text-amber-400' : 'text-slate-300'}>{store.playbackSpeed}x</span></span>
          <span>Clips: <span className="text-slate-300">{store.tracks.reduce((s, t) => s + t.clips.length, 0)}</span></span>
          <span>Tracks: <span className="text-slate-300">{store.tracks.length}</span></span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-400">
          <span>
            Time: <span className="text-emerald-400 font-mono">
              {formatStatusBarTime(store.currentTime)}
            </span>
          </span>
          <span className="hidden md:inline text-slate-500">
            Space: Play · J/K/L: Shuttle · ,/. : Frame · S: Split · Shift+Del: Ripple
          </span>
          <span className="md:hidden text-slate-500">
            Space: Play · S: Split · Del: Delete
          </span>
        </div>
      </div>
    </div>
  );
};



export default VideoEditor;
