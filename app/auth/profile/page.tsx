'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'
import { User, Mail, ShieldCheck, Calendar, TrendingUp, Scissors, Download } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile()
      .then((data) => {
        setUser(data.user)
      })
      .catch(() => {
        router.push('/auth/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div
        className="relative min-h-screen overflow-hidden"
        style={{
          backgroundColor: '#12072f',
          backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(145,85,255,0.16) 0%, transparent 28%), radial-gradient(circle at 80% 20%, rgba(255,179,44,0.08) 0%, transparent 24%)',
        }}
      >
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(145,85,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,179,44,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative z-10">
          <PageShell title="Profile & account" subtitle="Your account info and usage">
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#fa6a00', borderTopColor: 'transparent' }}
                />
                <p className="text-sm font-semibold" 
                >
                  Loading your profile…
                </p>
              </div>
            </div>
          </PageShell>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: '#12072f',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(145,85,255,0.16) 0%, transparent 28%), radial-gradient(circle at 80% 18%, rgba(255,179,44,0.08) 0%, transparent 24%)',
      }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(145,85,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,179,44,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute top-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full blur-[120px] opacity-20"
        style={{ background: '#8b5cf6' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-80px] right-[-80px] w-[260px] h-[260px] rounded-full blur-[120px] opacity-10"
        style={{ background: '#7c3aed' }}
      />

      <div className="relative z-10">
        <PageShell title="Profile & Account" subtitle="Manage your account information and usage">
          <div className="space-y-6">

            {/* ── Profile Information ──────────────────────────────────── */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(20, 9, 50, 0.95)',
                border: '1px solid rgba(145,85,255,0.16)',
                boxShadow: '0 4px 32px rgba(23,11,67,0.42)',
              }}
            >
              {/* Card header */}
              <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(145,85,255,0.12)' }}>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-2xl font-black text-white"
                  style={{
                    background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                    boxShadow: '0 2px 16px rgba(250,106,0,0.4)',
                  }}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">{user.name}</h2>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-0.5" 
                  >
                    Account Information
                  </p>
                </div>
              </div>

              {/* Info rows */}
              <div className="grid gap-3 sm:grid-cols-2">

                {/* Email */}
                <div
                  className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: 'rgba(16, 8, 43, 0.9)', border: '1px solid rgba(145,85,255,0.12)' }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(145,85,255,0.16)', border: '1px solid rgba(145,85,255,0.24)' }}
                  >
                    <Mail className="w-4 h-4" style={{ color: '#fa6a00' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" 
                    >
                      Email
                    </p>
                    <p className="text-sm font-semibold text-white break-all">{user.email}</p>
                  </div>
                </div>

                {/* Verification */}
                <div
                  className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: 'rgba(16, 8, 43, 0.9)', border: '1px solid rgba(145,85,255,0.12)' }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={
                      user.emailVerified
                        ? { background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }
                        : { background: 'rgba(250,106,0,0.1)', border: '1px solid rgba(250,106,0,0.2)' }
                    }
                  >
                    <ShieldCheck
                      className="w-4 h-4"
                      style={{ color: user.emailVerified ? '#4ade80' : '#fa6a00' }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" 
                    >
                      Verification
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {user.emailVerified ? 'Verified' : 'Not Verified'}
                      </p>
                      {user.emailVerified && (
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-black"
                          style={{ background: '#4ade80', color: '#0a1a0a' }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="my-4" style={{ borderTop: '1px solid rgba(145,85,255,0.12)' }} />

              {/* Plan */}
              <div
                className="flex items-center gap-4 rounded-xl p-4"
                style={{ background: 'rgba(16, 8, 43, 0.9)', border: '1px solid rgba(145,85,255,0.12)' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(145,85,255,0.16)', border: '1px solid rgba(145,85,255,0.24)' }}
                >
                  <Calendar className="w-4 h-4" style={{ color: '#fa6a00' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" 
                  >
                    Current Plan
                  </p>
                  <div className="flex items-center gap-2.5">
                    <p className="text-lg font-black text-white capitalize">
                      {user.subscriptionPlan || 'Free'}
                    </p>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider"
                      style={{
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        color: 'white',
                        boxShadow: '0 1px 8px rgba(250,106,0,0.35)',
                      }}
                    >
                      {user.subscriptionPlan || 'FREE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Usage Statistics ─────────────────────────────────────── */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(20, 9, 50, 0.95)',
                border: '1px solid rgba(145,85,255,0.16)',
                boxShadow: '0 4px 32px rgba(23,11,67,0.42)',
              }}
            >
              {/* Card header */}
              <div className="flex items-center gap-2.5 mb-5 pb-5" style={{ borderBottom: '1px solid rgba(145,85,255,0.12)' }}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(145,85,255,0.14)', border: '1px solid rgba(145,85,255,0.18)' }}
                >
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: '#fa6a00' }} />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm tracking-wide uppercase">Usage This Month</h3>
                  <p className="text-xs mt-0.5" 
                  >Track your activity and limits</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                {/* Clips Created */}
                <div
                  className="rounded-xl p-5 transition-all duration-200 group"
                  style={{ background: 'rgba(16, 8, 43, 0.9)', border: '1px solid rgba(145,85,255,0.12)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(145,85,255,0.12)'
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest" 
                    >
                      Clips Created
                    </p>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        boxShadow: '0 2px 10px rgba(250,106,0,0.3)',
                      }}
                    >
                      <Scissors className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-6xl font-black text-white leading-none tracking-tighter">
                    {user.clipsThisMonth || 0}
                  </p>
                  <p className="text-xs mt-3 font-semibold" >this month</p>
                </div>

                {/* Downloads */}
                <div
                  className="rounded-xl p-5 transition-all duration-200"
                  style={{ background: 'rgba(16, 8, 43, 0.9)', border: '1px solid rgba(145,85,255,0.12)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(145,85,255,0.12)'
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest" 
                    >
                      Downloads
                    </p>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'rgba(16, 8, 43, 0.9)',
                        border: '1px solid rgba(145,85,255,0.12)',
                      }}
                    >
                      <Download className="w-4 h-4" style={{ color: '#fa6a00' }} />
                    </div>
                  </div>
                  <p className="text-6xl font-black text-white leading-none tracking-tighter">
                    {user.downloadsThisMonth || 0}
                  </p>
                  <p className="text-xs mt-3 font-semibold" >this month</p>
                </div>

              </div>
            </div>

          </div>
        </PageShell>
      </div>
    </div>
  )
}