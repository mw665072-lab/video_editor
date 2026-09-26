'use client'

import { ReactNode } from 'react'

interface GlobalHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function GlobalHeader({ title, subtitle, actions }: GlobalHeaderProps) {
  return (
    <header className="rounded-[1.5rem] border p-5"
     style={{
            background: 'rgba(255,255,255,0.88)',
            borderColor: '#e2e6ee',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 14px 44px rgba(38,49,72,0.09)',
          }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
