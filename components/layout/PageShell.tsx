'use client'

import { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { GlobalHeader } from '../global/GlobalHeader'

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
      }}
    >
      {/* Fixed sidebar for desktop */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[260px] border-r border-slate-800   lg:block">
        <div className="h-full overflow-y-auto p-4">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile / tablet sidebar */}
      <div className="lg:hidden bg-[#05070C] border-b border-slate-800">
        <div className="p-4">
          <Sidebar />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:ml-[260px]">
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 md:p-8">
          <GlobalHeader title={title} subtitle={subtitle} actions={actions} />

          <section className="mt-6 flex-1 min-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-slate-800 p-5 shadow-xl">
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}