'use client'

import { ReactNode } from 'react'

interface GlobalHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function GlobalHeader({ title, subtitle, actions }: GlobalHeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-800  p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-300">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
