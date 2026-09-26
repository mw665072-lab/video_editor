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
      className="min-h-screen text-foreground"
      style={{
        backgroundColor: '#f6f7fb',
        backgroundImage: `radial-gradient(ellipse at 30% 0%, rgba(21,128,61,0.10) 0%, transparent 54%),
          radial-gradient(circle at 100% 16%, rgba(21,128,61,0.08) 0%, transparent 26%),
          linear-gradient(rgba(23,32,51,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(23,32,51,0.025) 1px, transparent 1px)`,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Fixed sidebar for desktop */}
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-screen border-r transition-[width] duration-300 ease-out lg:block ${
          sidebarCollapsed ? 'w-[92px]' : 'w-[260px]'
        }`}
        style={{ borderColor: '#e3e6ed', background: 'rgba(255,255,255,0.76)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
      >
        <div className="flex h-full flex-col ">
          <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} />
        </div>
      </aside>

      {/* Mobile / tablet sidebar */}
      <div className="border-b lg:hidden" style={{ background: 'rgba(255,255,255,0.86)', borderColor: '#e3e6ed', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
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

          <section className={`${hasHeader ? 'mt-6' : ''} flex-1 min-h-[calc(100vh-7rem)] overflow-hidden rounded-[1.5rem] border p-5`} style={{ background: 'rgba(255,255,255,0.88)', borderColor: '#e2e6ee', boxShadow: '0 20px 60px rgba(38,49,72,0.10)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }}>
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}
