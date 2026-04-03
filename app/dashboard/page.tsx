'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProfile, logout } from '@/lib/api'
import { PageShell } from '@/components/PageShell'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile().then((data) => setUser(data.user)).catch((err) => setError(err.message))
  }, [])

  const onLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  return (
    <PageShell
      title="User Dashboard"
      subtitle="Manage clips, usage, and billing"
      actions={
        <button onClick={onLogout} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
          Logout
        </button>
      }
    >
      {error && <div className="rounded-xl border border-rose-500 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>}

      {user ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="mt-2 text-sm">Name: {user.name}</p>
            <p className="mt-1 text-sm">Email: {user.email}</p>
            <p className="mt-1 text-sm">Email verified: {user.emailVerified ? 'Yes' : 'No'}</p>
            <p className="mt-1 text-sm">Plan: {user.subscriptionPlan}</p>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <h2 className="text-lg font-semibold">Usage</h2>
            <p className="mt-2 text-sm">Clips this month: {user.clipsThisMonth} / {user.subscriptionPlan === 'FREE' ? 5 : user.subscriptionPlan === 'BASIC' ? 500 : 700}</p>
            <p className="mt-1 text-sm">Downloads this month: {user.downloadsThisMonth} / {user.subscriptionPlan === 'FREE' ? 5 : user.subscriptionPlan === 'BASIC' ? 500 : 700}</p>
          </section>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-200">Loading profile…</p>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white" href="/editor">
            Open editor
          </Link>
          <Link className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" href="/billing">
            Manage billing
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

