'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProfile, logout } from '@/lib/api'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/editor', label: 'Editor' },
  { href: '/auth/profile', label: 'Profile' },
  { href: '/billing', label: 'Billing' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <aside className="sticky top-4 h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 p-5 shadow-xl">
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
        <p className="mt-1 text-xs text-slate-300">Use the sidebar to switch between dashboard, editor, and billing pages quickly.</p>
      </div>

      <button
        onClick={handleLogout}
        className="mt-4 w-full rounded-lg border border-slate-700 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
      >
        Logout
      </button>
    </aside>
  )
}
