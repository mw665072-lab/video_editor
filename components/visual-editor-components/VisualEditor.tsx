'use client';

import React, {
  lazy,
  memo,
  Suspense,
  useCallback,
  useMemo,
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
  Sparkles,
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
const ProductionBlueprintPanel = lazy(() => import('./ProductionBlueprintPanel'));

// ─── Static class strings (outside component — avoids string recreation per render) ─
const ROOT_CLS =
  'h-full w-full min-h-0 flex flex-col text-[#f6e0c8] overflow-hidden relative editor-root';

const SIDEBAR_CLS =
  'hidden lg:flex lg:w-72 xl:w-80 flex-col flex-shrink-0 border-r border-[#2a2118] bg-[#13100c]/90 shadow-[inset_-1px_0_0_rgba(250,106,0,0.05)]';

const PANEL_LABEL_CLS =
  'px-4 py-3 border-b border-[#2a2118] bg-[#1a0e05]/85 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a6a45] select-none';

const STATUS_BAR_CLS =
  'flex flex-col gap-2 px-4 py-2.5 bg-[#0d0905]/95 border-t border-[#2a2118] text-[11px] text-[#8a6a45] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between';

// ─── Tiny skeleton shown while lazy chunks load ──────────────────────────────
const PanelSkeleton = memo(({ className }: { className?: string }) => (
  <div
    className={`flex items-center justify-center bg-[#13100c]/70 ${className ?? 'h-full w-full'}`}
    aria-label="Loading panel…"
    role="status"
  >
    <Loader2 className="w-5 h-5 text-[#fa6a00] animate-spin" />
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
            className={`h-8 w-8 rounded-xl text-[#8a6a45] hover:text-[#fa6a00] hover:bg-[#fa6a00]/10 transition-colors ${className ?? ''}`}
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
      border-t border-[#2a2118] lg:border-t-0 lg:border-l
      bg-[#13100c]/95 relative
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
      absolute inset-0 z-30 bg-[#05070C]/96 backdrop-blur-xl p-4
      animate-in fade-in duration-150
    "
  >
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-sm font-semibold text-[#f6e0c8]">Media Browser</p>
        <p className="text-xs text-[#8a6a45]">Tap to choose clips and assets.</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close Media Browser"
        onClick={onClose}
        className="h-8 w-8 rounded-xl text-[#8a6a45] hover:text-[#fa6a00] hover:bg-[#fa6a00]/10"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
    <div className="h-[calc(100%-3.5rem)] overflow-hidden rounded-3xl border border-[#2a2118] bg-[#13100c]/90 shadow-2xl">
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
              activeTool === 'cut' ? 'text-red-400' : 'text-[#c07040]'
            }`}
          >
            {activeTool}
          </span>
        </StatusItem>
        <StatusItem label="Zoom">
          <span className="text-[#c07040] tabular-nums">{zoom.toFixed(0)} px/s</span>
        </StatusItem>
        <StatusItem label="Speed">
          <span className={`tabular-nums ${playbackSpeed !== 1 ? 'text-amber-400' : 'text-[#c07040]'}`}>
            {playbackSpeed}×
          </span>
        </StatusItem>
        <StatusItem label="Clips">
          <span className="text-[#c07040] tabular-nums">{clipCount}</span>
        </StatusItem>
        <StatusItem label="Tracks">
          <span className="text-[#c07040] tabular-nums">{trackCount}</span>
        </StatusItem>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <StatusItem label="Time">
          <span className="text-[#fa6a00] font-mono tabular-nums">
            {formatStatusBarTime(currentTime)}
          </span>
        </StatusItem>
        <span className="hidden md:inline text-[#6b4e2e] text-[10px] tracking-wide">
          <kbd className="kbd">Space</kbd> Play ·{' '}
          <kbd className="kbd">J/K/L</kbd> Shuttle ·{' '}
          <kbd className="kbd">,/.</kbd> Frame ·{' '}
          <kbd className="kbd">S</kbd> Split ·{' '}
          <kbd className="kbd">⇧Del</kbd> Ripple Delete
        </span>
        <span className="md:hidden text-[#6b4e2e] text-[10px]">
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
      <span className="text-[#6b4e2e]">{label}: </span>
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
    showBlueprint,
    setShowBlueprint,
    isMobile,
  } = useVisualEditor();

  // ── Stable callbacks (no inline arrow functions in JSX) ──────────────────
  const handleCloseExport       = useCallback(() => setExportOpen(false), [setExportOpen]);
  const handleShowProperties    = useCallback(() => setShowProperties(true), [setShowProperties]);
  const handleHideProperties    = useCallback(() => setShowProperties(false), [setShowProperties]);
  const handleToggleProperties  = useCallback(
    () => setShowProperties((v) => !v),
    [setShowProperties],
  );
  const handleOpenMediaBrowser  = useCallback(() => setShowMediaBrowser(true), [setShowMediaBrowser]);
  const handleCloseMediaBrowser = useCallback(() => setShowMediaBrowser(false), [setShowMediaBrowser]);
  const handleToggleBlueprint   = useCallback(() => setShowBlueprint((v) => !v), [setShowBlueprint]);

  // ── Memoised derived values ───────────────────────────────────────────────
  const clipCount  = useMemo(
    () => store.tracks.reduce((sum, t) => sum + t.clips.length, 0),
    [store.tracks],
  );
  const trackCount = useMemo(() => store.tracks.length, [store.tracks]);

  return (
    <div className={ROOT_CLS}>
      {/* ── Toolbar ── */}
      <Suspense fallback={<div className="h-10 bg-[#0d0905]/80 border-b border-[#2a2118]" />}>
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
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#2a2118] bg-[#0d0905]/85 lg:hidden">
            <div>
              <p className="text-sm font-semibold text-[#f6e0c8]">Visual Editor</p>
              <p className="text-[11px] text-[#8a6a45]">Responsive editing for every screen.</p>
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
              <IconBtn
                label="Toggle Studio Tools"
                shortcut="Ctrl+B"
                side="bottom"
                onClick={handleToggleBlueprint}
                className={showBlueprint ? 'text-[#fa6a00] bg-[#fa6a00]/10' : ''}
              >
                <Sparkles className="w-4 h-4" />
              </IconBtn>
            </div>
          </div>

          <div className="hidden items-center justify-between border-b border-[#2a2118] bg-[#0d0905]/80 px-4 py-2 lg:flex">
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-[#8a6a45]">
              <Sparkles className="h-3.5 w-3.5 text-[#fa6a00]" />
              <span className="truncate">Clip-style tools for importing, cutting, captions, effects, and export</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1.5 rounded-md px-2 text-[11px] ${
                showBlueprint
                  ? 'bg-[#fa6a00]/10 text-[#fa6a00] hover:bg-[#fa6a00]/15 hover:text-[#ff8c38]'
                  : 'text-[#8a6a45] hover:bg-[#fa6a00]/10 hover:text-[#fa6a00]'
              }`}
              onClick={handleToggleBlueprint}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Studio Tools
            </Button>
          </div>

          {/* Preview + Timeline canvases */}
          <div
            className={`flex-1 overflow-hidden px-3 py-3 sm:px-4 sm:py-4 min-h-0 ${
              showBlueprint ? 'grid gap-3 xl:grid-cols-[minmax(320px,400px)_minmax(560px,1fr)]' : 'space-y-3'
            }`}
            role="main"
            aria-label="Editor workspace"
          >
            {showBlueprint && (
              <div className="min-h-[320px] overflow-hidden">
                <Suspense fallback={<PanelSkeleton className="h-full w-full rounded-2xl border border-[#2a2118]" />}>
                  <ProductionBlueprintPanel />
                </Suspense>
              </div>
            )}

            <div className={`min-h-0 ${showBlueprint ? 'flex flex-col gap-3 overflow-hidden' : 'space-y-3'}`}>
              <div className={`rounded-2xl border border-[#2a2118] bg-black shadow-[0_4px_32px_rgba(0,0,0,0.5)] overflow-hidden min-h-[220px] ${
                showBlueprint ? 'h-[34vh] xl:h-[38vh]' : 'h-[36vh] sm:h-[42vh] lg:h-[48vh]'
              }`}>
                <Suspense fallback={<PanelSkeleton className="h-full w-full" />}>
                  <VideoPreview />
                </Suspense>
              </div>

              <div className={`rounded-2xl border border-[#2a2118] bg-[#13100c]/80 shadow-inner overflow-hidden min-h-[220px] ${
                showBlueprint ? 'flex-1' : 'h-[25vh] sm:h-[28vh] lg:h-[30vh]'
              }`}>
              <Suspense fallback={<PanelSkeleton className="h-full w-full" />}>
                <Timeline />
              </Suspense>
              </div>
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
