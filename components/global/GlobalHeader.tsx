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
            background: '#ffffff',
            borderColor: '#e4e6f2',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 10px 30px rgba(88,66,237,0.04)',
          }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#110d2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[#5e6578]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
