'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CmsNavItem, getProfile, getPublicCms, logout } from '@/lib/api'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Menu,
  X,
  LayoutDashboard,
  Scissors,
  Layers,
  User,
  CreditCard,
  LogOut,
  Zap,
  BookOpen,
  BarChart3,
  PenSquare,
  Settings,
  FileText,
  Sparkles,
  Search,
  Captions,
  ImagePlus,
  ScrollText,
  Scan,
  Video,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/editor', label: 'Clip Editor', icon: Scissors },
  { href: '/visual-editor', label: 'Visual Editor', icon: Layers },
  { href: '/blogs', label: 'Blogs', icon: BookOpen },
  { href: '/auth/profile', label: 'Profile', icon: User },
  { href: '/billing', label: 'Billing', icon: CreditCard },
]

const adminNavItems = [
  { href: '/admin', label: 'Admin Stats', icon: BarChart3 },
  { href: '/admin/blogs', label: 'Create Blogs', icon: PenSquare },
  { href: '/admin/cms', label: 'CMS Builder', icon: Settings },
  { href: '/blogs', label: 'Public Blogs', icon: BookOpen },
]

const iconMap: Record<string, any> = {
  'layout-dashboard': LayoutDashboard,
  scissors: Scissors,
  layers: Layers,
  user: User,
  'credit-card': CreditCard,
  'book-open': BookOpen,
  'bar-chart-3': BarChart3,
  'pen-square': PenSquare,
  settings: Settings,
  'file-text': FileText,
  sparkles: Sparkles,
  search: Search,
  captions: Captions,
  'image-plus': ImagePlus,
  'scroll-text': ScrollText,
  scan: Scan,
  video: Video,
}

const normalizeCmsItems = (items: CmsNavItem[]) =>
  items
    .filter((item) => item.isActive)
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ href: item.href, label: item.label, icon: iconMap[item.icon] || FileText, external: item.external }))

const editorToolHrefs = new Set([
  '/editor?tool=ai-clipping',
  '/editor?tool=find-moments',
  '/visual-editor?tool=subtitles',
  '/visual-editor?tool=thumbnail',
  '/editor?tool=transcript',
  '/editor?tool=summary',
  '/visual-editor?tool=reframe',
  '/visual-editor?tool=ai-video',
])

const cleanSidebarItems = (items: typeof navItems) => items.filter((item) => !editorToolHrefs.has(item.href))

const mergeMissingSidebarItems = (primary: typeof navItems, fallback: typeof navItems) => {
  const cleanedPrimary = cleanSidebarItems(primary)
  const seen = new Set(cleanedPrimary.map((item) => item.href))
  return [...cleanedPrimary, ...fallback.filter((item) => !seen.has(item.href))]
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [cmsUserItems, setCmsUserItems] = useState(navItems)
  const [cmsAdminItems, setCmsAdminItems] = useState(adminNavItems)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isAdmin = user?.role === 'ADMIN' || user?.isAdmin
  const items = isAdmin ? cmsAdminItems : cmsUserItems

  useEffect(() => {
    getProfile().then((data) => setUser(data.user)).catch(() => setUser(null))
    getPublicCms()
      .then((cms) => {
        if (cms.nav.sidebarUser.length) setCmsUserItems(mergeMissingSidebarItems(normalizeCmsItems(cms.nav.sidebarUser), navItems))
        if (cms.nav.sidebarAdmin.length) setCmsAdminItems(normalizeCmsItems(cms.nav.sidebarAdmin))
      })
      .catch(() => undefined)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <div className="md:sticky md:top-4 md:h-full">

      {/* ── Mobile top bar ──────────────────────────────────────────── */}
      <div
        className="md:hidden mb-3 rounded-2xl p-3"
        style={{
          background: '#13100c',
          border: '1px solid #2a1a08',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                boxShadow: '0 2px 10px rgba(250,106,0,0.35)',
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || (isAdmin ? 'A' : 'U')}
            </span>
            <div>
              <p className="text-sm font-bold text-white/90">{isAdmin ? 'Admin Panel' : 'Workspace'}</p>
              <p className="text-[11px]" style={{ color: '#6b4e2e' }}>{isAdmin ? 'Platform control' : 'Tap menu'}</p>
            </div>
          </div>
          <button
            aria-label="Toggle sidebar"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg p-2 transition-colors"
            style={{
              background: '#1a100a',
              border: '1px solid #2a1a08',
              color: '#fa6a00',
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Sidebar panel ───────────────────────────────────────────── */}
      <aside
        className={`${mobileOpen ? 'block' : 'hidden'} md:block rounded-2xl p-5 shadow-xl`}
        style={{
          background: '#13100c',
          border: '1px solid #2a1a08',
          boxShadow: '0 4px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Workspace header */}
        <div className="mb-6 flex items-center gap-3 pb-5" style={{ borderBottom: '1px solid #2a1a08' }}>
          {/* Logo mark */}
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{
              background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
              boxShadow: '0 2px 12px rgba(250,106,0,0.35)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <polygon points="5,2 18,10 5,18" fill="white" />
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-black tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #ffffff 0%, #fa6a00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {isAdmin ? 'Admin Console' : 'Your Workspace'}
            </p>
            <p className="text-xs font-medium" style={{ color: '#4a3020' }}>{isAdmin ? 'Stats, users, content' : 'Quick access'}</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1.5">
          {items.map((item) => {
            const currentPath = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname
            const itemPath = item.href.split('?')[0]
            const isQueryItem = item.href.includes('?')
            const isActive = isQueryItem
              ? currentPath === item.href
              : pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${itemPath}/`))
            const Icon = item.icon
            const external = 'external' in item && item.external
            return (
              <Link
                key={item.href}
                href={item.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200"
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        color: 'white',
                        boxShadow: '0 2px 14px rgba(250,106,0,0.35)',
                      }
                    : {
                        color: '#6b4e2e',
                        background: 'transparent',
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#1a100a'
                    e.currentTarget.style.color = '#fa6a00'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#6b4e2e'
                  }
                }}
              >
                <Icon
                  size={16}
                  className="shrink-0"
                  style={{ opacity: isActive ? 1 : 0.7 }}
                />
                {item.label}
                {isActive && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.7)' }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Tips box */}
        <div
          className="mt-6 rounded-xl p-3.5"
          style={{
            background: '#0d0905',
            border: '1px solid #2a1a08',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={11} style={{ color: '#fa6a00' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#fa6a00' }}>
              {isAdmin ? 'Admin' : 'Tips'}
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#4a3020' }}>
            {isAdmin ? (
              <>
                Review platform usage, publish blog content, and track creator engagement from admin views.
              </>
            ) : (
              <>
                Use <span className="font-semibold" style={{ color: '#7a5030' }}>Clip Editor</span> for trimming and exporting, or{' '}
                <span className="font-semibold" style={{ color: '#7a5030' }}>Visual Editor</span> for filters, audio, and captions.
              </>
            )}
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200"
          style={{
            background: '#1a0808',
            border: '1px solid #3a1010',
            color: '#c05050',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2a0c0c'
            e.currentTarget.style.color = '#e06060'
            e.currentTarget.style.borderColor = '#5a1818'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1a0808'
            e.currentTarget.style.color = '#c05050'
            e.currentTarget.style.borderColor = '#3a1010'
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </aside>
    </div>
  )
}
