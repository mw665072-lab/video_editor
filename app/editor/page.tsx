'use client'

import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { ClipVideoForm } from '@/components/ClipVideoForm'

const VideoEditor = dynamic(() => import('@/components/VideoEditor').then(mod => ({ default: mod.VideoEditor })), {
  loading: () => (
    <div className="min-h-screen bg-background p-6 lg:p-8 flex items-center justify-center">
      <Spinner />
    </div>
  ),
  ssr: false,
})

export default function EditorPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen px-4 py-6 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-[1340px] space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_20px_45px_rgba(3,17,37,.55)] backdrop-blur-xl">
            <VideoEditor />
          </div>
        </div>
        <Toaster position="top-right" />
      </main>
    </ErrorBoundary>
  )
}
