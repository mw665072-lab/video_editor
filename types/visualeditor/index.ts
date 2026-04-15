import { Caption } from "@/store/editorStore"

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ExtendedCaption extends Caption {
  fontSize?: number
  color?: string
  fontStyle?: 'normal' | 'bold' | 'italic' | 'shadow'
  bgEnabled?: boolean
  align?: 'left' | 'center' | 'right'
}
