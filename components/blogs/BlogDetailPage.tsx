'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, MessageCircle, Send, ThumbsDown, ThumbsUp, User } from 'lucide-react'
import { addBlogComment, BlogPost, getBlog, reactToBlog } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

export function BlogDetailPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getBlog(slug)
      .then((data) => setPost(data.post))
      .catch((err) => setError(err.message || 'Could not load blog'))
      .finally(() => setLoading(false))
  }, [slug])

  const onReaction = async (reaction: 'like' | 'dislike') => {
    if (!post || busy) return
    setBusy(true)
    try {
      const next = post.userReaction === reaction ? 'none' : reaction
      const data = await reactToBlog(post.id, next)
      setPost(data.post)
    } catch {
      setError('Please sign in later to react. Public login is currently disabled.')
    } finally {
      setBusy(false)
    }
  }

  const onComment = async () => {
    if (!post || !comment.trim() || busy) return
    setBusy(true)
    try {
      const data = await addBlogComment(post.id, comment.trim())
      setPost(data.post)
      setComment('')
    } catch {
      setError('Please sign in later to comment. Public login is currently disabled.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <PageShell title="">
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading blog...</div>
      </PageShell>
    )
  }

  if (error || !post) {
    return (
      <PageShell title="">
        <div className="flex min-h-[40vh] items-center justify-center text-red-300">{error || 'Blog not found'}</div>
      </PageShell>
    )
  }

  return (
    <PageShell title="">
      <div className="w-full text-slate-950">
        {/* Back link */}
        <Link
          href="/blogs"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#ffffff] px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-[#15803d]/60 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blogs
        </Link>

        {/* Header card */}
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-[#ffffff] shadow-[0_16px_60px_rgba(31,52,36,0.35)]">
          {post.coverImageUrl && (
            <div className="relative h-[300px] w-full overflow-hidden sm:h-[380px]">
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#ffffff] via-[#ffffff]/20 to-transparent" />
            </div>
          )}
          <div className="p-6 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#d99b00]/10 px-3 py-1 font-bold capitalize text-[#d99b00]">{post.category}</span>
              <span className="flex items-center gap-1 text-slate-500"><Calendar className="h-3 w-3" />{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1 text-slate-500"><User className="h-3 w-3" />{post.authorName}</span>
            </div>
            <h1 className="text-3xl font-black leading-snug tracking-tight text-slate-950 sm:text-4xl">{post.title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{post.excerpt}</p>
          </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-invert prose-orange mt-4 max-w-none rounded-2xl border border-slate-200 bg-[#ffffff] p-6 text-slate-700 prose-headings:font-black prose-headings:text-slate-950 prose-a:text-[#d99b00] prose-blockquote:border-l-[#d99b00] prose-blockquote:text-slate-600 prose-code:text-[#d99b00] prose-strong:text-slate-950 lg:p-8"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* Reactions + comments */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-[#ffffff] p-5">
          {/* Reaction bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-5">
            <button
              onClick={() => onReaction('like')}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${post.userReaction === 'like' ? 'bg-[#d99b00] text-slate-950 shadow-[0_0_16px_rgba(217,155,0,0.4)]' : 'bg-slate-50 text-slate-600 hover:bg-[#d99b00]/10'}`}
            >
              <ThumbsUp className="h-4 w-4" />{post.likeCount}
            </button>
            <button
              onClick={() => onReaction('dislike')}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${post.userReaction === 'dislike' ? 'bg-red-500 text-slate-950' : 'bg-slate-50 text-slate-600 hover:bg-red-500/10'}`}
            >
              <ThumbsDown className="h-4 w-4" />{post.dislikeCount}
            </button>
            <span className="ml-auto flex items-center gap-1.5 text-sm text-slate-500">
              <MessageCircle className="h-4 w-4" />{post.commentCount} comments
            </span>
          </div>

          {/* Comment input */}
          <div className="mt-5 flex gap-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-[#f8fafc] p-3 text-sm text-slate-950 outline-none placeholder:text-[#758078] focus:border-[#15803d]/60"
            />
            <button
              onClick={onComment}
              disabled={busy || !comment.trim()}
              className="self-stretch rounded-xl bg-[#d99b00] px-4 font-bold text-slate-950 transition hover:bg-[#b77900] disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/* Comments list */}
          {post.comments.length > 0 && (
            <div className="mt-5 space-y-3">
              {post.comments.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-[#f8fafc] p-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#d99b00]">{item.userName}</span>
                    <span className="text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
