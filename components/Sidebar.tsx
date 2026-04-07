'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProfile, logout } from '@/lib/api'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/editor', label: 'Clip Editor' },
  { href: '/visual-editor', label: 'Visual Editor' },
  { href: '/auth/profile', label: 'Profile' },
  { href: '/billing', label: 'Billing' },
]

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <div className="md:sticky md:top-4 md:h-full">
      <div className="md:hidden mb-3 rounded-2xl border border-slate-700 bg-slate-950/95 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">U</span>
            <div>
              <p className="text-sm font-semibold text-white">Workspace</p>
              <p className="text-[11px] text-slate-300">Tap menu</p>
            </div>
          </div>
          <button
            aria-label="Toggle sidebar"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-white"
          >
            {mobileOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      <aside className={`${mobileOpen ? 'block' : 'hidden'} md:block rounded-2xl border border-slate-700 bg-slate-950/95 p-5 shadow-xl`}>
        <div className="mb-8 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">U</span>
          <div>
            <p className="text-sm font-semibold text-white">Your workspace</p>
            <p className="text-xs text-slate-400">Quick access</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-wider text-slate-400">Tips</p>
          <p className="mt-1 text-xs text-slate-300">Use <strong>Clip Editor</strong> for trimming and exporting clips, or <strong>Visual Editor</strong> for filters, audio, and captions.</p>
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 w-full rounded-lg border border-slate-700 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
        >
          Logout
        </button>
      </aside>
    </div>
  )
}
