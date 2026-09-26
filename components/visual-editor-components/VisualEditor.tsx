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
  'visual-editor-theme relative flex h-full min-h-[640px] w-full min-w-0 flex-col overflow-hidden text-[#18231b] editor-root sm:min-h-[680px] xl:min-h-[560px]';

const SIDEBAR_CLS =
  'hidden xl:flex xl:w-64 2xl:w-72 flex-col flex-shrink-0 border-r border-[#dce5dc] bg-[#f8fbf6]';

const PANEL_LABEL_CLS =
  'select-none border-b border-[#dce5dc] bg-[#eef5ec] px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#31533b]';

const STATUS_BAR_CLS =
  'flex flex-col gap-2 border-t border-[#dce5dc] bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2.5 text-[11px] text-[#526159] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:pb-2.5';

// ─── Tiny skeleton shown while lazy chunks load ──────────────────────────────
const PanelSkeleton = memo(({ className }: { className?: string }) => (
  <div
    className={`flex items-center justify-center bg-[#f1f6ef] ${className ?? 'h-full w-full'}`}
    aria-label="Loading panel…"
    role="status"
  >
    <Loader2 className="w-5 h-5 text-[#22a653] animate-spin" />
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
            className={`h-8 w-8 rounded-xl text-[#526159] hover:bg-[#e7f4e9] hover:text-[#15803d] transition-colors ${className ?? ''}`}
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
      absolute inset-x-2 bottom-14 top-14 z-40 flex flex-col overflow-hidden rounded-2xl
      border border-[#dce5dc] bg-white/95 shadow-2xl backdrop-blur-xl
      animate-in slide-in-from-right-4 duration-200
      md:left-auto md:w-[340px]
      xl:static xl:z-auto xl:w-[300px] xl:flex-shrink-0 xl:rounded-none xl:border-y-0 xl:border-r-0 xl:border-l xl:shadow-none
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
      absolute inset-0 z-30 bg-[#eef5ec]/96 p-2 backdrop-blur-xl sm:p-4
      animate-in fade-in duration-150
    "
  >
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-sm font-semibold text-[#18231b]">Media Browser</p>
        <p className="text-xs text-[#667069]">Tap to choose clips and assets.</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close Media Browser"
        onClick={onClose}
        className="h-8 w-8 rounded-xl text-[#526159] hover:bg-[#e7f4e9] hover:text-[#15803d]"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
    <div className="h-[calc(100%-3.5rem)] overflow-hidden rounded-2xl border border-[#dce5dc] bg-white shadow-2xl sm:rounded-3xl">
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
              activeTool === 'cut' ? 'text-red-300' : 'text-[#e2e8f0]'
            }`}
          >
            {activeTool}
          </span>
        </StatusItem>
        <StatusItem label="Zoom">
          <span className="text-[#e2e8f0] tabular-nums">{zoom.toFixed(0)} px/s</span>
        </StatusItem>
        <StatusItem label="Speed">
          <span className={`tabular-nums ${playbackSpeed !== 1 ? 'text-[#22a653]' : 'text-[#e2e8f0]'}`}>
            {playbackSpeed}×
          </span>
        </StatusItem>
        <StatusItem label="Clips">
          <span className="text-[#e2e8f0] tabular-nums">{clipCount}</span>
        </StatusItem>
        <StatusItem label="Tracks">
          <span className="text-[#e2e8f0] tabular-nums">{trackCount}</span>
        </StatusItem>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <StatusItem label="Time">
          <span className="font-mono tabular-nums text-[#dcfce7]">
            {formatStatusBarTime(currentTime)}
          </span>
        </StatusItem>
        <span className="hidden md:inline text-[#94a3b8] text-[10px] tracking-wide">
          <kbd className="kbd">Space</kbd> Play ·{' '}
          <kbd className="kbd">J/K/L</kbd> Shuttle ·{' '}
          <kbd className="kbd">,/.</kbd> Frame ·{' '}
          <kbd className="kbd">S</kbd> Split ·{' '}
          <kbd className="kbd">⇧Del</kbd> Ripple Delete
        </span>
        <span className="md:hidden text-[#94a3b8] text-[10px]">
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
      <span className="text-[#94a3b8]">{label}: </span>
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
      <Suspense fallback={<div className="h-10 border-b border-[#dce5dc] bg-white" />}>
        <Toolbar />
      </Suspense>

      {/* ── Main workspace ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">

        {/* ── Desktop sidebar: Media Browser ── */}
        <aside aria-label="Media Browser" className={SIDEBAR_CLS}>
          <div className={PANEL_LABEL_CLS}>Media Browser</div>
          <Suspense fallback={<PanelSkeleton />}>
            <MediaBrowser />
          </Suspense>
        </aside>

        {/* ── Centre: Preview + Timeline ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Compact top-bar for mobile, tablet, and laptop widths */}
          <div className="flex items-center justify-between gap-2 border-b border-[#dce5dc] bg-white px-2 py-2 sm:px-4 sm:py-3 xl:hidden">
            <div>
              <p className="text-xs font-semibold text-[#18231b] sm:text-sm">Visual Editor</p>
              <p className="hidden text-[11px] text-[#667069] sm:block">Responsive editing for every screen.</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
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
                className={showBlueprint ? 'bg-[#22a653] text-[#18231b] hover:bg-[#dcfce7] hover:text-[#18231b]' : ''}
              >
                <Sparkles className="w-4 h-4" />
              </IconBtn>
            </div>
          </div>

          <div className="hidden items-center justify-between border-b border-[#dce5dc] bg-[#f1f6ef] px-4 py-2 xl:flex">
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-[#526159]">
              <Sparkles className="h-3.5 w-3.5 text-[#15803d]" />
              <span className="truncate">Clip-style tools for importing, cutting, captions, effects, and export</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1.5 rounded-md px-2 text-[11px] ${
                showBlueprint
                  ? 'bg-[#22a653] text-[#18231b] hover:bg-[#dcfce7] hover:text-[#18231b]'
                  : 'text-white/80 hover:bg-white/10 hover:text-[#dcfce7]'
              }`}
              onClick={handleToggleBlueprint}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Studio Tools
            </Button>
          </div>

          {/* Preview + Timeline canvases */}
          <div
            className={`min-h-0 flex-1 overflow-hidden p-2 pb-4 sm:p-3 ${
              showBlueprint
                ? 'grid grid-rows-[minmax(150px,0.55fr)_minmax(260px,1.45fr)] gap-2 sm:grid-rows-[minmax(180px,0.7fr)_minmax(320px,1.3fr)] sm:gap-3 min-[1500px]:grid-cols-[minmax(280px,360px)_minmax(520px,1fr)] min-[1500px]:grid-rows-none'
                : 'flex flex-col gap-2 sm:gap-3'
            }`}
            role="main"
            aria-label="Editor workspace"
          >
            {showBlueprint && (
              <div className="min-h-0 overflow-hidden rounded-2xl">
                <Suspense fallback={<PanelSkeleton className="h-full w-full rounded-2xl border border-white/10" />}>
                  <ProductionBlueprintPanel />
                </Suspense>
              </div>
            )}

            <div className={`min-h-0 ${showBlueprint ? 'flex flex-col gap-2 overflow-hidden sm:gap-3' : 'flex flex-1 flex-col gap-2 sm:gap-3'}`}>
              <div className={`overflow-hidden rounded-2xl border border-[#cfdccf] bg-black shadow-[0_18px_46px_rgba(31,52,36,0.14)] ${
                showBlueprint ? 'h-[min(30svh,290px)] min-h-[160px] sm:h-[min(34svh,320px)] sm:min-h-[170px] min-[1500px]:h-[42vh]' : 'h-[min(42svh,460px)] min-h-[200px] flex-none sm:h-[min(48svh,520px)] sm:min-h-[220px] lg:h-[52vh]'
              }`}>
                <Suspense fallback={<PanelSkeleton className="h-full w-full" />}>
                  <VideoPreview />
                </Suspense>
              </div>

              <div className={`overflow-hidden rounded-2xl border border-[#dce5dc] bg-white shadow-inner ${
                showBlueprint ? 'min-h-[250px] flex-1 sm:min-h-[220px]' : 'min-h-[260px] flex-1 sm:min-h-[220px]'
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
          <div className="hidden flex-shrink-0 items-start px-2 pt-1 xl:flex">
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
