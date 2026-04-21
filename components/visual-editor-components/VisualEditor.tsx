'use client';

import React, {
  lazy,
  memo,
  Suspense,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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
  Loader2,
} from 'lucide-react';
import { formatStatusBarTime } from '@/lib/utils';
import useVisualEditor from './useVisualEditor';

// ─── Lazy-load heavy panels to reduce initial bundle & TTI ──────────────────
const MediaBrowser    = lazy(() => import('../video-editor/media-browser'));
const PropertiesPanel = lazy(() => import('../video-editor/properties-panel'));
const Toolbar         = lazy(() => import('../video-editor/toolbar'));
const VideoPreview    = lazy(() => import('../video-editor/video-preview'));
const Timeline        = lazy(() => import('../video-editor/timeline'));
const ExportDialog    = lazy(() => import('../video-editor/export-dialog'));

// ─── Static class strings (outside component — avoids string recreation per render) ─
const ROOT_CLS =
  'h-full w-full min-h-0 flex flex-col text-slate-100 overflow-hidden relative editor-root';

const SIDEBAR_CLS =
  'hidden lg:flex lg:w-72 xl:w-80 flex-col flex-shrink-0 border-r border-zinc-800/70 bg-zinc-900/95 shadow-[inset_-1px_0_0_rgba(148,163,184,0.04)]';

const PANEL_LABEL_CLS =
  'px-4 py-3 border-b border-zinc-800/70 bg-zinc-950/80 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 select-none';

const STATUS_BAR_CLS =
  'flex flex-col gap-2 px-4 py-2.5 bg-zinc-950/95 border-t border-zinc-800/70 text-[11px] text-zinc-400 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between';

// ─── Tiny skeleton shown while lazy chunks load ──────────────────────────────
const PanelSkeleton = memo(({ className }: { className?: string }) => (
  <div
    className={`flex items-center justify-center bg-zinc-900/60 ${className ?? 'h-full w-full'}`}
    aria-label="Loading panel…"
    role="status"
  >
    <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
  </div>
));
PanelSkeleton.displayName = 'PanelSkeleton';

// ─── Icon button with tooltip — extracted to prevent prop-drilling repetition ─
interface IconBtnProps {
  label: string;
  shortcut?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}
const IconBtn = memo(
  ({ label, shortcut, side = 'left', onClick, children, className }: IconBtnProps) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            className={`h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors ${className ?? ''}`}
            onClick={onClick}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side} className="text-xs">
          <p>{label}</p>
          {shortcut && <p className="text-muted-foreground">{shortcut}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
);
IconBtn.displayName = 'IconBtn';

// ─── Properties side panel ────────────────────────────────────────────────────
interface PropertiesPanelWrapperProps {
  onClose: () => void;
}
const PropertiesPanelWrapper = memo(({ onClose }: PropertiesPanelWrapperProps) => (
  <aside
    aria-label="Properties panel"
    className="
      w-full lg:w-[300px] flex-shrink-0 flex flex-col
      border-t border-zinc-800/60 lg:border-t-0 lg:border-l
      bg-zinc-900/95 relative
      animate-in slide-in-from-right-4 duration-200
    "
  >
    <div className="absolute top-3 right-3 z-10 lg:left-3 lg:right-auto">
      <IconBtn
        label="Hide Properties"
        shortcut="Ctrl+P"
        side="left"
        onClick={onClose}
        className="h-8 w-8"
      >
        <PanelRightClose className="w-4 h-4" />
      </IconBtn>
    </div>
    <Suspense fallback={<PanelSkeleton />}>
      <PropertiesPanel />
    </Suspense>
  </aside>
));
PropertiesPanelWrapper.displayName = 'PropertiesPanelWrapper';

// ─── Mobile media-browser overlay ────────────────────────────────────────────
interface MobileMediaOverlayProps {
  onClose: () => void;
}
const MobileMediaOverlay = memo(({ onClose }: MobileMediaOverlayProps) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Media Browser"
    className="
      absolute inset-0 z-30 bg-zinc-950/96 backdrop-blur-xl p-4
      animate-in fade-in duration-150
    "
  >
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-sm font-semibold text-slate-100">Media Browser</p>
        <p className="text-xs text-slate-500">Tap to choose clips and assets.</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close Media Browser"
        onClick={onClose}
        className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
    <div className="h-[calc(100%-3.5rem)] overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-900/95 shadow-2xl">
      <Suspense fallback={<PanelSkeleton />}>
        <MediaBrowser />
      </Suspense>
    </div>
  </div>
));
MobileMediaOverlay.displayName = 'MobileMediaOverlay';

// ─── Status bar ───────────────────────────────────────────────────────────────
interface StatusBarProps {
  activeTool: string;
  zoom: number;
  playbackSpeed: number;
  clipCount: number;
  trackCount: number;
  currentTime: number;
}
const StatusBar = memo(
  ({ activeTool, zoom, playbackSpeed, clipCount, trackCount, currentTime }: StatusBarProps) => (
    <footer className={STATUS_BAR_CLS} aria-label="Editor status bar">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <StatusItem label="Tool">
          <span
            className={`capitalize font-medium tabular-nums ${
              activeTool === 'cut' ? 'text-red-400' : 'text-slate-300'
            }`}
          >
            {activeTool}
          </span>
        </StatusItem>
        <StatusItem label="Zoom">
          <span className="text-slate-300 tabular-nums">{zoom.toFixed(0)} px/s</span>
        </StatusItem>
        <StatusItem label="Speed">
          <span className={`tabular-nums ${playbackSpeed !== 1 ? 'text-amber-400' : 'text-slate-300'}`}>
            {playbackSpeed}×
          </span>
        </StatusItem>
        <StatusItem label="Clips">
          <span className="text-slate-300 tabular-nums">{clipCount}</span>
        </StatusItem>
        <StatusItem label="Tracks">
          <span className="text-slate-300 tabular-nums">{trackCount}</span>
        </StatusItem>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <StatusItem label="Time">
          <span className="text-emerald-400 font-mono tabular-nums">
            {formatStatusBarTime(currentTime)}
          </span>
        </StatusItem>
        <span className="hidden md:inline text-zinc-600 text-[10px] tracking-wide">
          <kbd className="kbd">Space</kbd> Play ·{' '}
          <kbd className="kbd">J/K/L</kbd> Shuttle ·{' '}
          <kbd className="kbd">,/.</kbd> Frame ·{' '}
          <kbd className="kbd">S</kbd> Split ·{' '}
          <kbd className="kbd">⇧Del</kbd> Ripple Delete
        </span>
        <span className="md:hidden text-zinc-600 text-[10px]">
          Space: Play · S: Split · Del: Delete
        </span>
      </div>
    </footer>
  ),
);
StatusBar.displayName = 'StatusBar';

const StatusItem = memo(
  ({ label, children }: { label: string; children: React.ReactNode }) => (
    <span>
      <span className="text-zinc-600">{label}: </span>
      {children}
    </span>
  ),
);
StatusItem.displayName = 'StatusItem';

// ─── Main component ───────────────────────────────────────────────────────────
const VisualEditor: React.FC = () => {
  const {
    store,
    exportOpen,
    setExportOpen,
    showProperties,
    setShowProperties,
    showMediaBrowser,
    setShowMediaBrowser,
    isMobile,
  } = useVisualEditor();

  // ── Stable callbacks (no inline arrow functions in JSX) ──────────────────
  const handleOpenExport        = useCallback(() => setExportOpen(true), [setExportOpen]);
  const handleCloseExport       = useCallback(() => setExportOpen(false), [setExportOpen]);
  const handleShowProperties    = useCallback(() => setShowProperties(true), [setShowProperties]);
  const handleHideProperties    = useCallback(() => setShowProperties(false), [setShowProperties]);
  const handleToggleProperties  = useCallback(
    () => setShowProperties((v) => !v),
    [setShowProperties],
  );
  const handleOpenMediaBrowser  = useCallback(() => setShowMediaBrowser(true), [setShowMediaBrowser]);
  const handleCloseMediaBrowser = useCallback(() => setShowMediaBrowser(false), [setShowMediaBrowser]);

  // ── Memoised derived values ───────────────────────────────────────────────
  const clipCount  = useMemo(
    () => store.tracks.reduce((sum, t) => sum + t.clips.length, 0),
    [store.tracks],
  );
  const trackCount = useMemo(() => store.tracks.length, [store.tracks]);

  return (
    <div className={ROOT_CLS}>
      {/* ── Toolbar ── */}
      <Suspense fallback={<div className="h-10 bg-zinc-950/80 border-b border-zinc-800/70" />}>
        <Toolbar />
      </Suspense>

      {/* ── Main workspace ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden lg:flex-row flex-col">

        {/* ── Desktop sidebar: Media Browser ── */}
        <aside aria-label="Media Browser" className={SIDEBAR_CLS}>
          <div className={PANEL_LABEL_CLS}>Media Browser</div>
          <Suspense fallback={<PanelSkeleton />}>
            <MediaBrowser />
          </Suspense>
        </aside>

        {/* ── Centre: Preview + Timeline ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile top-bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800/70 bg-zinc-950/85 lg:hidden">
            <div>
              <p className="text-sm font-semibold text-slate-100">Visual Editor</p>
              <p className="text-[11px] text-slate-500">Responsive editing for every screen.</p>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn
                label="Open Media Browser"
                shortcut="Ctrl+M"
                side="bottom"
                onClick={handleOpenMediaBrowser}
              >
                <Folder className="w-4 h-4" />
              </IconBtn>
              <IconBtn
                label="Toggle Properties Panel"
                shortcut="Ctrl+P"
                side="bottom"
                onClick={handleToggleProperties}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </IconBtn>
            </div>
          </div>

          {/* Preview + Timeline canvases */}
          <div
            className="flex-1 overflow-hidden px-4 py-4 sm:px-5 sm:py-5 space-y-4 min-h-0"
            role="main"
            aria-label="Editor workspace"
          >
            <div className="rounded-[28px] border border-zinc-800/75 bg-zinc-950/90 shadow-[0_30px_80px_rgba(0,0,0,0.22)] overflow-hidden min-h-[260px] h-[38vh] sm:h-[42vh] lg:h-[45vh]">
              <Suspense fallback={<PanelSkeleton className="h-full w-full" />}>
                <VideoPreview />
              </Suspense>
            </div>

            <div className="rounded-[28px] border border-zinc-800/70 bg-zinc-950/85 shadow-inner overflow-hidden min-h-[220px] h-[24vh] sm:h-[26vh] lg:h-[28vh]">
              <Suspense fallback={<PanelSkeleton className="h-full w-full" />}>
                <Timeline />
              </Suspense>
            </div>
          </div>
        </div>

        {/* ── Properties panel (desktop slide-in) ── */}
        {showProperties && (
          <PropertiesPanelWrapper onClose={handleHideProperties} />
        )}

        {/* ── "Open properties" toggle button when panel is hidden (desktop) ── */}
        {!showProperties && !isMobile && (
          <div className="flex-shrink-0 flex items-start pt-1 px-2">
            <IconBtn
              label="Show Properties Panel"
              shortcut="Ctrl+P"
              side="left"
              onClick={handleShowProperties}
            >
              <PanelRightOpen className="w-4 h-4" />
            </IconBtn>
          </div>
        )}
      </div>

      {/* ── Mobile media-browser full-screen overlay ── */}
      {isMobile && showMediaBrowser && (
        <MobileMediaOverlay onClose={handleCloseMediaBrowser} />
      )}

      {/* ── Export dialog ── */}
      <Suspense fallback={null}>
        <ExportDialog open={exportOpen} onClose={handleCloseExport} />
      </Suspense>

      {/* ── Status bar ── */}
      <StatusBar
        activeTool={store.activeTool}
        zoom={store.zoom}
        playbackSpeed={store.playbackSpeed}
        clipCount={clipCount}
        trackCount={trackCount}
        currentTime={store.currentTime}
      />
    </div>
  );
};

export default memo(VisualEditor);