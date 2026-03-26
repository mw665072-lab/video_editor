'use client'

import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { Spinner } from '@/components/ui/spinner'

const VideoEditor = dynamic(() => import('@/components/VideoEditor').then(mod => ({ default: mod.VideoEditor })), {
  loading: () => (
    <div className="min-h-screen bg-background p-6 lg:p-8 flex items-center justify-center">
      <Spinner />
    </div>
  ),
  ssr: false,
})

export default function Home() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-background p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <VideoEditor />
        </div>
        <Toaster position="top-right" />
      </main>
    </ErrorBoundary>
  )
}
