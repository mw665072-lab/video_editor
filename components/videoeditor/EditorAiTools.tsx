'use client'

import { useState } from 'react'
import { Captions, FileText, ImagePlus, Scan, Scissors, Search, ScrollText, Sparkles, Video } from 'lucide-react'
import { VideoUpload } from '@/components/upload/VideoUpload'

type VideoSourceType = 'file' | 'direct' | 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'vimeo' | 'proxy' | 'unknown'

type EditorTool = {
  label: string
  slug: string
  description: string
  icon: typeof Scissors
}

interface EditorAiToolsProps {
  onVideoLoaded: (
    source: Blob | string,
    duration: number,
    fileName?: string,
    sourceType?: VideoSourceType,
    originalSource?: string
  ) => void
  onDurationResolved?: (duration: number, title?: string) => void
}

const editorTools: EditorTool[] = [
  { label: 'AI Clipping', slug: 'ai-clipping', icon: Scissors, description: 'Load a source video and generate short clip candidates from it.' },
  { label: 'Find Moments', slug: 'find-moments', icon: Search, description: 'Import a video so AI can detect hooks, highlights, and key moments.' },
  { label: 'AI Subtitles', slug: 'subtitles', icon: Captions, description: 'Load a video and prepare it for caption generation and subtitle styling.' },
  { label: 'AI Thumbnail', slug: 'thumbnail', icon: ImagePlus, description: 'Load a video and choose frames for thumbnail generation.' },
  { label: 'Video Transcript', slug: 'transcript', icon: FileText, description: 'Import a video so speech can be turned into searchable transcript text.' },
  { label: 'Video Summary', slug: 'summary', icon: ScrollText, description: 'Load a video and prepare it for summary and chapter generation.' },
  { label: 'AI Reframe', slug: 'reframe', icon: Scan, description: 'Load a video and prepare it for Shorts, Reels, and TikTok reframing.' },
  { label: 'AI Video', slug: 'ai-video', icon: Video, description: 'Start from a video source and continue with AI assisted editing tools.' },
]

export function EditorAiTools({ onVideoLoaded, onDurationResolved }: EditorAiToolsProps) {
  const [selectedTool, setSelectedTool] = useState<EditorTool | null>(null)

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-[#100a2f]/95 p-4 text-left shadow-[0_16px_60px_rgba(38,24,103,0.45)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">AI Tools</p>
          <h2 className="mt-1 text-xl font-black text-white">Create faster from this video</h2>
        </div>
        <p className="max-w-xl text-sm text-purple-200/80">
          Jump into clipping, subtitles, transcripts, thumbnails, summaries, and reframing before loading your source.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {editorTools.map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.slug}
              type="button"
              onClick={() => setSelectedTool(tool)}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[#12072f]/90 p-4 transition hover:-translate-y-0.5 hover:border-[#8b5cf6]/50 hover:bg-[#150b40]"
          >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-200 transition group-hover:bg-purple-500/20">
                <Icon size={20} strokeWidth={2.4} />
              </span>
              <span className="text-sm font-black text-white">{tool.label}</span>
              <Sparkles className="ml-auto text-purple-400 transition group-hover:text-purple-200" size={15} />
            </button>
          )
        })}
      </div>

      {selectedTool && (
        <EditorToolModal
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
          onVideoLoaded={onVideoLoaded}
          onDurationResolved={onDurationResolved}
        />
      )}
    </section>
  )
}

function EditorToolModal({
  tool,
  onClose,
  onVideoLoaded,
  onDurationResolved,
}: {
  tool: EditorTool
  onClose: () => void
  onVideoLoaded: EditorAiToolsProps['onVideoLoaded']
  onDurationResolved?: EditorAiToolsProps['onDurationResolved']
}) {
  const Icon = tool.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#12072f] shadow-[0_30px_120px_rgba(70,55,160,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#150b40] p-5">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-200">
              <Icon size={22} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">Start {tool.label}</p>
              <h3 className="mt-1 text-2xl font-black text-white">Upload video or paste URL</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-purple-200/80">{tool.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-[#150b40] px-3 py-2 text-sm font-black text-purple-200 hover:border-[#8b5cf6]/50 hover:text-purple-100"
          >
            Close
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-5">
          <div className="mb-4 rounded-2xl border border-white/10 bg-[#150b40] p-4 text-sm leading-6 text-purple-200">
            Choose a local video file or paste a supported URL. Once it loads, the source is placed into the editor and this modal closes.
          </div>
          <VideoUpload
            onVideoLoaded={(source, duration, fileName, sourceType, originalSource) => {
              onVideoLoaded(source, duration, fileName, sourceType, originalSource)
              onClose()
            }}
            onDurationResolved={onDurationResolved}
          />
        </div>
      </div>
    </div>
  )
}
