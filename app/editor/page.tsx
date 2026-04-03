'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { ClipVideoForm } from '@/components/ClipVideoForm'
import { PageShell } from '@/components/PageShell'
import { getProfile } from '@/lib/api'

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

  useEffect(() => {
    getProfile()
      .then(() => setIsAuthorized(true))
      .catch(() => router.replace('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

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
        <div className="h-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_20px_45px_rgba(3,17,37,.55)] backdrop-blur-xl">
          <VideoEditor />
        </div>
        <Toaster position="top-right" />
      </PageShell>
    </ErrorBoundary>
  )
}
