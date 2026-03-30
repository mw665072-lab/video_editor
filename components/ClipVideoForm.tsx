'use client'

import { useState, useMemo } from 'react'
import { clipVideo } from '@/lib/api'

export function ClipVideoForm() {
  const [url, setUrl] = useState('')
  const [startTime, setStartTime] = useState('0')
  const [endTime, setEndTime] = useState('10')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clipUrl, setClipUrl] = useState<string | null>(null)

  const canSubmit = url.trim() !== '' && Number(endTime) > Number(startTime)

  const fileName = useMemo(() => {
    const safe = url.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    return `${safe || 'clip'}.mp4`
  }, [url])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    setClipUrl(null)

    try {
      const blob = await clipVideo({
        url: url.trim(),
        startTime: Number(startTime),
        endTime: Number(endTime),
      })

      const objectUrl = URL.createObjectURL(blob)
      setClipUrl(objectUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border border-slate-700 bg-slate-900/70">
      <h2 className="text-lg font-semibold text-white">Clip Video via Backend API</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          required
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            step="0.1"
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <input
            type="number"
            min="0"
            step="0.1"
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? 'Processing...' : 'Clip Video'}
        </button>
      </form>

      {error && <div className="text-sm text-red-400">Error: {error}</div>}

      {clipUrl && (
        <div className="space-y-2">
          <video src={clipUrl} controls className="w-full rounded-lg border border-slate-600" />
          <a
            href={clipUrl}
            download={fileName}
            className="block rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white"
          >
            Download Clipped Video
          </a>
        </div>
      )}
    </div>
  )
}
