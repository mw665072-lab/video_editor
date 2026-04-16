import {
  Segment,
} from '@/store/editorStore'
import { AudioWaveform } from '@/components/timeline/AudioWaveform'


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
      className="absolute top-0 h-full py-1"
      style={{ left: `${left}px`, width: `${width}px` }}
    >
      <div
        className={`relative h-full rounded-xl overflow-hidden glass border-2 transition-all duration-200 group ${isSelected ? 'border-primary ring-2 ring-primary/20 scale-[1.02] z-20 shadow-glow/10' : 'border-white/5 hover:border-white/20'
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
        {/* Background Thumbnail with Overlay */}
        <div className="absolute inset-0 z-0">
          <img src={segment.thumbnail} className="w-full h-full object-cover opacity-30 grayscale-[0.5] group-hover:grayscale-0 transition-all" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
        </div>

        {/* Audio Waveform Overlay */}
        <div className="absolute inset-0 z-10 py-3">
          <AudioWaveform 
            url={segment.videoUrl} 
            duration={segment.duration} 
            color={isSelected ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.3)'}
          />
        </div>

        {segment.transition.type !== 'none' && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent pointer-events-none z-10" />
        )}
        
        {/* Trim handles */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-primary/40 hover:bg-primary z-30 transition-colors"
          onMouseDown={(e) => {
            e.stopPropagation()
            onTrimStart(segment.id, e)
          }}
        >
          <div className="w-full h-full flex items-center justify-center opacity-50">
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-primary/40 hover:bg-primary z-30 transition-colors"
          onMouseDown={(e) => {
            e.stopPropagation()
            onTrimEnd(segment.id, e)
          }}
        >
          <div className="w-full h-full flex items-center justify-center opacity-50">
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>
        </div>

        {/* Clip Label */}
        <div className="absolute bottom-1.5 left-3 text-[10px] font-black uppercase tracking-widest text-white/90 drop-shadow-lg z-20 truncate pr-6">
          {segment.label}
        </div>
      </div>
    </div>
  )
}