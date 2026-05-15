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
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  const availableProviders = aiProviders.filter(p => p.available)

  if (availableProviders.length === 0) {
    return (
      <Card className="border-purple-500/30 bg-purple-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-300 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-100">AI Service Not Configured</p>
              <p className="text-xs text-purple-100/70 mt-1">
                Clip suggestions require OpenAI, Anthropic, or Gemini API key to be configured on the backend.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-[#100a2f]/90 p-4 text-white shadow-[0_16px_60px_rgba(38,24,103,0.45)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-slate-100">AI Clip Suggestions</h3>
        </div>
        {hasAnalyzed && (
          <Badge variant="secondary" className="text-xs">
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
            "text-xs",
            selectedProvider === 'auto' && "bg-purple-600 hover:bg-purple-700"
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
              "text-xs",
              selectedProvider === provider.id && "bg-purple-600 hover:bg-purple-700",
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
        className="w-full bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-500 hover:to-violet-400 text-white"
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
          <p className="text-xs text-slate-400 text-center">
            Extracting audio and transcribing speech...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-purple-500/30 bg-purple-500/10">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-purple-300 mt-0.5" />
              <p className="text-sm text-purple-100">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AI analyzed and found these viral moments:</span>
            {processingTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.round(processingTime / 1000)}s
              </span>
            )}
          </div>

          {suggestions.map((clip, index) => (
            <Card 
              key={index} 
              className="border-white/10 bg-[#12072f]/80 hover:border-purple-500/50 transition-colors"
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  {/* Header with rank and confidence */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          getConfidenceColor(clip.confidence),
                          "text-white"
                        )}
                      >
                        {getConfidenceLabel(clip.confidence)} Match
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatTime(clip.duration)}
                    </span>
                  </div>

                  {/* Time range */}
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="font-mono">
                      {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                    </span>
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-purple-100/70 line-clamp-2">
                    {clip.reason}
                  </p>

                  {/* Transcript preview */}
                  {clip.transcriptSegment && (
                    <p className="text-xs text-purple-100/70 italic line-clamp-2 border-l-2 border-purple-500/20 pl-2">
                      &ldquo;{clip.transcriptSegment}&rdquo;
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs border-slate-600 hover:bg-slate-800"
                      onClick={() => onClipPreview?.(clip.startTime)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700"
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
      <p className="text-xs text-purple-200/70 text-center">
        AI analyzes speech, identifies hooks, emotional peaks, and viral moments
      </p>
    </div>
  )
}
