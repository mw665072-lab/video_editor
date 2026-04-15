
import {
  Segment,
} from '@/store/editorStore'


export function TimelineClip({
  segment,
  isSelected,
  onSelect,
  onTrimStart,
  onTrimEnd,
  onDragStart,
  onDrop,
  zoom,
  left,
}: {
  segment: Segment
  isSelected: boolean
  onSelect: () => void
  onTrimStart: (id: string, e: React.MouseEvent) => void
  onTrimEnd: (id: string, e: React.MouseEvent) => void
  onDragStart?: (id: string) => void
  onDrop?: (id: string) => void
  zoom: number
  left: number
}) {
  const width = segment.trimDuration * zoom
  return (
    <div
      className="absolute top-0 h-full"
      style={{ left: `${left}px`, width: `${width}px` }}
    >
      <div
        className={`relative h-full rounded-md overflow-hidden border-2 cursor-pointer ${isSelected ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-500'
          }`}
        onClick={onSelect}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          onDragStart?.(segment.id)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onDrop?.(segment.id)
        }}
      >
        <img src={segment.thumbnail} className="w-full h-full object-cover" alt="" />
        {segment.transition.type !== 'none' && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />
        )}
        {/* Trim handles */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-indigo-500/30 hover:bg-indigo-500/60 z-10"
          onMouseDown={(e) => {
            e.stopPropagation()
            onTrimStart(segment.id, e)
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-indigo-500/30 hover:bg-indigo-500/60 z-10"
          onMouseDown={(e) => {
            e.stopPropagation()
            onTrimEnd(segment.id, e)
          }}
        />
        <div className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/60 px-1 rounded-sm text-white">
          {segment.label}
        </div>
      </div>
    </div>
  )
}