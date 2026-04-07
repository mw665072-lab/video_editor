'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProfile, logout } from '@/lib/api'
import { PageShell } from '@/components/PageShell'
import { User, Mail, Video, Download, Zap, LogOut } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile()
      .then((data) => setUser(data.user))
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
    <PageShell
      title="Dashboard"
      subtitle="Overview of your account & activity"
      actions={
        <button
          onClick={onLogout}
          className="flex items-center gap-2 rounded-full bg-rose-500/10 hover:bg-rose-500 px-5 py-2.5 text-sm font-medium text-rose-400 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      }
    >
      {error && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-950/50 p-4 text-rose-200">
          {error}
        </div>
      )}

      {user ? (
        <>
          {/* Slim Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Profile Card - Slim */}
            <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-5 hover:border-slate-500 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-lg text-white">Profile</h3>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl font-bold border border-slate-600 flex-shrink-0">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-base truncate">{user.name}</p>
                  <p className="text-slate-400 text-sm flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Status</p>
                  <p className="text-emerald-400 font-medium flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    Active
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Plan</p>
                  <p className="font-semibold text-white mt-1">{user.subscriptionPlan}</p>
                </div>
              </div>
            </div>

            {/* Clips Created - Slim */}
            <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-5 hover:border-slate-500 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold text-lg text-white">Clips Created</h3>
                </div>
                <span className="px-3 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded-full">This Month</span>
              </div>

              <p className="text-4xl font-bold text-white tabular-nums mb-4">
                {user.clipsThisMonth} <span className="text-xl text-slate-500 font-normal">/ {clipsLimit}</span>
              </p>

              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700"
                  style={{ width: `${clipsProgress}%` }}
                />
              </div>
            </div>

            {/* Downloads - Slim */}
            <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-5 hover:border-slate-500 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-orange-400" />
                  <h3 className="font-semibold text-lg text-white">Downloads</h3>
                </div>
                <span className="px-3 py-1 text-xs bg-orange-500/10 text-orange-400 rounded-full">This Month</span>
              </div>

              <div className="flex justify-center my-4">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#1e2937" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="10"
                      strokeDasharray={`${downloadsProgress * 3.27} 327`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-white">{user.downloadsThisMonth}</p>
                    <p className="text-sm text-slate-400">/ {downloadsLimit}</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-slate-400 text-sm">
                Available: <span className="text-orange-400 font-medium">{downloadsLimit - user.downloadsThisMonth}</span> left
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-[#0f172a] border border-slate-700 rounded-3xl p-7">
            <h3 className="flex items-center gap-3 text-lg font-semibold mb-6 text-white">
              <Zap className="w-5 h-5 text-amber-400" />
              Quick Actions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Link
                href="/editor"
                className="group flex items-center justify-between bg-gradient-to-br from-slate-800 to-slate-700 hover:from-cyan-600 hover:to-blue-600 p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10"
              >
                <div>
                  <p className="text-lg font-semibold text-white">Open Editor</p>
                  <p className="text-slate-400 group-hover:text-cyan-100 text-sm mt-1">Create a new clip now</p>
                </div>
                <div className="text-4xl group-hover:rotate-12 transition-transform">✍️</div>
              </Link>

              <Link
                href="/billing"
                className="group flex items-center justify-between bg-gradient-to-br from-slate-800 to-slate-700 hover:from-violet-600 hover:to-fuchsia-600 p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10"
              >
                <div>
                  <p className="text-lg font-semibold text-white">Manage Billing</p>
                  <p className="text-slate-400 group-hover:text-violet-100 text-sm mt-1">Upgrade or view invoices</p>
                </div>
                <div className="text-4xl group-hover:-rotate-12 transition-transform">💳</div>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="h-96 flex items-center justify-center text-slate-400">
          Loading your dashboard...
        </div>
      )}
    </PageShell>
  )
}