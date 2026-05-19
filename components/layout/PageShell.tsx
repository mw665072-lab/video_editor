'use client'

import { ReactNode, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { GlobalHeader } from '../global/GlobalHeader'

interface PageShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  const hasHeader = Boolean(title || subtitle || actions)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <main
      className="min-h-screen text-white"
      style={{
        backgroundColor: '#12072f',
        backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(145,85,255,0.42) 0%, transparent 62%),
          radial-gradient(circle at 100% 20%, rgba(255,179,44,0.18) 0%, transparent 28%),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 48px),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 48px)`,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Fixed sidebar for desktop */}
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-screen border-r transition-[width] duration-300 ease-out lg:block ${
          sidebarCollapsed ? 'w-[92px]' : 'w-[260px]'
        }`}
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(20, 9, 50, 0.32)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
      >
        <div className="flex h-full flex-col ">
          <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} />
        </div>
      </aside>

      {/* Mobile / tablet sidebar */}
      <div className="lg:hidden border-b" style={{ background: 'rgba(20, 9, 50, 0.6)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
        <div className="p-4">
          <Sidebar />
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`transition-[margin] duration-300 ease-out ${sidebarCollapsed ? 'lg:ml-[92px]' : 'lg:ml-[260px]'}`}>
        <div className={`mx-auto w-full p-4 transition-[max-width,padding] duration-300 ease-out sm:p-6 md:p-8 ${
          sidebarCollapsed ? 'max-w-none lg:px-5 xl:px-6' : 'max-w-[1600px]'
        }`}>
          {hasHeader && <GlobalHeader title={title} subtitle={subtitle} actions={actions} />}

          <section className={`${hasHeader ? 'mt-6' : ''} flex-1 min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border p-5 shadow-xl`} style={{ background: 'rgba(16, 8, 44, 0.48)', borderColor: 'rgba(255,255,255,0.12)', boxShadow: '0 28px 80px rgba(12, 2, 32, 0.32)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }}>
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}
