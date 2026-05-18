// store/editorStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface VideoFilters {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  blur: number
  sepia: number
  grayscale: number
  invert: number
}

export const defaultFilters: VideoFilters = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  hue: 0,
  blur: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
}

export interface VideoTransform {
  rotation: number
  flipH: boolean
  flipV: boolean
  opacity: number
  scale: number
  x: number
  y: number
}

export const defaultTransform: VideoTransform = {
  rotation: 0,
  flipH: false,
  flipV: false,
  opacity: 1,
  scale: 1,
  x: 0,
  y: 0,
}

export interface Keyframe<T> {
  id: string
  time: number
  value: T
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface Transition {
  type: 'none' | 'crossfade' | 'fade-black' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down'
  duration: number
}

export interface Segment {
  id: string
  videoUrl: string
  file: File | null
  duration: number
  startTime: number
  trimDuration: number
  label: string
  thumbnail: string
  filters: VideoFilters
  transform: VideoTransform
  transition: Transition
  keyframes: {
    opacity?: Keyframe<number>[]
    scale?: Keyframe<number>[]
    rotation?: Keyframe<number>[]
    x?: Keyframe<number>[]
    y?: Keyframe<number>[]
  }
}

export interface Caption {
  id: string
  text: string
  start: number
  end: number
  position: 'top' | 'center' | 'bottom'
  fontSize?: number
  color?: string
  fontStyle?: 'normal' | 'bold' | 'italic' | 'shadow'
  bgEnabled?: boolean
  align?: 'left' | 'center' | 'right'
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

// ─── Store State ─────────────────────────────────────────────────────────────
interface EditorState {
  segments: Segment[]
  selectedSegmentIds: string[]
  captions: Caption[]
  history: {
    past: Segment[][]
    future: Segment[][]
  }

  // History actions
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Segment actions
  setSegments: (segments: Segment[]) => void
  addSegment: (segment: Omit<Segment, 'transition' | 'keyframes'>) => void
  removeSegment: (id: string) => void
  updateSegment: (id: string, updates: Partial<Segment>) => void
  updateSelectedSegments: (updates: Partial<Segment>) => void
  setSelectedSegmentIds: (ids: string[]) => void
  reorderSegments: (fromIndex: number, toIndex: number) => void

  // Enhanced actions
  addTransition: (segmentId: string, transition: Partial<Transition>) => void
  addKeyframe: (segmentId: string, property: keyof Segment['keyframes'], keyframe: Omit<Keyframe<any>, 'id'>) => void
  updateKeyframe: (segmentId: string, property: keyof Segment['keyframes'], keyframeId: string, updates: Partial<Keyframe<any>>) => void
  removeKeyframe: (segmentId: string, property: keyof Segment['keyframes'], keyframeId: string) => void
  splitSelectedAtPlayhead: (currentTime: number) => void
  rippleDelete: (segmentId: string) => void

  // Caption actions
  addCaption: (caption: Omit<Caption, 'id'>) => void
  removeCaption: (id: string) => void
  updateCaption: (id: string, updates: Partial<Caption>) => void

  // Reset
  reset: () => void
}

// ─── Store Implementation ────────────────────────────────────────────────────
export const useEditorStore = create<EditorState>()(
  devtools((set, get) => ({
    segments: [],
    selectedSegmentIds: [],
    captions: [],
    history: {
      past: [],
      future: [],
    },

    pushHistory: () => {
      const { segments, history } = get()
      set({
        history: {
          past: [...history.past, segments],
          future: [],
        },
      })
    },

    undo: () => {
      const { history } = get()
      if (history.past.length === 0) return
      const previous = history.past[history.past.length - 1]
      const newPast = history.past.slice(0, -1)
      set({
        segments: previous,
        history: {
          past: newPast,
          future: [get().segments, ...history.future],
        },
        selectedSegmentIds: [],
      })
    },

    redo: () => {
      const { history } = get()
      if (history.future.length === 0) return
      const next = history.future[0]
      const newFuture = history.future.slice(1)
      set({
        segments: next,
        history: {
          past: [...history.past, get().segments],
          future: newFuture,
        },
        selectedSegmentIds: [],
      })
    },

    setSegments: (segments) => set({ segments }),

    addSegment: (segment) => {
      get().pushHistory()
      set((state) => ({
        segments: [
          ...state.segments,
          {
            ...segment,
            transition: { type: 'none', duration: 0.5 },
            keyframes: {},
          } as Segment,
        ],
        selectedSegmentIds: [segment.id],
      }))
    },

    removeSegment: (id) => {
      get().pushHistory()
      set((state) => ({
        segments: state.segments.filter((s) => s.id !== id),
        selectedSegmentIds: state.selectedSegmentIds.filter((sid) => sid !== id),
      }))
    },

    updateSegment: (id, updates) => {
      get().pushHistory()
      set((state) => ({
        segments: state.segments.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }))
    },

    updateSelectedSegments: (updates) => {
      const { selectedSegmentIds, pushHistory } = get()
      if (selectedSegmentIds.length === 0) return
      pushHistory()
      set((state) => ({
        segments: state.segments.map((s) =>
          selectedSegmentIds.includes(s.id) ? { ...s, ...updates } : s
        ),
      }))
    },

    setSelectedSegmentIds: (ids) => set({ selectedSegmentIds: ids }),

    reorderSegments: (fromIndex, toIndex) => {
      get().pushHistory()
      set((state) => {
        const newSegments = [...state.segments]
        const [moved] = newSegments.splice(fromIndex, 1)
        newSegments.splice(toIndex, 0, moved)
        return { segments: newSegments }
      })
    },

    addTransition: (segmentId, transition) => {
      get().pushHistory()
      set((state) => ({
        segments: state.segments.map((s) =>
          s.id === segmentId
            ? { ...s, transition: { ...s.transition, ...transition } }
            : s
        ),
      }))
    },

    addKeyframe: (segmentId, property, keyframe) => {
      get().pushHistory()
      set((state) => ({
        segments: state.segments.map((s) => {
          if (s.id !== segmentId) return s
          const existing = s.keyframes[property] || []
          const newKeyframe = { ...keyframe, id: uid() }
          return {
            ...s,
            keyframes: {
              ...s.keyframes,
              [property]: [...existing, newKeyframe],
            },
          }
        }),
      }))
    },

    updateKeyframe: (segmentId, property, keyframeId, updates) => {
      get().pushHistory()
      set((state) => ({
        segments: state.segments.map((s) => {
          if (s.id !== segmentId) return s
          const kfs = s.keyframes[property] || []
          return {
            ...s,
            keyframes: {
              ...s.keyframes,
              [property]: kfs.map((kf) => (kf.id === keyframeId ? { ...kf, ...updates } : kf)),
            },
          }
        }),
      }))
    },

    removeKeyframe: (segmentId, property, keyframeId) => {
      get().pushHistory()
      set((state) => ({
        segments: state.segments.map((s) => {
          if (s.id !== segmentId) return s
          const kfs = s.keyframes[property] || []
          return {
            ...s,
            keyframes: {
              ...s.keyframes,
              [property]: kfs.filter((kf) => kf.id !== keyframeId),
            },
          }
        }),
      }))
    },

    splitSelectedAtPlayhead: (currentTime) => {
      const { segments, selectedSegmentIds, pushHistory } = get()
      pushHistory()
      const newSegments: Segment[] = []
      for (const seg of segments) {
        if (!selectedSegmentIds.includes(seg.id)) {
          newSegments.push(seg)
          continue
        }
        const relTime = currentTime - seg.startTime
        if (relTime <= 0.1 || relTime >= seg.trimDuration - 0.1) {
          newSegments.push(seg)
          continue
        }
        const partA: Segment = {
          ...seg,
          id: uid(),
          trimDuration: relTime,
          label: `${seg.label} (A)`,
          keyframes: { ...seg.keyframes }, // shallow copy ok
        }
        const partB: Segment = {
          ...seg,
          id: uid(),
          startTime: seg.startTime + relTime,
          trimDuration: seg.trimDuration - relTime,
          label: `${seg.label} (B)`,
          keyframes: { ...seg.keyframes },
        }
        newSegments.push(partA, partB)
      }
      set({ segments: newSegments, selectedSegmentIds: [] })
    },

    rippleDelete: (segmentId) => {
      get().pushHistory()
      set((state) => ({
        segments: state.segments.filter((s) => s.id !== segmentId),
        selectedSegmentIds: state.selectedSegmentIds.filter((id) => id !== segmentId),
      }))
    },

    addCaption: (caption) => {
      set((state) => ({
        captions: [...state.captions, { ...caption, id: uid() }],
      }))
    },

    removeCaption: (id) => {
      set((state) => ({
        captions: state.captions.filter((c) => c.id !== id),
      }))
    },

    updateCaption: (id, updates) => {
      set((state) => ({
        captions: state.captions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }))
    },

    reset: () => {
      set({
        segments: [],
        selectedSegmentIds: [],
        captions: [],
        history: { past: [], future: [] },
      })
    },
  }))
)