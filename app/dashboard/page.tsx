'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProfile, logout } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'
import { User, Mail, Video, Download, Zap, LogOut, Scissors, CreditCard } from 'lucide-react'

type DashboardUser = {
  name: string
  email: string
  role?: string
  isAdmin?: boolean
  subscriptionPlan: 'FREE' | 'BASIC' | string
  clipsThisMonth: number
  downloadsThisMonth: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<DashboardUser | null>(null)
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
      .catch(() => {
        // Public MVP mode: let anonymous visitors explore the platform dashboard.
        setUser({
          name: 'Guest',
          email: 'guest@clipai.local',
          subscriptionPlan: 'FREE',
          clipsThisMonth: 0,
          downloadsThisMonth: 0,
        })
      })
  }, [])

  const onLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  const clipsLimit = user ? (user.subscriptionPlan === 'FREE' ? 150 : user.subscriptionPlan === 'BASIC' ? 500 : 700) : 150
  const downloadsLimit = clipsLimit

  const clipsProgress = user ? Math.min((user.clipsThisMonth / clipsLimit) * 100, 100) : 0
  const downloadsProgress = user ? Math.min((user.downloadsThisMonth / downloadsLimit) * 100, 100) : 0

  const isGuestUser = user?.email === 'guest@clipai.local' || user?.name === 'Guest'

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: 'transparent',
      }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(88,66,237,0.75) 1px, transparent 1px), linear-gradient(90deg, rgba(88,66,237,0.75) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute top-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full blur-[120px] opacity-20"
        style={{ background: '#7a44ff' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-80px] right-[-80px] w-[280px] h-[280px] rounded-full blur-[120px] opacity-15"
        style={{ background: '#5842ed' }}
      />

      <div className="relative z-10">
        <PageShell
          title="Dashboard"
          subtitle="Overview of your account & activity"
          actions={
            !isGuestUser ? (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200"
                style={{
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.22)',
                  color: '#ef4444',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.16)'
                  e.currentTarget.style.color = '#dc2626'
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.32)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.10)'
                  e.currentTarget.style.color = '#ef4444'
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.22)'
                }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : undefined
          }
        >
          {error && (
            <div
              className="mb-6 rounded-2xl p-4 text-sm"
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#b42336',
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
                    background: '#ffffff',
                    border: '1px solid #e4e6f2',
                    boxShadow: '0 10px 30px rgba(88,66,237,0.04)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-5 pb-4" style={{ borderBottom: '1px solid #e4e6f2' }}>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: '#f0eeff', border: '1px solid #ded7fb' }}
                    >
                      <User className="w-3.5 h-3.5" style={{ color: '#5842ed' }} />
                    </div>
                    <h3 className="font-bold text-[#110d2e] text-sm tracking-wide uppercase">Profile</h3>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #5842ed 0%, #4730df 100%)',
                        color: '#ffffff',
                        boxShadow: '0 8px 24px rgba(88,66,237,0.22)',
                      }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#110d2e]">{user.name}</p>
                      <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: '#5e6578' }}>
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid #e4e6f2' }}>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#8a92a6' }}>Status</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
                        />
                        <p className="text-sm font-semibold" style={{ color: '#10b981' }}>Active</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#8a92a6' }}>Plan</p>
                      <p
                        className="text-sm font-black"
                        style={{ color: '#5842ed' }}
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
                    background: '#ffffff',
                    border: '1px solid #e4e6f2',
                    boxShadow: '0 10px 30px rgba(88,66,237,0.04)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-5 pb-4" style={{ borderBottom: '1px solid #e4e6f2' }}>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: '#f0eeff', border: '1px solid #ded7fb' }}
                    >
                      <Video className="w-3.5 h-3.5" style={{ color: '#5842ed' }} />
                    </div>
                    <h3 className="font-bold text-[#110d2e] text-sm tracking-wide uppercase">Clips Created</h3>
                  </div>

                  <p className="text-5xl font-black text-[#110d2e] mb-1 leading-none">
                    {user.clipsThisMonth}
                  </p>
                  <p className="text-sm mb-5 text-[#5e6578]">
                    of <span className="font-bold" style={{ color: '#5842ed' }}>{clipsLimit}</span> this month
                  </p>

                  {/* Progress bar */}
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: '#f1f3f9' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${clipsProgress}%`,
                        background: 'linear-gradient(90deg, #5842ed 0%, #7c3aed 100%)',
                        boxShadow: '0 0 16px rgba(88,66,237,0.32)',
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2 text-right font-semibold" style={{ color: '#8a92a6' }}>
                    {Math.round(clipsProgress)}% used
                  </p>
                </div>

                {/* Downloads card */}
                <div
                  className="rounded-2xl p-5 transition-all duration-200"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e4e6f2',
                    boxShadow: '0 10px 30px rgba(88,66,237,0.04)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-4 pb-4" style={{ borderBottom: '1px solid #e4e6f2' }}>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: '#f0eeff', border: '1px solid #ded7fb' }}
                    >
                      <Download className="w-3.5 h-3.5" style={{ color: '#5842ed' }} />
                    </div>
                    <h3 className="font-bold text-[#110d2e] text-sm tracking-wide uppercase">Downloads</h3>
                  </div>

                  {/* Circular progress */}
                  <div className="flex justify-center my-3">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" stroke="#f1f3f9" strokeWidth="10" fill="none" />
                        <circle
                          cx="60"
                          cy="60"
                          r="52"
                          stroke="url(#purpleGrad)"
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={`${downloadsProgress * 3.27} 327`}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#5842ed" />
                            <stop offset="100%" stopColor="#7c3aed" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-black text-[#110d2e] leading-none">{user.downloadsThisMonth}</p>
                        <p className="text-xs mt-0.5 font-semibold" style={{ color: '#8a92a6' }}>/ {downloadsLimit}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-center font-semibold" style={{ color: '#8a92a6' }}>
                    {Math.round(downloadsProgress)}% of limit used
                  </p>
                </div>
              </div>

              {/* ── Quick Actions ─────────────────────────────────────── */}
              <div
                className="mt-6 rounded-2xl p-6"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e4e6f2',
                  boxShadow: '0 10px 30px rgba(88,66,237,0.04)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="flex items-center gap-2.5 mb-5 pb-4" style={{ borderBottom: '1px solid #e4e6f2' }}>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: '#f0eeff', border: '1px solid #ded7fb' }}
                  >
                    <Zap className="w-3.5 h-3.5" style={{ color: '#5842ed' }} />
                  </div>
                  <h3 className="font-bold text-[#110d2e] text-sm tracking-wide uppercase">Quick Actions</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Open Editor */}
                  <Link
                    href="/editor"
                    className="group flex items-center gap-4 rounded-xl p-5 transition-all duration-200"
                    style={{
                      background: '#fafbff',
                      border: '1px solid #e4e6f2',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#5842ed'
                      e.currentTarget.style.background = '#f0eeff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e4e6f2'
                      e.currentTarget.style.background = '#fafbff'
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                      style={{
                        background: 'linear-gradient(135deg, #5842ed 0%, #4730df 100%)',
                        boxShadow: '0 8px 22px rgba(88,66,237,0.25)',
                      }}
                    >
                      <Scissors className="w-5 h-5" style={{ color: '#ffffff' }} />
                    </div>
                    <div>
                      <p className="font-bold text-[#110d2e]">Open Editor</p>
                      <p className="text-xs mt-0.5 text-[#5e6578]">Create a new clip</p>
                    </div>
                    <span className="ml-auto text-lg" style={{ color: '#5842ed' }}>→</span>
                  </Link>

                  {/* Manage Billing */}
                  <Link
                    href="/billing"
                    className="group flex items-center gap-4 rounded-xl p-5 transition-all duration-200"
                    style={{
                      background: '#fafbff',
                      border: '1px solid #e4e6f2',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#5842ed'
                      e.currentTarget.style.background = '#f0eeff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e4e6f2'
                      e.currentTarget.style.background = '#fafbff'
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: '#f0eeff',
                        border: '1px solid #ded7fb',
                      }}
                    >
                      <CreditCard className="w-5 h-5" style={{ color: '#5842ed' }} />
                    </div>
                    <div>
                      <p className="font-bold text-[#110d2e]">Manage Billing</p>
                      <p className="text-xs mt-0.5 text-[#5e6578]">Upgrade your plan</p>
                    </div>
                    <span className="ml-auto text-lg" style={{ color: '#5842ed' }}>→</span>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center gap-4">
              {/* Loading spinner */}
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#5842ed', borderTopColor: 'transparent' }}
              />
              <p className="text-sm font-semibold" style={{ color: '#5e6578' }}>Loading your dashboard…</p>
            </div>
          )}
        </PageShell>
      </div>
    </div>
  )
}
