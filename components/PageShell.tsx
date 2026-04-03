'use client'

import { ReactNode } from 'react'
import { GlobalHeader } from '@/components/GlobalHeader'
import { Sidebar } from '@/components/Sidebar'

interface PageShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <main
      className="min-h-screen text-white"
      style={{
        backgroundColor: '#05070C',
        backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.13) 0%, transparent 65%),
          repeating-linear-gradient(0deg, rgba(249,115,22,0.06) 0px, rgba(249,115,22,0.06) 1px, transparent 1px, transparent 48px),
          repeating-linear-gradient(90deg, rgba(249,115,22,0.06) 0px, rgba(249,115,22,0.06) 1px, transparent 1px, transparent 48px)`,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%',
        backgroundAttachment: 'fixed',
        color: '#ffffff',
      }}
    >
      <div className="mx-auto grid min-h-screen w-full  gap-6 p-4 sm:p-6 md:p-8 lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-4 self-start h-[calc(100vh-2rem)] overflow-y-auto">
          <Sidebar />
        </aside>

        <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-6">
          <GlobalHeader title={title} subtitle={subtitle} actions={actions} />

          <section className="flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}
