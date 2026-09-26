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
        backgroundColor: '#f6f7fb',
        backgroundImage:
          'radial-gradient(ellipse at 50% 0%, rgba(21,128,61,0.13) 0%, transparent 65%), repeating-linear-gradient(0deg, rgba(21,128,61,0.06) 0px, rgba(21,128,61,0.06) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(21,128,61,0.06) 0px, rgba(21,128,61,0.06) 1px, transparent 1px, transparent 48px)',
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
          backgroundColor: '#f6f7fb',
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(21,128,61,0.13) 0%, transparent 65%), repeating-linear-gradient(0deg, rgba(21,128,61,0.06) 0px, rgba(21,128,61,0.06) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(21,128,61,0.06) 0px, rgba(21,128,61,0.06) 1px, transparent 1px, transparent 48px)',
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
        <div className="h-[calc(100svh-10rem)] min-h-[640px] overflow-hidden rounded-2xl border border-[#dce5dc] bg-white shadow-[0_22px_60px_rgba(31,52,36,0.12)] sm:min-h-[680px] sm:rounded-3xl lg:h-[calc(100svh-8rem)] xl:h-[calc(100svh-7rem)]">
          <VisualEditor />
        </div>
        <Toaster position="top-right" />
      </PageShell>
    </ErrorBoundary>
  )
}
