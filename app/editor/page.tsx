'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { PageShell } from '@/components/layout/PageShell'
import { hlsCleanup, hlsHeartbeat } from '@/lib/api'

const VideoEditor = dynamic(() => import('@/components/videoeditor/VideoEditor').then(mod => ({ default: mod.VideoEditor })), {
  loading: () => (
    <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center" style={{ backgroundColor: '#f8f9fd', backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(88,66,237,0.08), transparent 45%)' }}>
      <Spinner />
    </div>
  ),
  ssr: false,
})

export default function EditorPage() {
  const [isAuthorized] = useState(true)
  const [loading] = useState(false)

  // Cleanup HLS temp storage on unmount / page leave
  const cleanup = useCallback(() => {
    hlsCleanup().catch(() => {})
  }, [])

  // Login requirement is temporarily disabled for public MVP access.
  // Restore this block later when auth gating is needed again.
  // useEffect(() => {
  //   getProfile()
  //     .then(() => setIsAuthorized(true))
  //     .catch(() => router.replace('/auth/login'))
  //     .finally(() => setLoading(false))
  // }, [router])

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
      <main className="min-h-screen p-6 lg:p-8 flex items-center justify-center" style={{ backgroundColor: '#f8f9fd', backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(88,66,237,0.08) 0%, transparent 65%)' }}>
        <Spinner />
      </main>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <ErrorBoundary>
      <PageShell title="" subtitle="" bare>
        <VideoEditor />
        <Toaster position="top-right" />
      </PageShell>
    </ErrorBoundary>
  )
}
