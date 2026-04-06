import { create } from 'zustand'

export interface Caption {
  id: string
  text: string
  start: number
  end: number
  position: 'top' | 'center' | 'bottom'
}

export interface EditorFilters {
  brightness: number
  contrast: number
  saturation: number
}

export interface EditorState {
  // Video state
  videoUrl: string | null
  currentTime: number
  duration: number
  isPlaying: boolean
  
  // Filters
  filters: EditorFilters
  
  // Captions
  captions: Caption[]
  
  // Actions
  setVideoUrl: (url: string) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  
  setFilters: (filters: Partial<EditorFilters>) => void
  resetFilters: () => void
  
  addCaption: (caption: Omit<Caption, 'id'>) => void
  updateCaption: (id: string, updates: Partial<Caption>) => void
  removeCaption: (id: string) => void
  
  // Export
  exportConfig: () => object
  reset: () => void
}

const defaultFilters: EditorFilters = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  videoUrl: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  filters: defaultFilters,
  captions: [],
  
  // Video actions
  setVideoUrl: (url) => set({ videoUrl: url, currentTime: 0, duration: 0 }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  // Filter actions
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  resetFilters: () => set({ filters: defaultFilters }),
  
  // Caption actions
  addCaption: (caption) => set((state) => ({
    captions: [...state.captions, { ...caption, id: `caption-${Date.now()}-${Math.random()}` }]
  })),
  updateCaption: (id, updates) => set((state) => ({
    captions: state.captions.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  removeCaption: (id) => set((state) => ({
    captions: state.captions.filter(c => c.id !== id)
  })),
  
  // Export config
  exportConfig: () => {
    const state = get()
    return {
      filters: state.filters,
      captions: state.captions.map(({ id, ...caption }) => caption),
      timestamps: {
        currentTime: state.currentTime,
        duration: state.duration,
      }
    }
  },
  
  // Reset
  reset: () => set({
    videoUrl: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    filters: defaultFilters,
    captions: [],
  }),
}))
