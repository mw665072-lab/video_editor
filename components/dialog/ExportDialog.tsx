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
      <DialogContent className="sm:max-w-md bg-[#12072f] border border-white/10 shadow-[0_30px_120px_rgba(70,55,160,0.35)]">
        <DialogHeader>
          <DialogTitle className="text-slate-50">Export Video</DialogTitle>
          <DialogDescription className="text-slate-300">
            Configure export settings for your edited video
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="p-3 bg-[#150b40] rounded-lg border border-white/10">
            <div className="grid grid-cols-2 gap-4 text-sm text-purple-100">
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
                className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-[#110A05]/60 bg-[#110A05]/60 hover:text-white text-white font-semibold placeholder:text-white"
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
                className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 bg-slate-900/60 hover:text-white text-white font-semibold placeholder:text-white"
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
            <p className="text-xs text-purple-200/70">
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
                  className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 bg-slate-900/60 hover:text-white text-white font-semibold placeholder:text-white"
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
                  className="flex-1 rounded-lg px-4 py-2 text-sm hover:bg-slate-800/60 bg-slate-900/60 hover:text-white text-white font-semibold placeholder:text-white"
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
            <div className="space-y-3 p-3 bg-[#150b40] rounded-lg border border-purple-500/20">
              <div className="flex justify-between text-sm">
                <span className="text-purple-100 font-medium">
                  {progress.currentStep || 'Processing...'}
                </span>
                <span className="text-cyan-200 font-medium">
                  {Math.round(progress.progress)}%
                </span>
              </div>
              <Progress value={progress.progress} className="h-2 bg-[#150b40]" />
              <p className="text-xs text-cyan-100/80">
                Please keep this window open while processing
              </p>
            </div>
          )}

          {/* Error */}
          {progress.error && (
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 flex gap-2">
              <AlertCircle className="w-4 h-4 text-purple-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-100">{progress.error}</p>
            </div>
          )}

          {/* Browser Support Warning */}
          <div className="p-3 bg-[#150b40] rounded-lg border border-purple-500/20 flex gap-2">
            <AlertCircle className="w-4 h-4 text-purple-300 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-purple-100">
              Export requires a modern browser with WebAssembly support. Large files may take several minutes.
            </p>
          </div>

          {/* Export availability */}
          {!isExportAllowed && (
            <div className="p-3 bg-[#150b40] rounded-lg border border-purple-500/20 text-sm text-purple-100">
              {exportDisabledReason || 'This source is not exportable. Use a local file or direct video URL (MP4/WebM).'}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={progress.isExporting}
              className="flex-1 border-white/10 hover:bg-[#150b40]/70 bg-[#150b40]/70 text-purple-100 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={progress.isExporting || clips.length === 0 || !isExportAllowed}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
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
