'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkles, 
  Play, 
  Plus, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Wand2,
  Clock,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { suggestClips, getAIProviders, SuggestedClip, AIProvider } from '@/lib/api'
import { formatTime } from '@/lib/videoUtils'
import { cn } from '@/lib/utils'

interface ClipSuggestionPanelProps {
  videoUrl: string
  onClipAdd: (startTime: number, endTime: number) => void
  onClipPreview?: (startTime: number) => void
}

export function ClipSuggestionPanel({ 
  videoUrl, 
  onClipAdd, 
  onClipPreview 
}: ClipSuggestionPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedClip[]>([])
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini' | 'anthropic' | 'auto'>('auto')
  const [error, setError] = useState<string | null>(null)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [processingTime, setProcessingTime] = useState<number>(0)

  useEffect(() => {
    loadAIProviders()
  }, [])

  const loadAIProviders = async () => {
    try {
      const response = await getAIProviders()
      setAiProviders(response.providers)
    } catch (err) {
      console.error('Failed to load AI providers:', err)
    }
  }

  const handleSuggestClips = async () => {
    if (!videoUrl) {
      toast.error('No video URL available')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuggestions([])

    try {
      const response = await suggestClips(videoUrl, selectedProvider)
      
      if (response.success && response.data.suggestions.length > 0) {
        setSuggestions(response.data.suggestions)
        setProcessingTime(response.data.processingTimeMs)
        setHasAnalyzed(true)
        toast.success(`Found ${response.data.suggestions.length} viral clip suggestions!`)
      } else {
        setError('No clips could be suggested for this video. It may not contain enough speech.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze video'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-[#5842ed]'
    if (confidence >= 0.6) return 'bg-violet-500'
    return 'bg-slate-500'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  const availableProviders = aiProviders.filter(p => p.available)

  if (availableProviders.length === 0) {
    return (
      <Card className="border-[#5842ed]/20 bg-[#f0eeff]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#5842ed] mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#110d2e]">AI Service Not Configured</p>
              <p className="text-xs text-[#5e6578] mt-1">
                Clip suggestions require OpenAI, Anthropic, or Gemini API key to be configured on the backend.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 rounded-3xl border border-[#e4e6f2] bg-white p-4 text-[#110d2e] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-[#5842ed]" />
          <h3 className="text-lg font-bold text-[#110d2e]">AI Clip Suggestions</h3>
        </div>
        {hasAnalyzed && (
          <Badge variant="secondary" className="text-xs bg-[#f0eeff] text-[#5842ed]">
            {suggestions.length} suggestions
          </Badge>
        )}
      </div>

      {/* AI Provider Selection */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={selectedProvider === 'auto' ? 'default' : 'outline'}
          onClick={() => setSelectedProvider('auto')}
          className={cn(
            "text-xs font-semibold",
            selectedProvider === 'auto' ? "bg-[#5842ed] text-white hover:bg-[#4730df]" : "border-[#e4e6f2] text-[#5e6578] hover:text-[#5842ed] hover:bg-[#f0eeff]"
          )}
        >
          Auto
        </Button>
        {aiProviders.map((provider) => (
          <Button
            key={provider.id}
            size="sm"
            variant={selectedProvider === provider.id ? 'default' : 'outline'}
            onClick={() => setSelectedProvider(provider.id)}
            disabled={!provider.available}
            className={cn(
              "text-xs font-semibold",
              selectedProvider === provider.id ? "bg-[#5842ed] text-white hover:bg-[#4730df]" : "border-[#e4e6f2] text-[#5e6578] hover:text-[#5842ed] hover:bg-[#f0eeff]",
              !provider.available && "opacity-50 cursor-not-allowed"
            )}
          >
            {provider.name}
          </Button>
        ))}
      </div>

      {/* Analyze Button */}
      <Button
        onClick={handleSuggestClips}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-[#5842ed] to-[#7c3aed] text-white font-semibold shadow-md shadow-[#5842ed]/25 hover:brightness-105"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing video with AI...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            {hasAnalyzed ? 'Re-analyze Video' : 'Suggest Viral Clips'}
          </>
        )}
      </Button>

      {/* Processing Info */}
      {isLoading && (
        <div className="space-y-2">
          <Progress value={undefined} className="h-1" />
          <p className="text-xs text-[#5e6578] text-center">
            Extracting audio and transcribing speech...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" />
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#5e6578]">
            <span>AI analyzed and found these viral moments:</span>
            {processingTime > 0 && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {Math.round(processingTime / 1000)}s
              </span>
            )}
          </div>

          {suggestions.map((clip, index) => (
            <Card 
              key={index} 
              className="border-[#e4e6f2] bg-[#f8f9fd] hover:border-[#5842ed]/50 transition-all hover:shadow-md"
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  {/* Header with rank and confidence */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#5842ed] text-xs font-bold text-white shadow-sm">
                        {index + 1}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs font-semibold",
                          getConfidenceColor(clip.confidence),
                          "text-white"
                        )}
                      >
                        {getConfidenceLabel(clip.confidence)} Match
                      </Badge>
                    </div>
                    <span className="text-xs font-mono font-medium text-[#5e6578]">
                      {formatTime(clip.duration)}
                    </span>
                  </div>

                  {/* Time range */}
                  <div className="flex items-center gap-2 text-sm text-[#110d2e]">
                    <Clock className="w-4 h-4 text-[#5842ed]" />
                    <span className="font-mono font-semibold">
                      {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                    </span>
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-[#5e6578] line-clamp-2">
                    {clip.reason}
                  </p>

                  {/* Transcript preview */}
                  {clip.transcriptSegment && (
                    <p className="text-xs text-[#5e6578] italic line-clamp-2 border-l-2 border-[#5842ed]/30 pl-2">
                      &ldquo;{clip.transcriptSegment}&rdquo;
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs border-[#e4e6f2] bg-white text-[#110d2e] hover:bg-[#f0eeff] hover:text-[#5842ed]"
                      onClick={() => onClipPreview?.(clip.startTime)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-[#5842ed] text-white hover:bg-[#4730df] font-semibold shadow-sm"
                      onClick={() => {
                        onClipAdd(clip.startTime, clip.endTime)
                        toast.success('Clip added to timeline!')
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Clip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info footer */}
      <p className="text-xs text-[#94a3b8] text-center">
        AI analyzes speech, identifies hooks, emotional peaks, and viral moments
      </p>
    </div>
  )
}
