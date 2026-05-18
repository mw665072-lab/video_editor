'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorState } from '@/lib/editor-store';
import { SUPPORTED_PLAYBACK_SPEEDS } from '@/types/editor-store';
import { useEditorStore } from '@/lib/editor-store';

// ─── Constants ────────────────────────────────────────────────────────────────

/** px of playhead position tolerance before auto-stopping playback */
const PLAYBACK_END_TOLERANCE = 0.1;

/** Input element types that should suppress global hotkeys */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseVisualEditorReturn {
  store: EditorState;
  exportOpen: boolean;
  setExportOpen: Dispatch<SetStateAction<boolean>>;
  showProperties: boolean;
  setShowProperties: Dispatch<SetStateAction<boolean>>;
  showMediaBrowser: boolean;
  setShowMediaBrowser: Dispatch<SetStateAction<boolean>>;
  showBlueprint: boolean;
  setShowBlueprint: Dispatch<SetStateAction<boolean>>;
  isMobile: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useVisualEditor = (): UseVisualEditorReturn => {
  const store = useEditorStore();

  /**
   * We keep a ref to the latest store so the keydown handler — which is
   * registered once and never torn down — always reads current state without
   * needing to be re-registered on every store change.
   */
  const storeRef = useRef<EditorState>(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [exportOpen,       setExportOpen]       = useState(false);
  const [showProperties,   setShowProperties]   = useState(false);
  const [showMediaBrowser, setShowMediaBrowser] = useState(true);
  const [showBlueprint,    setShowBlueprint]    = useState(false);
  const [isMobile,         setIsMobile]         = useState(false);

  // ── 1. Responsive breakpoint detection ───────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');

    const apply = (matches: boolean) => {
      setIsMobile(matches);
      // Below the full workstation layout, panels become overlays to maximise canvas space.
      if (matches) {
        setShowProperties(false);
        setShowMediaBrowser(false);
        setShowBlueprint(false);
      }
    };

    // Run immediately (avoids a flash of wrong layout on first paint)
    apply(mq.matches);

    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── 2. External export event (e.g. from Toolbar "Export" button) ─────────
  useEffect(() => {
    const handler = () => setExportOpen(true);
    window.addEventListener('editor:export', handler);
    return () => window.removeEventListener('editor:export', handler);
  }, []);

  // ── 3. Auto-stop at end of timeline ──────────────────────────────────────
  useEffect(() => {
    const { isPlaying, currentTime, totalDuration, setIsPlaying, setPlaybackSpeed } = store;
    if (isPlaying && currentTime >= totalDuration - PLAYBACK_END_TOLERANCE) {
      setIsPlaying(false);
      setPlaybackSpeed(1);
    }
    // Only re-run when the values that matter change — NOT the whole store object
  }, [store.isPlaying, store.currentTime, store.totalDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Shuttle helpers (stable — no deps on store) ───────────────────────
  const shuttleBack = useCallback(() => {
    const s = storeRef.current;
    if (s.isPlaying && s.playbackSpeed > 0.25) {
      const idx = SUPPORTED_PLAYBACK_SPEEDS.indexOf(s.playbackSpeed);
      if (idx > 0) s.setPlaybackSpeed(SUPPORTED_PLAYBACK_SPEEDS[idx - 1]);
    } else {
      s.setIsPlaying(false);
      s.setCurrentTime(Math.max(0, s.currentTime - 1 / 30));
    }
  }, []);

  const shuttleForward = useCallback(() => {
    const s = storeRef.current;
    if (!s.isPlaying) {
      s.setIsPlaying(true);
      s.setPlaybackSpeed(1);
    } else {
      const idx = SUPPORTED_PLAYBACK_SPEEDS.indexOf(s.playbackSpeed);
      if (idx < SUPPORTED_PLAYBACK_SPEEDS.length - 1) {
        s.setPlaybackSpeed(SUPPORTED_PLAYBACK_SPEEDS[idx + 1]);
      }
    }
  }, []);

  // ── 5. Global keyboard handler ────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never hijack shortcuts while the user is typing
      if (INPUT_TAGS.has((e.target as HTMLElement)?.tagName)) return;

      const key   = e.key.toLowerCase();
      const ctrl  = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const s     = storeRef.current;

      // ── Playback ────────────────────────────────────────────────────────
      if (key === ' ' && !ctrl) {
        e.preventDefault();
        s.togglePlay();
        return;
      }

      if (key === 'j' && !ctrl) { e.preventDefault(); shuttleBack();    return; }
      if (key === 'l' && !ctrl) { e.preventDefault(); shuttleForward(); return; }

      if (key === 'k' && !ctrl) {
        e.preventDefault();
        s.setIsPlaying(false);
        s.setPlaybackSpeed(1);
        return;
      }

      // ── Frame step ──────────────────────────────────────────────────────
      if (key === ',' && !ctrl) {
        e.preventDefault();
        s.setIsPlaying(false);
        s.setCurrentTime(Math.max(0, s.currentTime - 1 / 30));
        return;
      }

      if (key === '.' && !ctrl) {
        e.preventDefault();
        s.setIsPlaying(false);
        s.setCurrentTime(s.currentTime + 1 / 30);
        return;
      }

      // ── Timeline navigation ─────────────────────────────────────────────
      if (key === 'home') {
        e.preventDefault();
        s.setCurrentTime(0);
        s.setIsPlaying(false);
        return;
      }

      if (key === 'end') {
        e.preventDefault();
        s.setCurrentTime(s.totalDuration);
        s.setIsPlaying(false);
        return;
      }

      if (key === 'arrowleft' && !ctrl) {
        e.preventDefault();
        s.setCurrentTime(Math.max(0, s.currentTime - (shift ? 1 : 1 / s.zoom)));
        return;
      }

      if (key === 'arrowright' && !ctrl) {
        e.preventDefault();
        s.setCurrentTime(s.currentTime + (shift ? 1 : 1 / s.zoom));
        return;
      }

      // Arrow up/down = jump 5 seconds
      if (key === 'arrowup') {
        e.preventDefault();
        s.setCurrentTime(Math.max(0, s.currentTime - 5));
        return;
      }

      if (key === 'arrowdown') {
        e.preventDefault();
        s.setCurrentTime(s.currentTime + 5);
        return;
      }

      // ── In / Out point navigation ───────────────────────────────────────
      if (key === 'i' && !ctrl) {
        e.preventDefault();
        const clip = s.getActiveVideoAtTime(s.currentTime);
        if (clip) s.setCurrentTime(clip.startTime);
        return;
      }

      if (key === 'o' && !ctrl) {
        e.preventDefault();
        const clip = s.getActiveVideoAtTime(s.currentTime);
        if (clip) s.setCurrentTime(clip.startTime + clip.duration);
        return;
      }

      // ── Clip operations ─────────────────────────────────────────────────
      if (key === 's' && !ctrl) {
        e.preventDefault();
        const [firstId] = s.selectedClipIds;
        if (firstId) s.splitClip(firstId, s.currentTime);
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        const [firstId] = s.selectedClipIds;
        if (firstId) {
          if (shift) {
            s.rippleDelete(firstId);
          } else {
            s.removeClips(s.selectedClipIds);
          }
        }
        return;
      }

      if (key === 'd' && ctrl) {
        e.preventDefault();
        const [firstId] = s.selectedClipIds;
        if (firstId) s.duplicateClip(firstId);
        return;
      }

      // Ctrl+A — select all clips
      if (key === 'a' && ctrl) {
        e.preventDefault();
        const allIds = s.tracks.flatMap((t) => t.clips.map((c) => c.id));
        if (allIds.length) useEditorStore.setState({ selectedClipIds: allIds });
        return;
      }

      // ── Tool switching ──────────────────────────────────────────────────
      if (key === 'v' && !ctrl) { useEditorStore.setState({ activeTool: 'select' }); return; }
      if (key === 'c' && !ctrl) { useEditorStore.setState({ activeTool: 'cut'    }); return; }

      // ── Snapping toggle ─────────────────────────────────────────────────
      if (key === 'b' && !ctrl) {
        useEditorStore.setState({ snapping: !s.snapping });
        return;
      }

      // ── Undo / Redo ─────────────────────────────────────────────────────
      if (key === 'z' && ctrl && !shift) { e.preventDefault(); s.undo(); return; }
      if (key === 'z' && ctrl &&  shift) { e.preventDefault(); s.redo(); return; }

      // ── Zoom ────────────────────────────────────────────────────────────
      if ((key === '=' || key === '+') && ctrl) { e.preventDefault(); s.zoomIn();  return; }
      if (key === '-' && ctrl)                  { e.preventDefault(); s.zoomOut(); return; }
      if (key === '0' && ctrl && shift)         { e.preventDefault(); s.fitZoomToContent(); return; }

      // ── UI toggles ──────────────────────────────────────────────────────
      if (key === 'e' && ctrl) {
        e.preventDefault();
        setExportOpen(true);
        return;
      }

      if (key === 'p' && ctrl) {
        e.preventDefault();
        setShowProperties((v) => !v);
        return;
      }

      if (key === 'm' && ctrl) {
        e.preventDefault();
        setShowMediaBrowser((v) => !v);
        return;
      }

      if (key === 'b' && ctrl) {
        e.preventDefault();
        setShowBlueprint((v) => !v);
        return;
      }

      // ── Quick speed presets (no modifier, no clip selected) ─────────────
      if (!ctrl && !shift && s.selectedClipIds.length === 0) {
        if (key === '1') { s.setPlaybackSpeed(1); return; }
        if (key === '2') { s.setPlaybackSpeed(2); return; }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);

    // shuttleBack / shuttleForward are stable useCallback refs — safe here
  }, [shuttleBack, shuttleForward]); // setExportOpen/setShowX are stable setState from useState — no need to list

  return {
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
  };
};

export default useVisualEditor;
