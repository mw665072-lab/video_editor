'use client'

import { ReactNode } from 'react'

interface GlobalHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function GlobalHeader({ title, subtitle, actions }: GlobalHeaderProps) {
  return (
    <header className="rounded-[2rem] border p-5 shadow-xl"
     style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
            borderColor: 'rgba(255,255,255,0.14)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 24px 70px rgba(12,2,32,0.24)',
          }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{title}</h1>
          {subtitle && <p className="mt-1 text-sm" style={{ color: 'rgba(248,247,255,0.72)' }}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
