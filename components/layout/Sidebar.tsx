'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProfile, logout } from '@/lib/api'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard, Scissors, Layers, User, CreditCard, LogOut, Zap } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/editor', label: 'Clip Editor', icon: Scissors },
  { href: '/visual-editor', label: 'Visual Editor', icon: Layers },
  { href: '/auth/profile', label: 'Profile', icon: User },
  { href: '/billing', label: 'Billing', icon: CreditCard },
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

      {/* ── Mobile top bar ──────────────────────────────────────────── */}
      <div
        className="md:hidden mb-3 rounded-2xl p-3"
        style={{
          background: '#13100c',
          border: '1px solid #2a1a08',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                boxShadow: '0 2px 10px rgba(250,106,0,0.35)',
              }}
            >
              U
            </span>
            <div>
              <p className="text-sm font-bold text-white/90">Workspace</p>
              <p className="text-[11px]" style={{ color: '#6b4e2e' }}>Tap menu</p>
            </div>
          </div>
          <button
            aria-label="Toggle sidebar"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg p-2 transition-colors"
            style={{
              background: '#1a100a',
              border: '1px solid #2a1a08',
              color: '#fa6a00',
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Sidebar panel ───────────────────────────────────────────── */}
      <aside
        className={`${mobileOpen ? 'block' : 'hidden'} md:block rounded-2xl p-5 shadow-xl`}
        style={{
          background: '#13100c',
          border: '1px solid #2a1a08',
          boxShadow: '0 4px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Workspace header */}
        <div className="mb-6 flex items-center gap-3 pb-5" style={{ borderBottom: '1px solid #2a1a08' }}>
          {/* Logo mark */}
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{
              background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
              boxShadow: '0 2px 12px rgba(250,106,0,0.35)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <polygon points="5,2 18,10 5,18" fill="white" />
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-black tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #ffffff 0%, #fa6a00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Your Workspace
            </p>
            <p className="text-xs font-medium" style={{ color: '#4a3020' }}>Quick access</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200"
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        color: 'white',
                        boxShadow: '0 2px 14px rgba(250,106,0,0.35)',
                      }
                    : {
                        color: '#6b4e2e',
                        background: 'transparent',
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#1a100a'
                    e.currentTarget.style.color = '#fa6a00'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#6b4e2e'
                  }
                }}
              >
                <Icon
                  size={16}
                  className="shrink-0"
                  style={{ opacity: isActive ? 1 : 0.7 }}
                />
                {item.label}
                {isActive && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.7)' }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Tips box */}
        <div
          className="mt-6 rounded-xl p-3.5"
          style={{
            background: '#0d0905',
            border: '1px solid #2a1a08',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={11} style={{ color: '#fa6a00' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#fa6a00' }}>
              Tips
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#4a3020' }}>
            Use <span className="font-semibold" style={{ color: '#7a5030' }}>Clip Editor</span> for trimming and exporting, or{' '}
            <span className="font-semibold" style={{ color: '#7a5030' }}>Visual Editor</span> for filters, audio, and captions.
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200"
          style={{
            background: '#1a0808',
            border: '1px solid #3a1010',
            color: '#c05050',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2a0c0c'
            e.currentTarget.style.color = '#e06060'
            e.currentTarget.style.borderColor = '#5a1818'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1a0808'
            e.currentTarget.style.color = '#c05050'
            e.currentTarget.style.borderColor = '#3a1010'
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </aside>
    </div>
  )
}