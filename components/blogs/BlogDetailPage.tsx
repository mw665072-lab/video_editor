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
        <div className="flex min-h-[40vh] items-center justify-center text-[#c7b4ff]">Loading blog...</div>
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
      <div className="w-full text-white">
        {/* Back link */}
        <Link
          href="/blogs"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#100a2f] px-4 py-2 text-sm font-semibold text-[#c7b4ff] transition hover:border-[#7c3aed]/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blogs
        </Link>

        {/* Header card */}
        <header className="overflow-hidden rounded-2xl border border-white/10 bg-[#100a2f] shadow-[0_16px_60px_rgba(38,24,103,0.35)]">
          {post.coverImageUrl && (
            <div className="relative h-[300px] w-full overflow-hidden sm:h-[380px]">
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#100a2f] via-[#100a2f]/20 to-transparent" />
            </div>
          )}
          <div className="p-6 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#fa6a00]/10 px-3 py-1 font-bold capitalize text-[#fa6a00]">{post.category}</span>
              <span className="flex items-center gap-1 text-[#8a6a45]"><Calendar className="h-3 w-3" />{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1 text-[#8a6a45]"><User className="h-3 w-3" />{post.authorName}</span>
            </div>
            <h1 className="text-3xl font-black leading-snug tracking-tight text-white sm:text-4xl">{post.title}</h1>
            <p className="mt-3 text-base leading-7 text-[#c07040]">{post.excerpt}</p>
          </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-invert prose-orange mt-4 max-w-none rounded-2xl border border-white/10 bg-[#100a2f] p-6 text-[#e8d5c0] prose-headings:font-black prose-headings:text-white prose-a:text-[#fa6a00] prose-blockquote:border-l-[#fa6a00] prose-blockquote:text-[#c07040] prose-code:text-[#fa6a00] prose-strong:text-white lg:p-8"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* Reactions + comments */}
        <section className="mt-4 rounded-2xl border border-white/10 bg-[#100a2f] p-5">
          {/* Reaction bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-5">
            <button
              onClick={() => onReaction('like')}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${post.userReaction === 'like' ? 'bg-[#fa6a00] text-white shadow-[0_0_16px_rgba(250,106,0,0.4)]' : 'bg-white/5 text-[#c07040] hover:bg-[#fa6a00]/10'}`}
            >
              <ThumbsUp className="h-4 w-4" />{post.likeCount}
            </button>
            <button
              onClick={() => onReaction('dislike')}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${post.userReaction === 'dislike' ? 'bg-red-500 text-white' : 'bg-white/5 text-[#c07040] hover:bg-red-500/10'}`}
            >
              <ThumbsDown className="h-4 w-4" />{post.dislikeCount}
            </button>
            <span className="ml-auto flex items-center gap-1.5 text-sm text-[#8a6a45]">
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
              className="flex-1 resize-none rounded-xl border border-white/10 bg-[#0c0720] p-3 text-sm text-white outline-none placeholder:text-[#4a3a6a] focus:border-[#7c3aed]/60"
            />
            <button
              onClick={onComment}
              disabled={busy || !comment.trim()}
              className="self-stretch rounded-xl bg-[#fa6a00] px-4 font-bold text-white transition hover:bg-[#e05a00] disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/* Comments list */}
          {post.comments.length > 0 && (
            <div className="mt-5 space-y-3">
              {post.comments.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/5 bg-[#0c0720] p-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#fa6a00]">{item.userName}</span>
                    <span className="text-[#6b4e7a]">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm leading-6 text-[#d4bfff]">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
