'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart3, BookOpen, Download, FileVideo, MessageCircle, PenSquare, RefreshCw, ShieldCheck, ThumbsUp, Upload, Users } from 'lucide-react'
import {
  AdminStats,
  ProxyPoolStatus,
  getAdminProxyStatus,
  getAdminStats,
  getProfile,
  importAdminProxies,
  updateAdminProxy,
  validateAdminProxies,
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
  const [proxyValidating, setProxyValidating] = useState(false)
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
      setProxyImportText('')
      setProxyMessage(`Imported ${data.result.imported} proxies. Skipped ${data.result.skipped}.`)
      await refreshProxyPool()
    } catch (err) {
      setProxyMessage(err instanceof Error ? err.message : 'Proxy import failed')
    } finally {
      setProxySaving(false)
    }
  }

  const toggleProxy = async (proxyId: string, isActive: boolean) => {
    const data = await updateAdminProxy(proxyId, {
      isActive: !isActive,
      status: isActive ? 'disabled' : 'untested',
    })
    setProxyPool(data.proxyPool)
  }

  const validateProxies = async (proxyId?: string) => {
    setProxyMessage('')
    try {
      setProxyValidating(true)
      const data = await validateAdminProxies(proxyId ? { proxyId } : { limit: 5 })
      setProxyPool(data.proxyPool)
      setProxyMessage(`Validated ${data.result.validated} proxies. Healthy ${data.result.healthy}.`)
    } catch (err) {
      setProxyMessage(err instanceof Error ? err.message : 'Proxy validation failed')
    } finally {
      setProxyValidating(false)
    }
  }

  if (loading) return <main className="min-h-screen bg-[#12072f] p-8 text-center text-white/70">Loading admin stats...</main>
  if (error || !stats) return null

  return (
    <PageShell
      title="Admin Stats"
      subtitle="Platform usage, creator activity, export health, and blog engagement"
      actions={
        <Link href="/admin/blogs" className="inline-flex items-center gap-2 rounded-2xl bg-[#ff7a1a] px-4 py-2 text-sm font-black text-white shadow-[0_12px_34px_rgba(250,106,0,0.22)] transition hover:bg-[#ff8b35]">
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
              <MiniStat label="Usable" value={`${proxyPool.usableProxies} healthy`} />
              <MiniStat label="Downloads" value={proxyPool.totalDownloads} />
              <MiniStat label="Errors" value={proxyPool.totalErrors} />
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat label="Untested" value={proxyPool.statusCounts.untested || 0} />
              <MiniStat label="Cooldown" value={proxyPool.statusCounts.cooldown || 0} />
              <MiniStat label="Quarantine" value={proxyPool.statusCounts.quarantined || 0} />
              <MiniStat label="Est. Cost" value={`$${proxyPool.estimatedCost.toFixed(2)}`} />
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat label="Bot Blocks" value={proxyPool.totalBotBlockErrors || 0} />
              <MiniStat label="407/Auth" value={proxyPool.totalProxyAuthErrors || 0} />
              <MiniStat label="Success Rate" value={formatPercent(getOverallSuccessRate(proxyPool))} />
              <MiniStat label="GB / Success" value={`${getOverallGbPerSuccess(proxyPool).toFixed(3)} GB`} />
            </div>

            <div className="mb-5 rounded-3xl border border-white/10 bg-[#150b40]/70 p-4 shadow-[0_16px_50px_rgba(12,2,32,0.28)]">
              <div className="mb-3 grid gap-3 md:grid-cols-[1fr_120px_120px]">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Provider</span>
                  <input
                    value={proxyProvider}
                    onChange={(event) => setProxyProvider(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#100a2f]/90 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#ffb32c]/70"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Country</span>
                  <input
                    value={proxyCountry}
                    onChange={(event) => setProxyCountry(event.target.value)}
                    placeholder="US"
                    className="w-full rounded-2xl border border-white/10 bg-[#100a2f]/90 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#ffb32c]/70"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-white/45">$/GB</span>
                  <input
                    value={proxyCostPerGb}
                    onChange={(event) => setProxyCostPerGb(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/10 bg-[#100a2f]/90 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#ffb32c]/70"
                  />
                </label>
              </div>

              <textarea
                value={proxyImportText}
                onChange={(event) => setProxyImportText(event.target.value)}
                rows={4}
                placeholder="host:port:user:pass, one per line"
                className="mb-3 w-full resize-y rounded-2xl border border-white/10 bg-[#100a2f]/90 px-3 py-2 font-mono text-xs text-white outline-none transition placeholder:text-white/30 focus:border-[#ffb32c]/70"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-white/75">
                  <input
                    type="checkbox"
                    checked={replaceProvider}
                    onChange={(event) => setReplaceProvider(event.target.checked)}
                    className="h-4 w-4 accent-[#ffb32c]"
                  />
                  Disable old proxies for this provider
                </label>
                <button
                  type="button"
                  onClick={submitProxyImport}
                  disabled={proxySaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#ff7a1a] px-4 py-2 text-xs font-black text-white shadow-[0_12px_30px_rgba(250,106,0,0.22)] transition hover:bg-[#ff8b35] disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {proxySaving ? 'Importing...' : 'Import Proxies'}
                </button>
                <button
                  type="button"
                  onClick={refreshProxyPool}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white/80 transition hover:border-[#ffb32c]/50 hover:bg-white/10"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => validateProxies()}
                  disabled={proxyValidating}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-400/15 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${proxyValidating ? 'animate-spin' : ''}`} />
                  {proxyValidating ? 'Validating...' : 'Validate 5'}
                </button>
                {proxyMessage && <span className="text-xs text-[#ffb32c]">{proxyMessage}</span>}
              </div>
              <p className="mt-3 text-xs text-white/45">
                Validator {proxyPool.validator.enabled ? 'enabled' : 'disabled'} · max {proxyPool.maxUsesPerHour} uses/proxy/hour · health TTL {Math.round(proxyPool.validator.healthTtlMs / 60000)}m · quarantine {Math.round(proxyPool.validator.quarantineMs / 3600000)}h · test URL {proxyPool.validator.testUrl}
              </p>
            </div>

            {proxyPool.providerQuality.length > 0 && (
              <div className="mb-5 overflow-x-auto rounded-3xl border border-white/10 bg-[#100a2f]/70">
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="bg-white/[0.03] text-white/45">
                    <tr className="border-b border-white/10">
                      <th className="py-2 pr-3">Provider</th>
                      <th className="py-2 pr-3">Usable</th>
                      <th className="py-2 pr-3">Success</th>
                      <th className="py-2 pr-3">Bot Block</th>
                      <th className="py-2 pr-3">407/Auth</th>
                      <th className="py-2 pr-3">Downloads</th>
                      <th className="py-2 pr-3">GB / Success</th>
                      <th className="py-2 pr-3">GB</th>
                      <th className="py-2 pr-3">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proxyPool.providerQuality.map((provider) => (
                      <tr key={provider.provider} className="border-b border-white/10 text-white/80 last:border-0">
                        <td className="py-3 pr-3 font-bold">{provider.provider}</td>
                        <td className="py-3 pr-3">{provider.usableProxies}/{provider.totalProxies}</td>
                        <td className="py-3 pr-3 text-emerald-300">{formatPercent(provider.successRate)}</td>
                        <td className="py-3 pr-3 text-[#ffb32c]">{formatPercent(provider.botBlockRate)}</td>
                        <td className="py-3 pr-3 text-red-300">{formatPercent(provider.proxyAuthRate)}</td>
                        <td className="py-3 pr-3">{provider.downloads}</td>
                        <td className="py-3 pr-3">{provider.gbPerSuccessfulImport.toFixed(3)}</td>
                        <td className="py-3 pr-3">{provider.gb.toFixed(3)}</td>
                        <td className="py-3 pr-3">${provider.estimatedCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#100a2f]/70">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="bg-white/[0.03] text-white/45">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-3">Proxy</th>
                    <th className="py-2 pr-3">Provider</th>
                    <th className="py-2 pr-3">Health</th>
                    <th className="py-2 pr-3">Hourly</th>
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
                    <tr key={proxy.id} className="border-b border-white/10 text-white/80 last:border-0">
                      <td className="max-w-[220px] truncate py-3 pr-3 font-mono">{proxy.label}</td>
                      <td className="py-3 pr-3">{proxy.provider || '-'}</td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${getProxyStatusClass(proxy.active ? proxy.status : 'disabled')}`}>
                          <ShieldCheck className="h-3 w-3" />
                          {proxy.active ? proxy.status : 'disabled'}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{proxy.hourlyUses}/{proxy.maxUsesPerHour}</td>
                      <td className="py-3 pr-3">{proxy.downloads}</td>
                      <td className="py-3 pr-3">{proxy.errors}</td>
                      <td className="py-3 pr-3">{proxy.gb.toFixed(3)}</td>
                      <td className="py-3 pr-3">${proxy.estimatedCost.toFixed(2)}</td>
                      <td className="max-w-[220px] truncate py-3 pr-3 text-[#ffb32c]">{proxy.lastError || '-'}</td>
                      <td className="py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => toggleProxy(proxy.id, proxy.active)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-white/80 transition hover:border-[#ffb32c]/60 hover:bg-white/10"
                        >
                          {proxy.active ? 'Disable' : 'Enable'}
                        </button>
                        {proxy.active && proxy.status !== 'healthy' && (
                          <button
                            type="button"
                            onClick={() => validateProxies(proxy.id)}
                            disabled={proxyValidating}
                            className="ml-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-400/15 disabled:opacity-60"
                          >
                            Test
                          </button>
                        )}
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
                <div key={user.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#150b40]/70 p-3">
                  <div>
                    <p className="text-sm font-bold text-white">{user.name}</p>
                    <p className="text-xs text-white/45">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#ffb32c]">{user.subscriptionPlan}</p>
                    <p className="text-[11px] text-white/45">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Blogs">
            <div className="space-y-2">
              {stats.recentBlogs.map((blog) => (
                <Link key={blog.id} href={`/admin/blogs`} className="block rounded-2xl border border-white/10 bg-[#150b40]/70 p-3 transition hover:border-[#ffb32c]/40 hover:bg-[#1b1050]/80">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="line-clamp-1 text-sm font-bold text-white">{blog.title}</p>
                      <p className="text-xs capitalize text-white/45">{blog.category}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${blog.status === 'published' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-[#ffb32c]/10 text-[#ffb32c]'}`}>
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
    <div className="rounded-2xl border border-white/10 bg-[#150b40]/70 p-3 shadow-[0_12px_34px_rgba(12,2,32,0.22)]">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#100a2f]/90 p-5 shadow-[0_16px_60px_rgba(38,24,103,0.32)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffb32c]/10 text-[#ffb32c] [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-2 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-white/60">{detail}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#100a2f]/90 p-5 shadow-[0_16px_60px_rgba(38,24,103,0.32)]">
      <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-[#ffb32c]">{title}</h2>
      {children}
    </section>
  )
}

function getProxyStatusClass(status: ProxyPoolStatus['proxies'][number]['status']) {
  if (status === 'healthy') return 'bg-emerald-500/10 text-emerald-300'
  if (status === 'untested') return 'bg-[#ffb32c]/10 text-[#ffb32c]'
  if (status === 'cooldown') return 'bg-sky-500/10 text-sky-300'
  if (status === 'quarantined') return 'bg-fuchsia-500/10 text-fuchsia-300'
  if (status === 'disabled') return 'bg-white/10 text-white/45'
  return 'bg-red-500/10 text-red-300'
}

function getOverallSuccessRate(proxyPool: ProxyPoolStatus) {
  const completed = proxyPool.totalDownloads + proxyPool.totalErrors
  return completed > 0 ? (proxyPool.totalDownloads / completed) * 100 : 0
}

function getOverallGbPerSuccess(proxyPool: ProxyPoolStatus) {
  return proxyPool.totalDownloads > 0 ? proxyPool.totalGb / proxyPool.totalDownloads : 0
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatBreakdown(values: Record<string, number>) {
  const entries = Object.entries(values)
  if (!entries.length) return 'No exports yet'
  return entries.map(([key, value]) => `${value} ${key}`).join(', ')
}
