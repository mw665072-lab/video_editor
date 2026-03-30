'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { ClipVideoForm } from '@/components/ClipVideoForm'
import { Sidebar } from '@/components/Sidebar'
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
      <main className="min-h-screen px-3 py-6 lg:px-8 lg:py-10">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1340px] grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="order-1 lg:order-1">
            <Sidebar />
          </aside>

          <section className="order-2 bg-[#020617] lg:order-2 h-full overflow-hidden">
            <div className="h-full overflow-auto rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_20px_45px_rgba(3,17,37,.55)] backdrop-blur-xl">
              <VideoEditor />
            </div>
          </section>
        </div>
        <Toaster position="top-right" />
      </main>
    </ErrorBoundary>
  )
}
