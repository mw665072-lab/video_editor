'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/lib/api'
import { Sidebar } from '@/components/Sidebar'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    return <div className="min-h-screen bg-slate-950 text-white p-6">Loading profile…</div>
  }

  if (!user) {
    return null
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-950 text-white p-6 md:p-12">
      <div className="mx-auto grid h-full w-full max-w-[1340px] gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <Sidebar />
        </aside>
        <section className="space-y-6 overflow-hidden">
          <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl">
            <div>
              <h1 className="text-2xl font-bold">Profile & account</h1>
              <p className="text-sm text-slate-300">Your account info and usage</p>
            </div>
          </header>

          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
            <h2 className="text-lg font-semibold">User details</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="font-semibold">Name: </span>{user.name}</p>
              <p><span className="font-semibold">Email: </span>{user.email}</p>
              <p><span className="font-semibold">Verified: </span>{user.emailVerified ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">Plan: </span>{user.subscriptionPlan}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
            <h2 className="text-lg font-semibold">Usage</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-xs uppercase text-slate-400">Clips this month</p>
                <p className="text-2xl font-bold text-white">{user.clipsThisMonth || 0}</p>
              </div>
              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-xs uppercase text-slate-400">Downloads this month</p>
                <p className="text-2xl font-bold text-white">{user.downloadsThisMonth || 0}</p>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}
        </section>
      </div>
    </main>
  )
}
