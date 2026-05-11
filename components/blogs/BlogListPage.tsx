'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Search, Tag, ThumbsUp, MessageCircle, ArrowRight } from 'lucide-react'
import { BlogPost, listBlogCategories, listBlogs } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

export function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([listBlogs({ category, search, limit: 24 }), listBlogCategories()])
      .then(([blogData, categoryData]) => {
        if (cancelled) return
        setPosts(blogData.posts)
        setCategories(categoryData.categories)
        setError('')
      })
      .catch((err) => !cancelled && setError(err.message || 'Could not load blogs'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [category, search])

  const featured = posts[0]
  const rest = useMemo(() => posts.slice(1), [posts])

  return (
    <PageShell title="Creator Blogs" subtitle="Editing playbooks, product updates, and creator growth guides.">
      <div className="mx-auto max-w-7xl text-white">
        <div className="mb-8 rounded-[2rem] border border-[#2a2118] bg-[#13100c]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] lg:p-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#fa6a00]/20 bg-[#fa6a00]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#fa6a00]">
            <BookOpen className="h-4 w-4" />
            Creator Blogs
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Editing playbooks, product updates, and creator growth guides.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#c07040]">Learn how to cut faster, repurpose content, build branded workflows, and get more from the visual editor.</p>
            </div>
            <div className="rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#2a1a08] bg-[#1a100a] px-3">
                <Search className="h-4 w-4 text-[#8a6a45]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search blogs..."
                  className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6b4e2e]"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setCategory('')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${!category ? 'bg-[#fa6a00] text-white' : 'bg-[#1a100a] text-[#c07040]'}`}>All</button>
                {categories.map((item) => (
                  <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${category === item ? 'bg-[#fa6a00] text-white' : 'bg-[#1a100a] text-[#c07040]'}`}>{item}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {loading && <div className="rounded-2xl border border-[#2a2118] bg-[#13100c] p-8 text-center text-[#c07040]">Loading blogs...</div>}

        {!loading && featured && (
          <Link href={`/blogs/${featured.slug}`} className="group mb-6 grid overflow-hidden rounded-[2rem] border border-[#2a2118] bg-[#13100c] shadow-[0_16px_60px_rgba(0,0,0,0.35)] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="min-h-[280px] bg-[#1a100a]">
              {featured.coverImageUrl ? <img src={featured.coverImageUrl} alt={featured.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-[#8a6a45]">No cover image</div>}
            </div>
            <div className="flex flex-col justify-center p-6 lg:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#8a6a45]">
                <span className="rounded-full bg-[#fa6a00]/10 px-3 py-1 font-bold capitalize text-[#fa6a00]">{featured.category}</span>
                <span>{new Date(featured.publishedAt || featured.createdAt).toLocaleDateString()}</span>
              </div>
              <h2 className="text-3xl font-black leading-tight text-white">{featured.title}</h2>
              <p className="mt-4 text-sm leading-6 text-[#c07040]">{featured.excerpt}</p>
              <div className="mt-6 flex items-center justify-between text-xs text-[#8a6a45]">
                <span className="flex items-center gap-4"><span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" />{featured.likeCount}</span><span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{featured.commentCount}</span></span>
                <span className="flex items-center gap-1 font-bold text-[#fa6a00]">Read article <ArrowRight className="h-4 w-4" /></span>
              </div>
            </div>
          </Link>
        )}

        {!loading && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
        )}

        {!loading && posts.length === 0 && <div className="rounded-2xl border border-[#2a2118] bg-[#13100c] p-8 text-center text-[#c07040]">No blogs found.</div>}
      </div>
    </PageShell>
  )
}

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blogs/${post.slug}`} className="group overflow-hidden rounded-3xl border border-[#2a2118] bg-[#13100c] transition hover:border-[#fa6a00]/50">
      <div className="aspect-video bg-[#1a100a]">
        {post.coverImageUrl ? <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center text-[#8a6a45]">Blog</div>}
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-[#8a6a45]">
          <Tag className="h-3.5 w-3.5" />
          <span className="capitalize">{post.category}</span>
        </div>
        <h3 className="line-clamp-2 text-lg font-black leading-tight text-white">{post.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#c07040]">{post.excerpt}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-[#8a6a45]">
          <span>{post.likeCount} likes</span>
          <span>{post.commentCount} comments</span>
        </div>
      </div>
    </Link>
  )
}
