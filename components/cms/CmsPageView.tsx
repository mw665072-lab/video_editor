'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CmsPage, getCmsPage } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

export function CmsPageView({ slug }: { slug: string }) {
  const [page, setPage] = useState<CmsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getCmsPage(slug)
      .then((data) => {
        if (!cancelled) setPage(data.page)
      })
      .catch((err) => !cancelled && setError(err.message || 'Page not found'))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <PageShell title={page?.title || 'Page'} subtitle={page?.excerpt || 'CMS managed page'}>
      {loading && <div className="rounded-2xl border border-[#2a1a08] bg-[#13100c] p-8 text-center text-[#c07040]">Loading page...</div>}
      {error && !loading && (
        <div className="rounded-2xl border border-[#2a1a08] bg-[#13100c] p-8 text-center">
          <p className="text-lg font-black text-white">Page not found</p>
          <p className="mt-2 text-sm text-[#c07040]">{error}</p>
          <Link href="/" className="mt-5 inline-flex rounded-xl bg-[#fa6a00] px-4 py-2 text-sm font-black text-white">Back home</Link>
        </div>
      )}
      {page && !loading && (
        <article className="rounded-3xl border border-[#2a1a08] bg-[#13100c] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="mb-6 border-b border-[#2a1a08] pb-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#fa6a00]">CMS Page</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{page.title}</h1>
            <p className="mt-3 max-w-3xl text-[#c07040]">{page.excerpt}</p>
          </div>
          <div className="cms-prose text-[#ead7c7]" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
        </article>
      )}
    </PageShell>
  )
}
