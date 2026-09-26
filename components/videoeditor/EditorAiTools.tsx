'use client'

import { useState, useEffect } from 'react'
import { Captions, Download, FileText, ImagePlus, Loader2, Scan, Scissors, Search, ScrollText, Sparkles, Video } from 'lucide-react'
import { VideoUpload } from '@/components/upload/VideoUpload'
import { generateAiThumbnail, generateUploadedVideoSubtitles, generateUploadedVideoSummary, generateVideoSubtitles, generateVideoSummary, suggestClips, ClipSuggestionResponse, VideoSubtitlesResponse, VideoSummaryResponse } from '@/lib/api'

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
  onSummaryGenerated?: (summary: VideoSummaryResponse) => void
  onSummaryFailed?: (message: string) => void
  onSubtitlesGenerated?: (subtitles: VideoSubtitlesResponse) => void
  onSubtitlesFailed?: (message: string) => void
  onTranscriptGenerated?: (transcript: VideoSubtitlesResponse) => void
  onTranscriptFailed?: (message: string) => void
  onMomentsGenerated?: (moments: ClipSuggestionResponse) => void
  onMomentsFailed?: (message: string) => void
  onAiClipsGenerated?: (clips: ClipSuggestionResponse) => void
  onAiClipsFailed?: (message: string) => void
  onReframeRequested?: () => void
  selectedToolSlug?: string | null
  hideToolGrid?: boolean
  onCloseTool?: () => void
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

export function EditorAiTools({
  onVideoLoaded,
  onDurationResolved,
  onSummaryGenerated,
  onSummaryFailed,
  onSubtitlesGenerated,
  onSubtitlesFailed,
  onTranscriptGenerated,
  onTranscriptFailed,
  onMomentsGenerated,
  onMomentsFailed,
  onAiClipsGenerated,
  onAiClipsFailed,
  onReframeRequested,
  selectedToolSlug,
  hideToolGrid = false,
  onCloseTool,
}: EditorAiToolsProps) {
  const [selectedTool, setSelectedTool] = useState<EditorTool | null>(null)

  // Auto-open modal when tool is selected from sidebar
  useEffect(() => {
    if (selectedToolSlug) {
      const tool = editorTools.find(t => t.slug === selectedToolSlug)
      if (tool) {
        setSelectedTool(tool)
      }
    }
  }, [selectedToolSlug])

  const handleCloseModal = () => {
    setSelectedTool(null)
    onCloseTool?.()
  }

  if (hideToolGrid) {
    return (
      <>
        {selectedTool && (
          <EditorToolModal
            tool={selectedTool}
            onClose={handleCloseModal}
            onVideoLoaded={onVideoLoaded}
            onDurationResolved={onDurationResolved}
            onSummaryGenerated={onSummaryGenerated}
            onSummaryFailed={onSummaryFailed}
            onSubtitlesGenerated={onSubtitlesGenerated}
            onSubtitlesFailed={onSubtitlesFailed}
            onTranscriptGenerated={onTranscriptGenerated}
            onTranscriptFailed={onTranscriptFailed}
            onMomentsGenerated={onMomentsGenerated}
            onMomentsFailed={onMomentsFailed}
            onAiClipsGenerated={onAiClipsGenerated}
            onAiClipsFailed={onAiClipsFailed}
            onReframeRequested={onReframeRequested}
          />
        )}
      </>
    )
  }

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-[#111827]/95 p-4 text-left shadow-[0_16px_60px_rgba(15,23,42,0.45)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">AI Tools</p>
          <h2 className="mt-1 text-xl font-black text-white">Create faster from this video</h2>
        </div>
        <p className="max-w-xl text-sm text-emerald-200/80">
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
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f172a]/90 p-4 transition hover:-translate-y-0.5 hover:border-[#22a653]/50 hover:bg-[#172033]"
          >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 transition group-hover:bg-emerald-500/20">
                <Icon size={20} strokeWidth={2.4} />
              </span>
              <span className="text-sm font-black text-white">{tool.label}</span>
              <Sparkles className="ml-auto text-emerald-400 transition group-hover:text-emerald-200" size={15} />
            </button>
          )
        })}
      </div>

      {selectedTool && (
        <EditorToolModal
          tool={selectedTool}
          onClose={handleCloseModal}
          onVideoLoaded={onVideoLoaded}
          onDurationResolved={onDurationResolved}
          onSummaryGenerated={onSummaryGenerated}
          onSummaryFailed={onSummaryFailed}
          onSubtitlesGenerated={onSubtitlesGenerated}
          onSubtitlesFailed={onSubtitlesFailed}
          onTranscriptGenerated={onTranscriptGenerated}
          onTranscriptFailed={onTranscriptFailed}
          onMomentsGenerated={onMomentsGenerated}
          onMomentsFailed={onMomentsFailed}
          onAiClipsGenerated={onAiClipsGenerated}
          onAiClipsFailed={onAiClipsFailed}
          onReframeRequested={onReframeRequested}
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
  onSummaryGenerated,
  onSummaryFailed,
  onSubtitlesGenerated,
  onSubtitlesFailed,
  onTranscriptGenerated,
  onTranscriptFailed,
  onMomentsGenerated,
  onMomentsFailed,
  onAiClipsGenerated,
  onAiClipsFailed,
  onReframeRequested,
}: {
  tool: EditorTool
  onClose: () => void
  onVideoLoaded: EditorAiToolsProps['onVideoLoaded']
  onDurationResolved?: EditorAiToolsProps['onDurationResolved']
  onSummaryGenerated?: EditorAiToolsProps['onSummaryGenerated']
  onSummaryFailed?: EditorAiToolsProps['onSummaryFailed']
  onSubtitlesGenerated?: EditorAiToolsProps['onSubtitlesGenerated']
  onSubtitlesFailed?: EditorAiToolsProps['onSubtitlesFailed']
  onTranscriptGenerated?: EditorAiToolsProps['onTranscriptGenerated']
  onTranscriptFailed?: EditorAiToolsProps['onTranscriptFailed']
  onMomentsGenerated?: EditorAiToolsProps['onMomentsGenerated']
  onMomentsFailed?: EditorAiToolsProps['onMomentsFailed']
  onAiClipsGenerated?: EditorAiToolsProps['onAiClipsGenerated']
  onAiClipsFailed?: EditorAiToolsProps['onAiClipsFailed']
  onReframeRequested?: EditorAiToolsProps['onReframeRequested']
}) {
  const Icon = tool.icon
  const isAiClippingTool = tool.slug === 'ai-clipping'
  const isFindMomentsTool = tool.slug === 'find-moments'
  const isSummaryTool = tool.slug === 'summary'
  const isSubtitleTool = tool.slug === 'subtitles'
  const isTranscriptTool = tool.slug === 'transcript'
  const isReframeTool = tool.slug === 'reframe'
  const isThumbnailTool = tool.slug === 'thumbnail'
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [subtitleError, setSubtitleError] = useState<string | null>(null)
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false)
  const [momentsError, setMomentsError] = useState<string | null>(null)
  const [isFindingMoments, setIsFindingMoments] = useState(false)
  const [aiClipsError, setAiClipsError] = useState<string | null>(null)
  const [isGeneratingAiClips, setIsGeneratingAiClips] = useState(false)
  const [thumbnailPrompt, setThumbnailPrompt] = useState('')
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)

  const handleVideoLoaded: EditorAiToolsProps['onVideoLoaded'] = async (
    source,
    duration,
    fileName,
    sourceType,
    originalSource
  ) => {
    if (!isAiClippingTool && !isFindMomentsTool && !isSummaryTool && !isSubtitleTool && !isTranscriptTool && !isReframeTool) {
      onVideoLoaded(source, duration, fileName, sourceType, originalSource)
      onClose()
      return
    }

    if (isReframeTool) {
      onVideoLoaded(source, duration, fileName, sourceType, originalSource)
      onReframeRequested?.()
      onClose()
      return
    }

    if (isAiClippingTool || isFindMomentsTool) {
      const sourceUrl = originalSource || (typeof source === 'string' ? source : '')
      if (!sourceUrl || source instanceof Blob || sourceType === 'file') {
        const message = `${isAiClippingTool ? 'AI Clipping' : 'Find Moments'} currently needs a URL-based video source so the backend can analyze it. Please paste a supported video URL.`
        if (isAiClippingTool) {
          setAiClipsError(message)
          onAiClipsFailed?.(message)
        } else {
          setMomentsError(message)
          onMomentsFailed?.(message)
        }
        onVideoLoaded(source, duration, fileName, sourceType, originalSource)
        onClose()
        return
      }

      setMomentsError(null)
      setAiClipsError(null)
      setIsFindingMoments(isFindMomentsTool)
      setIsGeneratingAiClips(isAiClippingTool)
      try {
        const result = await suggestClips(sourceUrl, 'anthropic')
        if (isAiClippingTool) {
          onAiClipsGenerated?.(result)
        } else {
          onMomentsGenerated?.(result)
        }
        onVideoLoaded(source, duration, fileName, sourceType, originalSource)
        onClose()
      } catch (error) {
        const message = error instanceof Error ? error.message : isAiClippingTool ? 'Failed to generate AI clips.' : 'Failed to find viral moments.'
        if (isAiClippingTool) {
          setAiClipsError(message)
          onAiClipsFailed?.(message)
        } else {
          setMomentsError(message)
          onMomentsFailed?.(message)
        }
        onVideoLoaded(source, duration, fileName, sourceType, originalSource)
        onClose()
      } finally {
        setIsFindingMoments(false)
        setIsGeneratingAiClips(false)
      }
      return
    }

    if (isSubtitleTool || isTranscriptTool) {
      setSubtitleError(null)
      setTranscriptError(null)
      setIsGeneratingSubtitles(isSubtitleTool)
      setIsGeneratingTranscript(isTranscriptTool)
      try {
        const subtitleUrl = originalSource || (typeof source === 'string' ? source : '')
        const result =
          source instanceof Blob || sourceType === 'file'
            ? await generateUploadedVideoSubtitles(source as Blob, fileName)
            : await generateVideoSubtitles(subtitleUrl)
        if (isSubtitleTool) {
          onSubtitlesGenerated?.(result)
        } else {
          onTranscriptGenerated?.(result)
        }
        onVideoLoaded(source, duration, fileName, sourceType, originalSource)
        onClose()
      } catch (error) {
        const message = error instanceof Error ? error.message : isSubtitleTool ? 'Failed to generate subtitles.' : 'Failed to generate transcript.'
        if (isSubtitleTool) {
          setSubtitleError(message)
          onSubtitlesFailed?.(message)
        } else {
          setTranscriptError(message)
          onTranscriptFailed?.(message)
        }
        onVideoLoaded(source, duration, fileName, sourceType, originalSource)
        onClose()
      } finally {
        setIsGeneratingSubtitles(false)
        setIsGeneratingTranscript(false)
      }
      return
    }

    setSummaryError(null)
    setIsSummarizing(true)
    try {
      const summaryUrl = originalSource || (typeof source === 'string' ? source : '')
      const result =
        source instanceof Blob || sourceType === 'file'
          ? await generateUploadedVideoSummary(source as Blob, fileName)
          : await generateVideoSummary(summaryUrl)
      onSummaryGenerated?.(result)
      onVideoLoaded(source, duration, fileName, sourceType, originalSource)
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to summarize this video.'
      setSummaryError(message)
      onSummaryFailed?.(message)
      onVideoLoaded(source, duration, fileName, sourceType, originalSource)
      onClose()
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleGenerateThumbnail = async () => {
    const prompt = thumbnailPrompt.trim()
    if (prompt.length < 8) {
      setThumbnailError('Please describe the thumbnail with at least 8 characters.')
      return
    }

    setThumbnailError(null)
    setThumbnailImage(null)
    setIsGeneratingThumbnail(true)
    try {
      const result = await generateAiThumbnail(prompt)
      setThumbnailImage(result.image.dataUrl)
    } catch (error) {
      setThumbnailError(error instanceof Error ? error.message : 'Failed to generate thumbnail image.')
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }

  const handleDownloadThumbnail = () => {
    if (!thumbnailImage) return

    const link = document.createElement('a')
    link.href = thumbnailImage
    link.download = `ai-thumbnail-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#e9f1e8]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a] shadow-[0_30px_120px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#172033] p-5">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
              <Icon size={22} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Start {tool.label}</p>
              <h3 className="mt-1 text-2xl font-black text-white">
                {isThumbnailTool ? 'Generate thumbnail from prompt' : 'Upload video or paste URL'}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-200/80">{tool.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-[#172033] px-3 py-2 text-sm font-black text-emerald-200 hover:border-[#22a653]/50 hover:text-emerald-100"
          >
            Close
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-5">
          {isThumbnailTool ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-[#172033] p-4 text-sm leading-6 text-emerald-200">
                Describe the thumbnail you want. The generator will act like a professional photographer and editor, create a high-quality 16:9 image, and avoid unrelated details.
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-white">Thumbnail prompt</label>
                <textarea
                  value={thumbnailPrompt}
                  onChange={(event) => setThumbnailPrompt(event.target.value)}
                  placeholder="Example: A cinematic tech YouTube thumbnail showing a focused creator at a desk, dramatic blue-orange lighting, clean background, high contrast, premium camera look, no text."
                  className="min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-[#111827] p-4 text-sm leading-6 text-white outline-none transition focus:border-emerald-400/60"
                  disabled={isGeneratingThumbnail}
                />
                <p className="text-xs text-emerald-200/60">
                  Include subject, mood, lighting, camera style, background, colors, and whether text should appear.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateThumbnail}
                disabled={isGeneratingThumbnail || thumbnailPrompt.trim().length < 8}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-3 text-sm font-black text-white shadow-[0_16px_40px_rgba(21,128,61,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingThumbnail ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {isGeneratingThumbnail ? 'Generating high-quality thumbnail...' : 'Generate Thumbnail'}
              </button>

              {thumbnailError && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                  {thumbnailError}
                </div>
              )}

              {thumbnailImage && (
                <div className="rounded-3xl border border-white/10 bg-[#172033]/80 p-4">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <img
                      src={thumbnailImage}
                      alt="Generated AI thumbnail"
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleDownloadThumbnail}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-400"
                    >
                      <Download className="h-4 w-4" />
                      Download Image
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-2xl border border-white/10 bg-[#111827] px-5 py-3 text-sm font-black text-emerald-100 transition hover:border-emerald-400/50 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-white/10 bg-[#172033] p-4 text-sm leading-6 text-emerald-200">
                {isSummaryTool
                  ? 'Paste a supported video URL to load it into the editor and generate a summary, key points, and chapters from the transcript.'
                  : isSubtitleTool
                    ? 'Choose a local video or paste a supported URL. The editor will transcribe the video and create editable timestamped subtitles.'
                    : isTranscriptTool
                      ? 'Choose a local video or paste a supported URL. The editor will transcribe the full spoken audio and show it as searchable text.'
                      : isAiClippingTool
                        ? 'Paste a supported video URL. AI will analyze the transcript and create ready-to-add clip candidates.'
                      : isFindMomentsTool
                        ? 'Paste a supported video URL. AI will analyze the transcript and return viral moments with timestamps and reasons.'
                      : isReframeTool
                        ? 'Choose a video or paste a supported URL. The editor will open reframing controls for vertical, horizontal, square, and fit/crop modes.'
                    : 'Choose a local video file or paste a supported URL. Once it loads, the source is placed into the editor and this modal closes.'}
              </div>
              <VideoUpload
                onVideoLoaded={handleVideoLoaded}
                onDurationResolved={onDurationResolved}
              />

              {(isAiClippingTool || isFindMomentsTool || isSummaryTool || isSubtitleTool || isTranscriptTool) && (
                <div className="mt-5 rounded-3xl border border-white/10 bg-[#172033]/80 p-4 text-left">
                  {isGeneratingAiClips && (
                    <div className="flex items-center gap-3 text-sm font-bold text-emerald-100">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                      Generating AI clip candidates...
                    </div>
                  )}

                  {isFindingMoments && (
                    <div className="flex items-center gap-3 text-sm font-bold text-emerald-100">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                      Finding viral moments and clip candidates...
                    </div>
                  )}

                  {isSummarizing && (
                    <div className="flex items-center gap-3 text-sm font-bold text-emerald-100">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                      Generating video summary from transcript and key moments...
                    </div>
                  )}

                  {isGeneratingSubtitles && (
                    <div className="flex items-center gap-3 text-sm font-bold text-emerald-100">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                      Generating editable subtitles from the video transcript...
                    </div>
                  )}

                  {isGeneratingTranscript && (
                    <div className="flex items-center gap-3 text-sm font-bold text-emerald-100">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                      Generating full video transcript...
                    </div>
                  )}

                  {summaryError && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                      {summaryError}
                    </div>
                  )}

                  {subtitleError && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                      {subtitleError}
                    </div>
                  )}

                  {transcriptError && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                      {transcriptError}
                    </div>
                  )}

                  {momentsError && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                      {momentsError}
                    </div>
                  )}

                  {aiClipsError && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                      {aiClipsError}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
