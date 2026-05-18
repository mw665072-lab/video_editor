import { Label } from "../ui/label"
import { Slider } from "../ui/slider"

// ─── Sub-components ───────────────────────────────────────────────────────────
function FilterSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  displayValue,
    onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  displayValue: string
  onChange: (v: number[]) => void
}) {
  return (
    <div className="space-y-1 mb-3">
      <div className="flex justify-between items-center">
        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</Label>
        <span className="text-[10px] text-slate-400 tabular-nums font-mono">{displayValue}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={onChange} className="h-1" />
    </div>
  )
}

export default FilterSlider