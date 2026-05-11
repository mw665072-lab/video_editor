'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart3, BookOpen, Download, FileVideo, MessageCircle, PenSquare, ThumbsUp, Users } from 'lucide-react'
import { AdminStats, getAdminStats, getProfile } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

export function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data.user?.role !== 'ADMIN' && !data.user?.isAdmin) throw new Error('Admin only')
        return getAdminStats()
      })
      .then((data) => setStats(data.stats))
      .catch((err) => {
        setError(err.message || 'Admin access required')
        router.replace('/dashboard')
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <main className="min-h-screen bg-[#0d0905] p-8 text-center text-[#c07040]">Loading admin stats...</main>
  if (error || !stats) return null

  return (
    <PageShell
      title="Admin Stats"
      subtitle="Platform usage, creator activity, export health, and blog engagement"
      actions={
        <Link href="/admin/blogs" className="inline-flex items-center gap-2 rounded-xl bg-[#fa6a00] px-4 py-2 text-sm font-black text-white">
          <PenSquare className="h-4 w-4" />
          Create Blog
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Users />} label="Total Users" value={stats.totalUsers} detail={`${stats.adminUsers} admins`} />
          <StatCard icon={<FileVideo />} label="Total Exports" value={stats.totalExports} detail={formatBreakdown(stats.exportsByStatus)} />
          <StatCard icon={<BarChart3 />} label="Clips This Month" value={stats.clipsThisMonth} detail={`${stats.downloadsThisMonth} downloads`} />
          <StatCard icon={<BookOpen />} label="Published Blogs" value={stats.blogStatus.published || 0} detail={`${stats.blogStatus.draft || 0} drafts`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard icon={<ThumbsUp />} label="Blog Likes" value={stats.likes} detail={`${stats.dislikes} dislikes`} />
          <StatCard icon={<MessageCircle />} label="Comments" value={stats.comments} detail="All blog comments" />
          <StatCard icon={<Download />} label="Plan Mix" value={stats.planBreakdown.PRO || 0} detail={`PRO users, ${stats.planBreakdown.FREE || 0} free`} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Recent Users">
            <div className="space-y-2">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-3">
                  <div>
                    <p className="text-sm font-bold text-white">{user.name}</p>
                    <p className="text-xs text-[#8a6a45]">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#fa6a00]">{user.subscriptionPlan}</p>
                    <p className="text-[11px] text-[#8a6a45]">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Blogs">
            <div className="space-y-2">
              {stats.recentBlogs.map((blog) => (
                <Link key={blog.id} href={`/admin/blogs`} className="block rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-3 hover:border-[#fa6a00]/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="line-clamp-1 text-sm font-bold text-white">{blog.title}</p>
                      <p className="text-xs capitalize text-[#8a6a45]">{blog.category}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${blog.status === 'published' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-[#fa6a00]/10 text-[#fa6a00]'}`}>
                      {blog.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  )
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-3xl border border-[#2a1a08] bg-[#13100c] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.3)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fa6a00]/10 text-[#fa6a00] [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a6a45]">{label}</p>
      <p className="mt-2 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-[#c07040]">{detail}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#2a1a08] bg-[#13100c] p-5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-[#fa6a00]">{title}</h2>
      {children}
    </section>
  )
}

function formatBreakdown(values: Record<string, number>) {
  const entries = Object.entries(values)
  if (!entries.length) return 'No exports yet'
  return entries.map(([key, value]) => `${value} ${key}`).join(', ')
}
