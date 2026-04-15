import {

  defaultFilters,

} from '@/store/editorStore'
// ─── LUT Presets ──────────────────────────────────────────────────────────────

export const LUT_PRESETS = [
  { id: 'none', label: 'Original', filters: defaultFilters },
  { id: 'vibrant', label: 'Vibrant', filters: { ...defaultFilters, saturation: 1.4, contrast: 1.1 } },
  { id: 'noir', label: 'Noir', filters: { ...defaultFilters, grayscale: 1, contrast: 1.3 } },
  { id: 'warm', label: 'Warm', filters: { ...defaultFilters, sepia: 30, brightness: 1.05 } },
  { id: 'dramatic', label: 'Dramatic', filters: { ...defaultFilters, contrast: 1.5, brightness: 0.9 } },
  { id: 'faded', label: 'Faded', filters: { ...defaultFilters, brightness: 1.1, contrast: 0.8, saturation: 0.8 } },
]

export const EXPORT_FORMATS = [
  { id: 'mp4', label: 'MP4 (H.264)', description: 'Best compatibility', badge: 'HD Pro', badgeColor: '#6366f1' },
  { id: 'webm', label: 'WebM (VP9)', description: 'Best for Web', badge: 'Ultra', badgeColor: '#06b6d4' },
]

export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function uid(): string {
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}