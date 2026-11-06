'use client'

import { ReactNode, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { GlobalHeader } from '../global/GlobalHeader'

interface PageShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  bare?: boolean
}

export function PageShell({ title, subtitle, actions, children, bare = false }: PageShellProps) {
  const hasHeader = Boolean(title || subtitle || actions)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <main
      className="min-h-screen text-foreground"
      style={{
        backgroundColor: '#f8f9fd',
        backgroundImage: `radial-gradient(ellipse at 30% 0%, rgba(88,66,237,0.08) 0%, transparent 54%),
          radial-gradient(circle at 100% 16%, rgba(139,92,246,0.07) 0%, transparent 26%),
          linear-gradient(rgba(88,66,237,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(88,66,237,0.02) 1px, transparent 1px)`,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Fixed sidebar for desktop */}
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-screen border-r transition-[width] duration-300 ease-out lg:block ${
          sidebarCollapsed ? 'w-[92px]' : 'w-[260px]'
        }`}
        style={{ borderColor: '#e4e6f2', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="flex h-full flex-col ">
          <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} />
        </div>
      </aside>

      {/* Mobile / tablet sidebar */}
      <div className="border-b lg:hidden" style={{ background: 'rgba(255,255,255,0.95)', borderColor: '#e4e6f2', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
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

          {bare ? (
            <div className={`${hasHeader ? 'mt-6' : ''} flex-1 min-h-[calc(100vh-7rem)]`}>
              {children}
            </div>
          ) : (
            <section className={`${hasHeader ? 'mt-6' : ''} flex-1 min-h-[calc(100vh-7rem)] overflow-hidden rounded-[1.5rem] border p-5`} style={{ background: '#ffffff', borderColor: '#e4e6f2', boxShadow: '0 16px 48px rgba(88,66,237,0.05)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }}>
              {children}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
