'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { PageShell } from '@/components/layout/PageShell'
import { getProfile } from '@/lib/api'

const VisualEditor = dynamic(() => import('@/components/VisualEditor'), {
  loading: () => (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-8 flex items-center justify-center">
      <Spinner />
    </div>
  ),
  ssr: false,
})

export default function VisualEditorPage() {
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
      <PageShell title="Visual Video Editor" subtitle="Upload, edit, and enhance your videos with filters, audio controls, and captions">
        <div className="h-full overflow-hidden rounded-3xl border border-slate-800   shadow-[0_20px_45px_rgba(3,17,37,.55)] backdrop-blur-xl">
          <VisualEditor />
        </div>
        <Toaster position="top-right" />
      </PageShell>
    </ErrorBoundary>
  )
}
