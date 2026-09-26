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
      <DialogContent className="editor-dialog-theme border border-[#dce5dc] bg-white shadow-[0_30px_100px_rgba(31,52,36,0.20)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#18231b]">Export Video</DialogTitle>
          <DialogDescription className="text-[#667069]">
            Configure export settings for your edited video
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-xl border border-[#dce5dc] bg-[#f8fbf6] p-3">
            <div className="grid grid-cols-2 gap-4 text-sm text-[#31533b]">
              <div>
                <p className="  mb-1">Clips</p>
                <p className="font-semibold">{clips.length}</p>
              </div>
              <div>
                <p className="mb-1">Duration</p>
                <p className="font-semibold">{formatTime(totalDuration)}</p>
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
                // disabled={progress.isExporting}
                // placeholder color should be white
                className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-100 bg-slate-100 hover:text-slate-950 text-slate-950 font-semibold placeholder:text-slate-950"
              />
              <span className="  py-2">.mp4</span>
            </div>
            {/* <p className="text-xs  ">
              The video will be exported as H.264 MP4
            </p> */}
          </div>

          {/* Quality Settings */}
          <div className="space-y-2">
            <Label htmlFor="quality">Export Quality</Label>
            <Select value={selectedQuality} onValueChange={setSelectedQuality} disabled={progress.isExporting}>
              <SelectTrigger
                id="quality"
                className="flex-1 rounded-lg border-[#dce5dc] bg-white px-4 py-2 text-sm font-semibold text-[#18231b] hover:bg-[#f8fbf6]"
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
            <p className="text-xs text-[#667069]">
              Higher quality takes longer to process
            </p>
          </div>

          {/* Platform + Resize Mode */}
          {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platform">Social Platform</Label>
              <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as 'tiktok' | 'shorts' | 'reels')} disabled={progress.isExporting}>
                <SelectTrigger
                  id="platform"
                  className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 bg-slate-900/60 hover:text-slate-950 text-slate-950 font-semibold placeholder:text-slate-950"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="shorts">YouTube Shorts</SelectItem>
                  <SelectItem value="reels">Instagram Reels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resizeMode">Resize Mode</Label>
              <Select value={selectedResizeMode} onValueChange={(value) => setSelectedResizeMode(value as 'blur' | 'crop')} disabled={progress.isExporting}>
                <SelectTrigger
                  id="resizeMode"
                  className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 bg-slate-900/60 hover:text-slate-950 text-slate-950 font-semibold placeholder:text-slate-950"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blur">Blur background</SelectItem>
                  <SelectItem value="crop">Center crop</SelectItem>
                </SelectContent>
              </Select>
              
            </div>
          </div> */}

          {/* Progress */}
          {progress.isExporting && (
            <div className="space-y-3 p-3 bg-[#ffffff] rounded-lg border border-emerald-500/20">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-100 font-medium">
                  {progress.currentStep || 'Processing...'}
                </span>
                <span className="font-medium text-[#15803d]">
                  {Math.round(progress.progress)}%
                </span>
              </div>
              <Progress value={progress.progress} className="h-2 bg-[#ffffff]" />
              <p className="text-xs text-[#526159]">
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
          <div className="flex gap-2 rounded-lg border border-[#eadb9a] bg-[#fff9dc] p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#9a6b00]" />
            <p className="text-xs text-[#614f00]">
              Export requires a modern browser with WebAssembly support. Large files may take several minutes.
            </p>
          </div>

          {/* Export availability */}
          {!isExportAllowed && (
            <div className="p-3 bg-[#ffffff] rounded-lg border border-emerald-500/20 text-sm text-emerald-100">
              {exportDisabledReason || 'This source is not exportable. Use a local file or direct video URL (MP4/WebM).'}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={progress.isExporting}
              className="flex-1 border-[#dce5dc] bg-white text-[#31533b] hover:bg-[#edf7ef] hover:text-[#14532d]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={progress.isExporting || clips.length === 0 || !isExportAllowed}
              className="flex-1 bg-[#15803d] text-white hover:bg-[#166534]"
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
