'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { ClipVideoForm } from '@/components/ClipVideoForm'
import { PageShell } from '@/components/PageShell'
import { getProfile, hlsCleanup, hlsHeartbeat } from '@/lib/api'

const VideoEditor = dynamic(() => import('@/components/VideoEditor').then(mod => ({ default: mod.VideoEditor })), {
  loading: () => (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-8 flex items-center justify-center">
      <Spinner />
    </div>
  ),
  ssr: false,
})

export default function EditorPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  // Cleanup HLS temp storage on unmount / page leave
  const cleanup = useCallback(() => {
    hlsCleanup().catch(() => {})
  }, [])

  useEffect(() => {
    getProfile()
      .then(() => setIsAuthorized(true))
      .catch(() => router.replace('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

  // Heartbeat to keep user's HLS session alive + cleanup on leave
  useEffect(() => {
    if (!isAuthorized) return

    // Send heartbeat every 2 minutes
    const heartbeatInterval = setInterval(() => {
      hlsHeartbeat()
    }, 2 * 60 * 1000)

    // Cleanup only on actual page unload (tab close, navigation away)
    // Do NOT clean on visibilitychange — switching tabs or opening DevTools
    // would kill active HLS jobs the player is still using.
    const handleBeforeUnload = () => {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('clipai_access_token') : null
      if (token) {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hls-clean`
        fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          keepalive: true,
        }).catch(() => {})
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      cleanup()
    }
  }, [isAuthorized, cleanup])

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-6 lg:p-8 flex items-center justify-center">
        <Spinner />
      </main>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <ErrorBoundary>
      <PageShell title="Video Editor" subtitle="Create, trim, and export video clips">
        <div className="h-full overflow-hidden rounded-3xl border border-slate-800  shadow-[0_20px_45px_rgba(3,17,37,.55)] backdrop-blur-xl">
          <VideoEditor />
        </div>
        <Toaster position="top-right" />
      </PageShell>
    </ErrorBoundary>
  )
}
