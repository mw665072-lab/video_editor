'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
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
        <section className="mt-6 rounded-3xl border border-[#2a2118] bg-[#13100c] p-5 text-white shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#fa6a00]">Blogs</p>
              <h2 className="mt-2 text-2xl font-black">Learn editing workflows while you build</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c07040]">
                Browse creator guides, platform updates, thumbnail ideas, caption tips, and production playbooks.
              </p>
            </div>
            <Link href="/blogs" className="rounded-2xl bg-[#fa6a00] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-[#fa6a00]/20">
              View all blogs
            </Link>
          </div>
        </section>
        <Toaster position="top-right" />
      </PageShell>
    </ErrorBoundary>
  )
}
