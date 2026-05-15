'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { PageShell } from '@/components/layout/PageShell'
import { getProfile, hlsCleanup, hlsHeartbeat } from '@/lib/api'

const VideoEditor = dynamic(() => import('@/components/videoeditor/VideoEditor').then(mod => ({ default: mod.VideoEditor })), {
  loading: () => (
    <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center" style={{ backgroundColor: '#12072f', backgroundImage: 'radial-gradient(circle at top, rgba(145,85,255,0.18), transparent 42%), radial-gradient(circle at 10% 20%, rgba(255,179,44,0.08), transparent 28%)' }}>
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
      <main className="min-h-screen p-6 lg:p-8 flex items-center justify-center" style={{ backgroundColor: '#12072f', backgroundImage: 'radial-gradient(circle at top, rgba(145,85,255,0.18), transparent 42%), radial-gradient(circle at 10% 20%, rgba(255,179,44,0.08), transparent 28%)' }}>
        <Spinner />
      </main>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <ErrorBoundary>
      <PageShell title="" subtitle="">
        <div className="h-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_45px_rgba(70,55,160,0.24)] backdrop-blur-xl">
          <VideoEditor />
        </div>
        <Toaster position="top-right" />
      </PageShell>
    </ErrorBoundary>
  )
}
