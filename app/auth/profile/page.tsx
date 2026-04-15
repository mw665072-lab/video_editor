'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Mail, ShieldCheck, Calendar, TrendingUp } from 'lucide-react'

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
      <PageShell title="Profile & account" subtitle="Your account info and usage">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-500" />
            <p className="text-slate-400">Loading your profile...</p>
          </div>
        </div>
      </PageShell>
    )
  }

  if (!user) return null

  return (
    <PageShell title="Profile & Account" subtitle="Manage your account information and usage">
      <div className="space-y-8">
        {/* Profile Information Card */}
        <Card className="border-slate-700 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600">
                <User className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold tracking-tight text-white">{user.name}</CardTitle>
                <CardDescription className="text-slate-400">Account Information</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                <div className="rounded-lg bg-slate-800 p-3">
                  <Mail className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Email</p>
                  <p className="font-medium text-white break-all">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                <div className="rounded-lg bg-slate-800 p-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Verification</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </p>
                    {user.emailVerified && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        ✓
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-700" />

            <div className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
              <div className="rounded-lg bg-slate-800 p-3">
                <Calendar className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Current Plan</p>
                <p className="text-xl font-semibold text-white capitalize">{user.subscriptionPlan || 'Free'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <Card className="border-slate-700 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-cyan-400" />
              <div>
                <CardTitle className='text-white'>Usage This Month</CardTitle>
                <CardDescription>Track your activity and limits</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950 to-slate-900 p-6 transition-all hover:border-cyan-500/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-400">Clips Created</p>
                    <p className="mt-3 text-5xl font-bold tracking-tighter text-white">
                      {user.clipsThisMonth || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <span className="text-2xl">✂️</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">This month</p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950 to-slate-900 p-6 transition-all hover:border-cyan-500/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-400">Downloads</p>
                    <p className="mt-3 text-5xl font-bold tracking-tighter text-white">
                      {user.downloadsThisMonth || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-2xl">⬇️</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}