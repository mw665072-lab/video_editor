'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart3, BookOpen, Download, FileVideo, MessageCircle, PenSquare, ShieldCheck, ThumbsUp, Upload, Users } from 'lucide-react'
import {
  AdminStats,
  ProxyPoolStatus,
  getAdminProxyStatus,
  getAdminStats,
  getProfile,
  importAdminProxies,
  updateAdminProxy,
} from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

export function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [proxyPool, setProxyPool] = useState<ProxyPoolStatus | null>(null)
  const [proxyImportText, setProxyImportText] = useState('')
  const [proxyProvider, setProxyProvider] = useState('default')
  const [proxyCountry, setProxyCountry] = useState('')
  const [proxyCostPerGb, setProxyCostPerGb] = useState('0')
  const [replaceProvider, setReplaceProvider] = useState(false)
  const [proxySaving, setProxySaving] = useState(false)
  const [proxyMessage, setProxyMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data.user?.role !== 'ADMIN' && !data.user?.isAdmin) throw new Error('Admin only')
        return Promise.all([getAdminStats(), getAdminProxyStatus()])
      })
      .then(([statsData, proxyData]) => {
        setStats(statsData.stats)
        setProxyPool(proxyData.proxyPool)
      })
      .catch((err) => {
        setError(err.message || 'Admin access required')
        router.replace('/dashboard')
      })
      .finally(() => setLoading(false))
  }, [router])

  const refreshProxyPool = async () => {
    const data = await getAdminProxyStatus()
    setProxyPool(data.proxyPool)
  }

  const submitProxyImport = async () => {
    setProxyMessage('')
    if (!proxyImportText.trim()) {
      setProxyMessage('Paste at least one proxy first.')
      return
    }

    try {
      setProxySaving(true)
      const data = await importAdminProxies({
        proxies: proxyImportText,
        provider: proxyProvider.trim() || undefined,
        country: proxyCountry.trim() || undefined,
        costPerGb: Number(proxyCostPerGb || 0),
        replaceProvider,
      })
      setProxyPool(data.proxyPool)
      setProxyImportText('')
      setProxyMessage(`Imported ${data.result.imported} proxies. Skipped ${data.result.skipped}.`)
    } catch (err) {
      setProxyMessage(err instanceof Error ? err.message : 'Proxy import failed')
    } finally {
      setProxySaving(false)
    }
  }

  const toggleProxy = async (proxyId: string, isActive: boolean) => {
    const data = await updateAdminProxy(proxyId, {
      isActive: !isActive,
      status: isActive ? 'disabled' : 'healthy',
    })
    setProxyPool(data.proxyPool)
  }

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

        {proxyPool && (
          <Panel title="Proxy Pool">
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat label="Proxies" value={`${proxyPool.activeProxies}/${proxyPool.totalProxies}`} />
              <MiniStat label="Downloads" value={proxyPool.totalDownloads} />
              <MiniStat label="Errors" value={proxyPool.totalErrors} />
              <MiniStat label="Est. Cost" value={`$${proxyPool.estimatedCost.toFixed(2)}`} />
            </div>

            <div className="mb-5 rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-4">
              <div className="mb-3 grid gap-3 md:grid-cols-[1fr_120px_120px]">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a45]">Provider</span>
                  <input
                    value={proxyProvider}
                    onChange={(event) => setProxyProvider(event.target.value)}
                    className="w-full rounded-xl border border-[#2a1a08] bg-[#13100c] px-3 py-2 text-sm text-white outline-none focus:border-[#fa6a00]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a45]">Country</span>
                  <input
                    value={proxyCountry}
                    onChange={(event) => setProxyCountry(event.target.value)}
                    placeholder="US"
                    className="w-full rounded-xl border border-[#2a1a08] bg-[#13100c] px-3 py-2 text-sm text-white outline-none focus:border-[#fa6a00]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a45]">$/GB</span>
                  <input
                    value={proxyCostPerGb}
                    onChange={(event) => setProxyCostPerGb(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-xl border border-[#2a1a08] bg-[#13100c] px-3 py-2 text-sm text-white outline-none focus:border-[#fa6a00]"
                  />
                </label>
              </div>

              <textarea
                value={proxyImportText}
                onChange={(event) => setProxyImportText(event.target.value)}
                rows={4}
                placeholder="host:port:user:pass, one per line"
                className="mb-3 w-full resize-y rounded-xl border border-[#2a1a08] bg-[#13100c] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#fa6a00]"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#ead7c7]">
                  <input
                    type="checkbox"
                    checked={replaceProvider}
                    onChange={(event) => setReplaceProvider(event.target.checked)}
                    className="h-4 w-4 accent-[#fa6a00]"
                  />
                  Disable old proxies for this provider
                </label>
                <button
                  type="button"
                  onClick={submitProxyImport}
                  disabled={proxySaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#fa6a00] px-4 py-2 text-xs font-black text-white disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {proxySaving ? 'Importing...' : 'Import Proxies'}
                </button>
                <button
                  type="button"
                  onClick={refreshProxyPool}
                  className="rounded-xl border border-[#2a1a08] px-4 py-2 text-xs font-black text-[#ead7c7] hover:border-[#fa6a00]/50"
                >
                  Refresh
                </button>
                {proxyMessage && <span className="text-xs text-[#c07040]">{proxyMessage}</span>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="text-[#8a6a45]">
                  <tr className="border-b border-[#2a1a08]">
                    <th className="py-2 pr-3">Proxy</th>
                    <th className="py-2 pr-3">Provider</th>
                    <th className="py-2 pr-3">Health</th>
                    <th className="py-2 pr-3">Downloads</th>
                    <th className="py-2 pr-3">Errors</th>
                    <th className="py-2 pr-3">GB</th>
                    <th className="py-2 pr-3">Cost</th>
                    <th className="py-2 pr-3">Last Error</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proxyPool.proxies.map((proxy) => (
                    <tr key={proxy.id} className="border-b border-[#2a1a08]/70 text-[#ead7c7]">
                      <td className="max-w-[220px] truncate py-3 pr-3 font-mono">{proxy.label}</td>
                      <td className="py-3 pr-3">{proxy.provider || '-'}</td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${proxy.healthy ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                          <ShieldCheck className="h-3 w-3" />
                          {proxy.active ? proxy.status : 'disabled'}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{proxy.downloads}</td>
                      <td className="py-3 pr-3">{proxy.errors}</td>
                      <td className="py-3 pr-3">{proxy.gb.toFixed(3)}</td>
                      <td className="py-3 pr-3">${proxy.estimatedCost.toFixed(2)}</td>
                      <td className="max-w-[220px] truncate py-3 pr-3 text-[#c07040]">{proxy.lastError || '-'}</td>
                      <td className="py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => toggleProxy(proxy.id, proxy.active)}
                          className="rounded-lg border border-[#2a1a08] px-3 py-1 text-[10px] font-black uppercase text-[#ead7c7] hover:border-[#fa6a00]/60"
                        >
                          {proxy.active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

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

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a45]">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
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
