'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AdminCms,
  CmsNavItem,
  CmsNavPayload,
  CmsPage,
  CmsPagePayload,
  CmsSettings,
  createCmsNavItem,
  createCmsPage,
  deleteCmsNavItem,
  deleteCmsPage,
  getAdminCms,
  updateCmsNavItem,
  updateCmsPage,
  updateCmsSettings,
  uploadBlogImage,
} from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

const toolbarActions: Array<{ label: string; command: string; value?: string }> = [
  { label: 'Bold', command: 'bold' },
  { label: 'Italic', command: 'italic' },
  { label: 'Underline', command: 'underline' },
  { label: 'H2', command: 'formatBlock', value: 'h2' },
  { label: 'Quote', command: 'formatBlock', value: 'blockquote' },
  { label: 'Bullet', command: 'insertUnorderedList' },
  { label: 'Number', command: 'insertOrderedList' },
  { label: 'Link', command: 'createLink', value: 'prompt' },
]

const emptySettings: CmsSettings = {
  siteName: 'CLIPAI',
  logoText: 'CLIPAI',
  tagline: 'AI-powered video clipping and editing.',
  headerTitle: 'Create clips faster',
  headerSubtitle: 'Paste, preview, cut, publish, and manage your creator workflow in one place.',
  footerDescription: 'AI-powered video clipping from YouTube, TikTok, Instagram and Facebook. Create. Clip. Publish.',
  footerCopyright: 'All rights reserved. Privacy · Terms · Cookies',
  socialLinks: [],
}

const emptyNav: CmsNavPayload = {
  label: '',
  href: '/',
  location: 'navbar',
  audience: 'public',
  icon: 'file-text',
  order: 100,
  isActive: true,
  external: false,
}

const emptyPage: CmsPagePayload = {
  title: '',
  slug: '',
  excerpt: '',
  contentHtml: '<p>Write your page content here...</p>',
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
  showInNavbar: false,
  showInFooter: false,
}

export function AdminCmsManager() {
  const [cms, setCms] = useState<AdminCms | null>(null)
  const [settings, setSettings] = useState<CmsSettings>(emptySettings)
  const [navForm, setNavForm] = useState<CmsNavPayload>(emptyNav)
  const [editingNavId, setEditingNavId] = useState<string | null>(null)
  const [pageForm, setPageForm] = useState<CmsPagePayload>(emptyPage)
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'settings' | 'navigation' | 'pages'>('settings')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    const data = await getAdminCms()
    setCms(data)
    setSettings(data.settings)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message || 'Could not load CMS'))
  }, [])

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== pageForm.contentHtml) {
      editorRef.current.innerHTML = pageForm.contentHtml
    }
  }, [pageForm.contentHtml, editingPageId])

  const run = async (action: () => Promise<void>, message: string) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await action()
      await load()
      setNotice(message)
    } catch (err: any) {
      setError(err.message || 'CMS action failed')
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = () => run(async () => {
    await updateCmsSettings(settings)
  }, 'Site settings saved.')

  const saveNav = () => run(async () => {
    if (editingNavId) {
      await updateCmsNavItem(editingNavId, navForm)
    } else {
      await createCmsNavItem(navForm)
    }
    setEditingNavId(null)
    setNavForm(emptyNav)
  }, 'Navigation updated.')

  const savePage = () => run(async () => {
    const payload = { ...pageForm, contentHtml: editorRef.current?.innerHTML || pageForm.contentHtml }
    if (editingPageId) {
      await updateCmsPage(editingPageId, payload)
    } else {
      await createCmsPage(payload)
    }
    setEditingPageId(null)
    setPageForm(emptyPage)
  }, 'Page saved.')

  const insertImage = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    const result = await uploadBlogImage(dataUrl)
    document.execCommand('insertImage', false, result.image.secureUrl)
    setPageForm((prev) => ({ ...prev, contentHtml: editorRef.current?.innerHTML || prev.contentHtml }))
  }

  return (
    <PageShell
      title="CMS Builder"
      subtitle="Control navbar, sidebars, footer, global copy, and public pages from one admin workspace."
      actions={<Link href="/" className="rounded-xl bg-[#fa6a00] px-4 py-2 text-sm font-black text-white">View site</Link>}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {(['settings', 'navigation', 'pages'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-black capitalize ${activeTab === tab ? 'bg-[#fa6a00] text-white' : 'bg-[#1a100a] text-[#c07040]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
        {notice && <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{notice}</div>}

        {activeTab === 'settings' && (
          <Panel title="Site Settings" action={<button disabled={saving} onClick={saveSettings} className="rounded-xl bg-[#fa6a00] px-4 py-2 text-sm font-black text-white disabled:opacity-50">Save settings</button>}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Site name" value={settings.siteName} onChange={(value) => setSettings({ ...settings, siteName: value })} />
              <TextInput label="Logo text" value={settings.logoText} onChange={(value) => setSettings({ ...settings, logoText: value })} />
              <TextInput label="Tagline" value={settings.tagline} onChange={(value) => setSettings({ ...settings, tagline: value })} />
              <TextInput label="Header title" value={settings.headerTitle} onChange={(value) => setSettings({ ...settings, headerTitle: value })} />
              <Textarea label="Header subtitle" value={settings.headerSubtitle} onChange={(value) => setSettings({ ...settings, headerSubtitle: value })} />
              <Textarea label="Footer description" value={settings.footerDescription} onChange={(value) => setSettings({ ...settings, footerDescription: value })} />
              <TextInput label="Footer copyright" value={settings.footerCopyright} onChange={(value) => setSettings({ ...settings, footerCopyright: value })} />
              <Textarea
                label="Social links JSON"
                value={JSON.stringify(settings.socialLinks, null, 2)}
                onChange={(value) => {
                  try {
                    const parsed = JSON.parse(value)
                    if (Array.isArray(parsed)) setSettings({ ...settings, socialLinks: parsed })
                  } catch {
                    setSettings({ ...settings })
                  }
                }}
              />
            </div>
          </Panel>
        )}

        {activeTab === 'navigation' && (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title={editingNavId ? 'Edit Navigation Item' : 'Add Navigation Item'} action={<button disabled={saving} onClick={saveNav} className="rounded-xl bg-[#fa6a00] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{editingNavId ? 'Update' : 'Create'}</button>}>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Label" value={navForm.label} onChange={(value) => setNavForm({ ...navForm, label: value })} />
                <TextInput label="Href" value={navForm.href} onChange={(value) => setNavForm({ ...navForm, href: value })} />
                <Select label="Location" value={navForm.location} onChange={(value) => setNavForm({ ...navForm, location: value as any })} options={['navbar', 'footer', 'sidebar_user', 'sidebar_admin']} />
                <Select label="Audience" value={navForm.audience} onChange={(value) => setNavForm({ ...navForm, audience: value as any })} options={['public', 'user', 'admin', 'all']} />
                <TextInput label="Icon name" value={navForm.icon} onChange={(value) => setNavForm({ ...navForm, icon: value })} />
                <NumberInput label="Order" value={navForm.order} onChange={(value) => setNavForm({ ...navForm, order: value })} />
                <Toggle label="Active" checked={navForm.isActive} onChange={(value) => setNavForm({ ...navForm, isActive: value })} />
                <Toggle label="External link" checked={navForm.external} onChange={(value) => setNavForm({ ...navForm, external: value })} />
              </div>
            </Panel>

            <Panel title="Navigation Items">
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {cms?.navItems.map((item) => (
                  <Row key={item.id}>
                    <div>
                      <p className="font-black text-white">{item.label}</p>
                      <p className="text-xs text-[#7a5030]">{item.location} · {item.href} · order {item.order}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingNavId(item.id); setNavForm(toNavPayload(item)); }} className="rounded-lg bg-[#1a100a] px-3 py-2 text-xs font-black text-[#fa6a00]">Edit</button>
                      <button onClick={() => run(() => deleteCmsNavItem(item.id).then(() => undefined), 'Navigation item deleted.')} className="rounded-lg bg-red-950/50 px-3 py-2 text-xs font-black text-red-200">Delete</button>
                    </div>
                  </Row>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
            <Panel title={editingPageId ? 'Edit Page' : 'Create Page'} action={<button disabled={saving} onClick={savePage} className="rounded-xl bg-[#fa6a00] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{editingPageId ? 'Update page' : 'Create page'}</button>}>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Title" value={pageForm.title} onChange={(value) => setPageForm({ ...pageForm, title: value })} />
                <TextInput label="Slug" value={pageForm.slug} onChange={(value) => setPageForm({ ...pageForm, slug: value })} />
                <Textarea label="Excerpt" value={pageForm.excerpt} onChange={(value) => setPageForm({ ...pageForm, excerpt: value })} />
                <div className="grid gap-3">
                  <Select label="Status" value={pageForm.status} onChange={(value) => setPageForm({ ...pageForm, status: value as any })} options={['draft', 'published', 'archived']} />
                  <Toggle label="Show in navbar" checked={pageForm.showInNavbar} onChange={(value) => setPageForm({ ...pageForm, showInNavbar: value })} />
                  <Toggle label="Show in footer" checked={pageForm.showInFooter} onChange={(value) => setPageForm({ ...pageForm, showInFooter: value })} />
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  {toolbarActions.map(({ label, command, value }) => (
                    <button key={label} type="button" onClick={() => {
                      const finalValue = value === 'prompt' ? window.prompt('Paste URL') || '' : value
                      document.execCommand(command, false, finalValue)
                      setPageForm((prev) => ({ ...prev, contentHtml: editorRef.current?.innerHTML || prev.contentHtml }))
                    }} className="rounded-lg bg-[#1a100a] px-3 py-2 text-xs font-black text-[#c07040]">{label}</button>
                  ))}
                  <label className="cursor-pointer rounded-lg bg-[#1a100a] px-3 py-2 text-xs font-black text-[#c07040]">
                    Image
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) insertImage(file).catch((err) => setError(err.message || 'Image upload failed'))
                      event.currentTarget.value = ''
                    }} />
                  </label>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setPageForm((prev) => ({ ...prev, contentHtml: editorRef.current?.innerHTML || prev.contentHtml }))}
                  className="cms-prose min-h-[320px] max-h-[520px] overflow-y-auto rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-5 text-sm leading-7 text-white outline-none"
                />
              </div>
            </Panel>

            <Panel title="Pages">
              <div className="max-h-[660px] space-y-2 overflow-y-auto pr-1">
                {cms?.pages.map((page) => (
                  <Row key={page.id}>
                    <div>
                      <p className="font-black text-white">{page.title}</p>
                      <p className="text-xs text-[#7a5030]">/{page.slug} · {page.status} · {page.showInNavbar ? 'navbar' : ''} {page.showInFooter ? 'footer' : ''}</p>
                    </div>
                    <div className="flex gap-2">
                      {page.status === 'published' && <Link href={`/p/${page.slug}`} className="rounded-lg bg-[#1a100a] px-3 py-2 text-xs font-black text-[#c07040]">View</Link>}
                      <button onClick={() => { setEditingPageId(page.id); setPageForm(toPagePayload(page)); }} className="rounded-lg bg-[#1a100a] px-3 py-2 text-xs font-black text-[#fa6a00]">Edit</button>
                      <button onClick={() => run(() => deleteCmsPage(page.id).then(() => undefined), 'Page deleted.')} className="rounded-lg bg-red-950/50 px-3 py-2 text-xs font-black text-red-200">Delete</button>
                    </div>
                  </Row>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </PageShell>
  )
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#2a1a08] bg-[#13100c] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-3">{children}</div>
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.18em] text-[#7a5030]">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-[#2a1a08] bg-[#0d0905] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#fa6a00]" />
    </label>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.18em] text-[#7a5030]">
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="rounded-xl border border-[#2a1a08] bg-[#0d0905] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#fa6a00]" />
    </label>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.18em] text-[#7a5030]">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="rounded-xl border border-[#2a1a08] bg-[#0d0905] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#fa6a00]" />
    </label>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.18em] text-[#7a5030]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-[#2a1a08] bg-[#0d0905] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#fa6a00]">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#2a1a08] bg-[#0d0905] px-3 py-2 text-sm font-bold text-white">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#fa6a00]" />
    </label>
  )
}

const toNavPayload = (item: CmsNavItem): CmsNavPayload => ({
  label: item.label,
  href: item.href,
  location: item.location,
  audience: item.audience,
  icon: item.icon,
  order: item.order,
  isActive: item.isActive,
  external: item.external,
})

const toPagePayload = (page: CmsPage): CmsPagePayload => ({
  title: page.title,
  slug: page.slug,
  excerpt: page.excerpt,
  contentHtml: page.contentHtml,
  status: page.status,
  metaTitle: page.metaTitle,
  metaDescription: page.metaDescription,
  showInNavbar: page.showInNavbar,
  showInFooter: page.showInFooter,
})
