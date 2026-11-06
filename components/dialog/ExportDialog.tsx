'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Download } from 'lucide-react'
import { ExportProgress } from '@/lib/types'
import { VideoClip } from '@/lib/types'
import { formatTime, calculateTotalDuration } from '@/lib/videoUtils'
import { toast } from 'sonner'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clips: VideoClip[]
  onExport: (quality: string, platform: 'tiktok' | 'shorts' | 'reels', resizeMode: 'blur' | 'crop') => Promise<void>
  progress: ExportProgress
  isExportAllowed?: boolean
  exportDisabledReason?: string
}

export function ExportDialog({
  open,
  onOpenChange,
  clips,
  onExport,
  progress,
  isExportAllowed = true,
  exportDisabledReason,
}: ExportDialogProps) {
  const [selectedQuality, setSelectedQuality] = useState('medium')
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'shorts' | 'reels'>('tiktok')
  const [selectedResizeMode, setSelectedResizeMode] = useState<'blur' | 'crop'>('blur')
  const [fileName, setFileName] = useState('exported-video')
  const totalDuration = calculateTotalDuration(clips)

  const handleExport = async () => {
    if (!fileName.trim()) {
      alert('Please enter a file name')
      return
    }

    if (!isExportAllowed) {
      const reason = exportDisabledReason || 'Export is disabled for this source.'
      alert(reason)
      return
    }

    await onExport(selectedQuality, selectedPlatform, selectedResizeMode)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="editor-dialog-theme border border-[#e4e6f2] bg-white shadow-[0_30px_100px_rgba(88,66,237,0.12)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#110d2e]">Export Video</DialogTitle>
          <DialogDescription className="text-[#5e6578]">
            Configure export settings for your edited video
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-xl border border-[#e4e6f2] bg-[#f8f9fd] p-3">
            <div className="grid grid-cols-2 gap-4 text-sm text-[#5e6578]">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider">Clips</p>
                <p className="font-bold text-[#110d2e]">{clips.length}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider">Duration</p>
                <p className="font-bold text-[#110d2e]">{formatTime(totalDuration)}</p>
              </div>
            </div>
          </div>

          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="filename">File Name</Label>
            <div className="flex gap-2">
              <Input
                id="filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="exported-video"
                className="flex-1 rounded-lg border-[#e4e6f2] bg-[#f8f9fd] px-4 py-2 text-sm text-[#110d2e] font-semibold"
              />
              <span className="py-2 text-[#5e6578] font-semibold">.mp4</span>
            </div>
          </div>

          {/* Quality Settings */}
          <div className="space-y-2">
            <Label htmlFor="quality">Export Quality</Label>
            <Select value={selectedQuality} onValueChange={setSelectedQuality} disabled={progress.isExporting}>
              <SelectTrigger
                id="quality"
                className="flex-1 rounded-lg border-[#e4e6f2] bg-white px-4 py-2 text-sm font-semibold text-[#110d2e] hover:bg-[#f8f9fd]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">
                  <span>Fast (Lower Quality, Faster Export)</span>
                </SelectItem>
                <SelectItem value="medium">
                  <span>Medium (Balanced, Recommended)</span>
                </SelectItem>
                <SelectItem value="slow">
                  <span>Slow (Higher Quality, Slower Export)</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[#5e6578]">
              Higher quality takes longer to process
            </p>
          </div>

          {/* Progress */}
          {progress.isExporting && (
            <div className="space-y-3 p-3 bg-white rounded-lg border border-[#ded7fb]">
              <div className="flex justify-between text-sm">
                <span className="text-[#110d2e] font-medium">
                  {progress.currentStep || 'Processing...'}
                </span>
                <span className="font-bold text-[#5842ed]">
                  {Math.round(progress.progress)}%
                </span>
              </div>
              <Progress value={progress.progress} className="h-2 bg-[#f0eeff]" />
              <p className="text-xs text-[#5e6578]">
                Please keep this window open while processing
              </p>
            </div>
          )}

          {/* Error */}
          {progress.error && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{progress.error}</p>
            </div>
          )}

          {/* Browser Support Warning */}
          <div className="flex gap-2 rounded-lg border border-[#ded7fb] bg-[#f0eeff] p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#5842ed]" />
            <p className="text-xs text-[#5842ed]">
              Export requires a modern browser with WebAssembly support. Large files may take several minutes.
            </p>
          </div>

          {/* Export availability */}
          {!isExportAllowed && (
            <div className="p-3 bg-white rounded-lg border border-[#ded7fb] text-sm text-[#5e6578]">
              {exportDisabledReason || 'This source is not exportable. Use a local file or direct video URL (MP4/WebM).'}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={progress.isExporting}
              className="flex-1 border-[#e4e6f2] bg-white text-[#5e6578] hover:bg-[#f8f9fd] hover:text-[#110d2e]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={progress.isExporting || clips.length === 0 || !isExportAllowed}
              className="flex-1 bg-[#5842ed] text-white hover:bg-[#4730df] shadow-[0_4px_16px_rgba(88,66,237,0.25)]"
            >
              <Download className="w-4 h-4 mr-2" />
              {progress.isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
