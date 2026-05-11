'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProfile, logout } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'
import { User, Mail, Video, Download, Zap, LogOut, Scissors, CreditCard } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data.user?.role === 'ADMIN' || data.user?.isAdmin) {
          window.location.href = '/admin'
          return
        }
        setUser(data.user)
      })
      .catch((err) => setError(err.message))
  }, [])

  const onLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  const clipsLimit = user ? (user.subscriptionPlan === 'FREE' ? 5 : user.subscriptionPlan === 'BASIC' ? 500 : 700) : 5
  const downloadsLimit = clipsLimit

  const clipsProgress = user ? Math.min((user.clipsThisMonth / clipsLimit) * 100, 100) : 0
  const downloadsProgress = user ? Math.min((user.downloadsThisMonth / downloadsLimit) * 100, 100) : 0

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #2d1800 0%, #0d0905 55%, #080604 100%)',
      }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fa6a00 1px, transparent 1px), linear-gradient(90deg, #fa6a00 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute top-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full blur-[120px] opacity-20"
        style={{ background: '#fa6a00' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-80px] right-[-80px] w-[280px] h-[280px] rounded-full blur-[120px] opacity-10"
        style={{ background: '#e84d00' }}
      />

      <div className="relative z-10">
        <PageShell
          title="Dashboard"
          subtitle="Overview of your account & activity"
          actions={
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200"
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
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          }
        >
          {error && (
            <div
              className="mb-6 rounded-2xl p-4 text-sm"
              style={{
                background: '#1a0808',
                border: '1px solid #3a1010',
                color: '#e07070',
              }}
            >
              {error}
            </div>
          )}

          {user ? (
            <>
              {/* ── Cards row ─────────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Profile card */}
                <div
                  className="rounded-2xl p-5 transition-all duration-200"
                  style={{
                    background: '#13100c',
                    border: '1px solid #2a1a08',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-5 pb-4" style={{ borderBottom: '1px solid #2a1a08' }}>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(250,106,0,0.15)', border: '1px solid rgba(250,106,0,0.2)' }}
                    >
                      <User className="w-3.5 h-3.5" style={{ color: '#fa6a00' }} />
                    </div>
                    <h3 className="font-bold text-white/90 text-sm tracking-wide uppercase">Profile</h3>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        boxShadow: '0 2px 12px rgba(250,106,0,0.35)',
                      }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white">{user.name}</p>
                      <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: '#6b4e2e' }}>
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid #2a1a08' }}>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" >Status</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade80' }}
                        />
                        <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Active</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" >Plan</p>
                      <p
                        className="text-sm font-black"
                        style={{ color: '#fa6a00' }}
                      >
                        {user.subscriptionPlan}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clips card */}
                <div
                  className="rounded-2xl p-5 transition-all duration-200"
                  style={{
                    background: '#13100c',
                    border: '1px solid #2a1a08',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-5 pb-4" style={{ borderBottom: '1px solid #2a1a08' }}>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(250,106,0,0.15)', border: '1px solid rgba(250,106,0,0.2)' }}
                    >
                      <Video className="w-3.5 h-3.5" style={{ color: '#fa6a00' }} />
                    </div>
                    <h3 className="font-bold text-white/90 text-sm tracking-wide uppercase">Clips Created</h3>
                  </div>

                  <p className="text-5xl font-black text-white mb-1 leading-none">
                    {user.clipsThisMonth}
                  </p>
                  <p className="text-sm mb-5" 
                  >
                    of <span className="font-bold" style={{ color: '#7a5030' }}>{clipsLimit}</span> this month
                  </p>

                  {/* Progress bar */}
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: '#1a100a' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${clipsProgress}%`,
                        background: 'linear-gradient(90deg, #fa6a00 0%, #e84d00 100%)',
                        boxShadow: '0 0 8px rgba(250,106,0,0.5)',
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2 text-right font-semibold" 
                  >
                    {Math.round(clipsProgress)}% used
                  </p>
                </div>

                {/* Downloads card */}
                <div
                  className="rounded-2xl p-5 transition-all duration-200"
                  style={{
                    background: '#13100c',
                    border: '1px solid #2a1a08',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-4 pb-4" style={{ borderBottom: '1px solid #2a1a08' }}>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(250,106,0,0.15)', border: '1px solid rgba(250,106,0,0.2)' }}
                    >
                      <Download className="w-3.5 h-3.5" style={{ color: '#fa6a00' }} />
                    </div>
                    <h3 className="font-bold text-white/90 text-sm tracking-wide uppercase">Downloads</h3>
                  </div>

                  {/* Circular progress */}
                  <div className="flex justify-center my-3">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" stroke="#1a100a" strokeWidth="10" fill="none" />
                        <circle
                          cx="60"
                          cy="60"
                          r="52"
                          stroke="url(#orangeGrad)"
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={`${downloadsProgress * 3.27} 327`}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#fa6a00" />
                            <stop offset="100%" stopColor="#e84d00" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-black text-white leading-none">{user.downloadsThisMonth}</p>
                        <p className="text-xs mt-0.5 font-semibold" 
                        >/ {downloadsLimit}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-center font-semibold" 
                  >
                    {Math.round(downloadsProgress)}% of limit used
                  </p>
                </div>
              </div>

              {/* ── Quick Actions ─────────────────────────────────────── */}
              <div
                className="mt-6 rounded-2xl p-6"
                style={{
                  background: '#13100c',
                  border: '1px solid #2a1a08',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center gap-2.5 mb-5 pb-4" style={{ borderBottom: '1px solid #2a1a08' }}>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(250,106,0,0.15)', border: '1px solid rgba(250,106,0,0.2)' }}
                  >
                    <Zap className="w-3.5 h-3.5" style={{ color: '#fa6a00' }} />
                  </div>
                  <h3 className="font-bold text-white/90 text-sm tracking-wide uppercase">Quick Actions</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Open Editor */}
                  <Link
                    href="/editor"
                    className="group flex items-center gap-4 rounded-xl p-5 transition-all duration-200"
                    style={{
                      background: '#0d0905',
                      border: '1px solid #2a1a08',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(250,106,0,0.4)'
                      e.currentTarget.style.background = 'rgba(250,106,0,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a1a08'
                      e.currentTarget.style.background = '#0d0905'
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                      style={{
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        boxShadow: '0 2px 12px rgba(250,106,0,0.35)',
                      }}
                    >
                      <Scissors className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Open Editor</p>
                      <p className="text-xs mt-0.5" 
                      >Create a new clip</p>
                    </div>
                    <span className="ml-auto text-lg" >→</span>
                  </Link>

                  {/* Manage Billing */}
                  <Link
                    href="/billing"
                    className="group flex items-center gap-4 rounded-xl p-5 transition-all duration-200"
                    style={{
                      background: '#0d0905',
                      border: '1px solid #2a1a08',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(250,106,0,0.4)'
                      e.currentTarget.style.background = 'rgba(250,106,0,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a1a08'
                      e.currentTarget.style.background = '#0d0905'
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: '#1a100a',
                        border: '1px solid #3a2210',
                      }}
                    >
                      <CreditCard className="w-5 h-5" style={{ color: '#fa6a00' }} />
                    </div>
                    <div>
                      <p className="font-bold text-white">Manage Billing</p>
                      <p className="text-xs mt-0.5" 
                      >Upgrade your plan</p>
                    </div>
                    <span className="ml-auto text-lg" >→</span>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center gap-4">
              {/* Loading spinner */}
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#fa6a00', borderTopColor: 'transparent' }}
              />
              <p className="text-sm font-semibold" 
              >Loading your dashboard…</p>
            </div>
          )}
        </PageShell>
      </div>
    </div>
  )
}
