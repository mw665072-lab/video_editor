'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle, Send, ThumbsDown, ThumbsUp } from 'lucide-react'
import { addBlogComment, BlogPost, getBlog, reactToBlog } from '@/lib/api'

export function BlogDetailPage({ slug }: { slug: string }) {
  const router = useRouter()
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
      router.push('/auth/login')
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
      router.push('/auth/login')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="min-h-screen bg-[#0d0905] p-8 text-center text-[#c07040]">Loading blog...</main>
  if (error || !post) return <main className="min-h-screen bg-[#0d0905] p-8 text-center text-red-200">{error || 'Blog not found'}</main>

  return (
    <main className="min-h-screen bg-[#0d0905] text-white">
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/blogs" className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2a2118] bg-[#13100c] px-4 py-2 text-sm font-bold text-[#c07040] hover:text-[#fa6a00]">
          <ArrowLeft className="h-4 w-4" />
          Back to blogs
        </Link>

        <header className="overflow-hidden rounded-[2rem] border border-[#2a2118] bg-[#13100c]">
          {post.coverImageUrl && <img src={post.coverImageUrl} alt={post.title} className="aspect-video w-full object-cover" />}
          <div className="p-6 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[#8a6a45]">
              <span className="rounded-full bg-[#fa6a00]/10 px-3 py-1 font-bold capitalize text-[#fa6a00]">{post.category}</span>
              <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
              <span>By {post.authorName}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{post.title}</h1>
            <p className="mt-4 text-lg leading-8 text-[#c07040]">{post.excerpt}</p>
          </div>
        </header>

        <div className="prose prose-invert prose-orange mt-8 max-w-none rounded-[2rem] border border-[#2a2118] bg-[#13100c] p-6 text-[#f6e7d4] prose-headings:text-white prose-a:text-[#fa6a00] prose-blockquote:border-[#fa6a00] lg:p-8" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        <section className="mt-8 rounded-[2rem] border border-[#2a2118] bg-[#13100c] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => onReaction('like')} disabled={busy} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${post.userReaction === 'like' ? 'bg-[#fa6a00] text-white' : 'bg-[#1a100a] text-[#c07040]'}`}>
              <ThumbsUp className="h-4 w-4" />
              {post.likeCount}
            </button>
            <button onClick={() => onReaction('dislike')} disabled={busy} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${post.userReaction === 'dislike' ? 'bg-red-500 text-white' : 'bg-[#1a100a] text-[#c07040]'}`}>
              <ThumbsDown className="h-4 w-4" />
              {post.dislikeCount}
            </button>
            <span className="ml-auto inline-flex items-center gap-2 text-sm text-[#8a6a45]"><MessageCircle className="h-4 w-4" />{post.commentCount} comments</span>
          </div>

          <div className="mt-5 flex gap-3">
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." className="min-h-20 flex-1 rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-3 text-sm text-white outline-none focus:border-[#fa6a00]" />
            <button onClick={onComment} disabled={busy || !comment.trim()} className="self-stretch rounded-2xl bg-[#fa6a00] px-4 font-bold text-white disabled:opacity-50">
              <Send className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {post.comments.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#2a1a08] bg-[#0d0905] p-4">
                <div className="mb-1 flex items-center justify-between text-xs text-[#8a6a45]">
                  <span className="font-bold text-[#fa6a00]">{item.userName}</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm leading-6 text-[#f6e7d4]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  )
}
