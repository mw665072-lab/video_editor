'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { PageShell } from '@/components/layout/PageShell'

const VisualEditor = dynamic(() => import('@/components/VisualEditor'), {
  loading: () => (
    <div
      className="min-h-screen p-6 lg:p-8 flex items-center justify-center"
      style={{
        backgroundColor: '#05070C',
        backgroundImage:
          'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.13) 0%, transparent 65%), repeating-linear-gradient(0deg, rgba(249,115,22,0.06) 0px, rgba(249,115,22,0.06) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(249,115,22,0.06) 0px, rgba(249,115,22,0.06) 1px, transparent 1px, transparent 48px)',
      }}
    >
      <Spinner />
    </div>
  ),
  ssr: false,
})

export default function VisualEditorPage() {
  const [isAuthorized] = useState(true)
  const [loading] = useState(false)

  // Login requirement is temporarily disabled for public MVP access.
  // Restore this block later when auth gating is needed again.
  // useEffect(() => {
  //   getProfile()
  //     .then(() => setIsAuthorized(true))
  //     .catch(() => router.replace('/auth/login'))
  //     .finally(() => setLoading(false))
  // }, [router])

  if (loading) {
    return (
      <main
        className="min-h-screen p-6 lg:p-8 flex items-center justify-center"
        style={{
          backgroundColor: '#05070C',
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.13) 0%, transparent 65%), repeating-linear-gradient(0deg, rgba(249,115,22,0.06) 0px, rgba(249,115,22,0.06) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(249,115,22,0.06) 0px, rgba(249,115,22,0.06) 1px, transparent 1px, transparent 48px)',
        }}
      >
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
        <div className="h-[calc(100svh-10rem)] min-h-[640px] overflow-hidden rounded-2xl border border-slate-800 shadow-[0_20px_45px_rgba(3,17,37,.55)] backdrop-blur-xl sm:min-h-[680px] sm:rounded-3xl lg:h-[calc(100svh-8rem)] xl:h-[calc(100svh-7rem)]">
          <VisualEditor />
        </div>
        <Toaster position="top-right" />
      </PageShell>
    </ErrorBoundary>
  )
}
