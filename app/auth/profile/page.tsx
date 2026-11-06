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
          backgroundColor: '#f6f7fb',
          backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(34,163,83,0.16) 0%, transparent 28%), radial-gradient(circle at 80% 20%, rgba(255,179,44,0.08) 0%, transparent 24%)',
        }}
      >
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,163,83,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,179,44,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative z-10">
          <PageShell title="Profile & account" subtitle="Your account info and usage">
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#d99b00', borderTopColor: 'transparent' }}
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
        backgroundColor: '#f8f9fd',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(88,66,237,0.08) 0%, transparent 35%), radial-gradient(circle at 80% 18%, rgba(124,58,237,0.06) 0%, transparent 30%)',
      }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(88,66,237,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(88,66,237,0.12) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute top-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full blur-[120px] opacity-15"
        style={{ background: '#5842ed' }}
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
                background: '#ffffff',
                border: '1px solid #e4e6f2',
                boxShadow: '0 10px 30px rgba(88,66,237,0.04)',
              }}
            >
              {/* Card header */}
              <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid #e4e6f2' }}>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-2xl font-black text-white"
                  style={{
                    background: 'linear-gradient(135deg, #5842ed 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 16px rgba(88,66,237,0.25)',
                  }}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#110d2e] tracking-tight">{user.name}</h2>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-0.5 text-[#5e6578]">
                    Account Information
                  </p>
                </div>
              </div>

              {/* Info rows */}
              <div className="grid gap-3 sm:grid-cols-2">

                {/* Email */}
                <div
                  className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: '#f8f9fd', border: '1px solid #e4e6f2' }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#f0eeff', border: '1px solid #ded7fb' }}
                  >
                    <Mail className="w-4 h-4 text-[#5842ed]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 text-[#5e6578]">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-[#110d2e] break-all">{user.email}</p>
                  </div>
                </div>

                {/* Verification */}
                <div
                  className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: '#f8f9fd', border: '1px solid #e4e6f2' }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={
                      user.emailVerified
                        ? { background: '#f0eeff', border: '1px solid #ded7fb' }
                        : { background: '#fffbeb', border: '1px solid #fef3c7' }
                    }
                  >
                    <ShieldCheck
                      className="w-4 h-4"
                      style={{ color: user.emailVerified ? '#5842ed' : '#f59e0b' }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 text-[#5e6578]">
                      Verification
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#110d2e]">
                        {user.emailVerified ? 'Verified' : 'Not Verified'}
                      </p>
                      {user.emailVerified && (
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-black bg-[#5842ed] text-white"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="my-4" style={{ borderTop: '1px solid #e4e6f2' }} />

              {/* Plan */}
              <div
                className="flex items-center gap-4 rounded-xl p-4"
                style={{ background: '#f8f9fd', border: '1px solid #e4e6f2' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#f0eeff', border: '1px solid #ded7fb' }}
                >
                  <Calendar className="w-4 h-4 text-[#5842ed]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1 text-[#5e6578]">
                    Current Plan
                  </p>
                  <div className="flex items-center gap-2.5">
                    <p className="text-lg font-black text-[#110d2e] capitalize">
                      {user.subscriptionPlan || 'Free'}
                    </p>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider text-white"
                      style={{
                        background: 'linear-gradient(135deg, #5842ed 0%, #7c3aed 100%)',
                        boxShadow: '0 2px 8px rgba(88,66,237,0.3)',
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
                background: '#ffffff',
                border: '1px solid #e4e6f2',
                boxShadow: '0 10px 30px rgba(88,66,237,0.04)',
              }}
            >
              {/* Card header */}
              <div className="flex items-center gap-2.5 mb-5 pb-5" style={{ borderBottom: '1px solid #e4e6f2' }}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: '#f0eeff', border: '1px solid #ded7fb' }}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#5842ed]" />
                </div>
                <div>
                  <h3 className="font-black text-[#110d2e] text-sm tracking-wide uppercase">Usage This Month</h3>
                  <p className="text-xs mt-0.5 text-[#5e6578]">Track your activity and limits</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                {/* Clips Created */}
                <div
                  className="rounded-xl p-5 transition-all duration-200 group"
                  style={{ background: '#f8f9fd', border: '1px solid #e4e6f2' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(88,66,237,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e4e6f2'
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#5e6578]">
                      Clips Created
                    </p>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{
                        background: 'linear-gradient(135deg, #5842ed 0%, #7c3aed 100%)',
                        boxShadow: '0 2px 10px rgba(88,66,237,0.3)',
                      }}
                    >
                      <Scissors className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-6xl font-black text-[#110d2e] leading-none tracking-tighter">
                    {user.clipsThisMonth || 0}
                  </p>
                  <p className="text-xs mt-3 font-semibold text-[#5e6578]">this month</p>
                </div>

                {/* Downloads */}
                <div
                  className="rounded-xl p-5 transition-all duration-200"
                  style={{ background: '#f8f9fd', border: '1px solid #e4e6f2' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(88,66,237,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e4e6f2'
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#5e6578]">
                      Downloads
                    </p>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: '#f0eeff',
                        border: '1px solid #ded7fb',
                      }}
                    >
                      <Download className="w-4 h-4 text-[#5842ed]" />
                    </div>
                  </div>
                  <p className="text-6xl font-black text-[#110d2e] leading-none tracking-tighter">
                    {user.downloadsThisMonth || 0}
                  </p>
                  <p className="text-xs mt-3 font-semibold text-[#5e6578]">this month</p>
                </div>

              </div>
            </div>

          </div>
        </PageShell>
      </div>
    </div>
  )
}
