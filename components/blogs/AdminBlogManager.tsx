'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Redo2,
  Save,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  Upload,
} from 'lucide-react'
import { BlogPayload, BlogPost, createAdminBlog, deleteAdminBlog, getProfile, listAdminBlogs, updateAdminBlog, uploadBlogImage } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

const emptyDraft: BlogPayload = {
  title: '',
  slug: '',
  excerpt: '',
  contentHtml: '<p>Start writing your creator guide...</p>',
  coverImageUrl: '',
  coverImagePublicId: '',
  category: 'editing',
  tags: [],
  status: 'draft',
}

export function AdminBlogManager() {
  const router = useRouter()
  const editorRef = useRef<HTMLDivElement>(null)
  const editorSelectionRef = useRef<Range | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [draft, setDraft] = useState<BlogPayload>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tagText, setTagText] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data.user?.role !== 'ADMIN' && !data.user?.isAdmin) throw new Error('Admin only')
        return loadPosts()
      })
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = emptyDraft.contentHtml
    }
  }, [loading])

  const loadPosts = async () => {
    const data = await listAdminBlogs()
    setPosts(data.posts)
  }

  const selectPost = (post: BlogPost) => {
    setEditingId(post.id)
    setDraft({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      contentHtml: post.contentHtml,
      coverImageUrl: post.coverImageUrl,
      category: post.category,
      tags: post.tags,
      status: post.status,
    })
    setTagText(post.tags.join(', '))
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = post.contentHtml
    }, 0)
  }

  const reset = () => {
    setEditingId(null)
    setDraft(emptyDraft)
    setTagText('')
    if (editorRef.current) editorRef.current.innerHTML = emptyDraft.contentHtml
  }

  const format = (command: string, value?: string) => {
    editorRef.current?.focus()
    restoreEditorSelection()
    document.execCommand(command, false, value)
    rememberEditorSelection()
  }

  const createLink = () => {
    restoreEditorSelection()
    const url = window.prompt('Paste link URL')
    if (!url) return
    const safeUrl = /^(https?:|mailto:|\/)/i.test(url) ? url : `https://${url}`
    format('createLink', safeUrl)
  }

  const setTextColor = (color: string) => format('foreColor', color)
  const setHighlightColor = (color: string) => format('hiliteColor', color)

  const rememberEditorSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      editorSelectionRef.current = range.cloneRange()
    }
  }

  const restoreEditorSelection = () => {
    const selection = window.getSelection()
    const range = editorSelectionRef.current
    if (!selection || !range) return
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const insertInlineImage = (src: string) => {
    const editor = editorRef.current
    if (!editor || !src) return

    editor.focus()
    restoreEditorSelection()

    const figure = document.createElement('figure')
    const image = document.createElement('img')
    const caption = document.createElement('figcaption')
    const spacer = document.createElement('p')

    image.src = src
    image.alt = 'Blog image'
    image.loading = 'lazy'
    image.referrerPolicy = 'no-referrer'
    image.style.maxWidth = '100%'
    image.style.maxHeight = '360px'
    image.style.objectFit = 'contain'
    image.style.display = 'block'
    image.style.margin = '0 auto'

    caption.textContent = 'Image caption'
    spacer.innerHTML = '<br>'
    figure.append(image, caption)

    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    if (range && editor.contains(range.commonAncestorContainer)) {
      range.deleteContents()
      range.insertNode(spacer)
      range.insertNode(figure)
      range.setStartAfter(spacer)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    } else {
      editor.append(figure, spacer)
    }

    editorSelectionRef.current = null
  }

  const onImage = async (event: React.ChangeEvent<HTMLInputElement>, mode: 'cover' | 'inline') => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.')
      return
    }
    setBusy(true)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const uploaded = await uploadBlogImage(dataUrl)
      if (mode === 'cover') {
        setDraft((prev) => ({ ...prev, coverImageUrl: uploaded.image.secureUrl, coverImagePublicId: uploaded.image.publicId }))
      } else {
        if (!uploaded.image.secureUrl) {
          throw new Error('Cloudinary did not return an image URL')
        }
        insertInlineImage(uploaded.image.secureUrl)
      }
      setMessage('Image uploaded to Cloudinary.')
    } catch (err: any) {
      setMessage(err.message || 'Image upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setBusy(true)
    setMessage('')
    try {
      const editorHtml = editorRef.current?.innerHTML || draft.contentHtml
      const payload = {
        ...draft,
        contentHtml: editorHtml,
        tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean),
      }
      if (editingId) await updateAdminBlog(editingId, payload)
      else await createAdminBlog(payload)
      await loadPosts()
      reset()
      setMessage('Blog saved.')
    } catch (err: any) {
      setMessage(err.message || 'Could not save blog.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this blog?')) return
    setBusy(true)
    try {
      await deleteAdminBlog(id)
      await loadPosts()
      if (editingId === id) reset()
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="min-h-screen bg-[#ffffff]/90 p-8 text-center text-slate-600">Loading admin...</main>

  return (
    <PageShell
      title="Blog Admin"
      subtitle="Write rich posts, upload Cloudinary images, publish categories, and manage creator comments."
      actions={
        <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 backdrop-blur transition hover:border-[#15803d]/50 hover:bg-slate-100 hover:text-[#15803d]">
          <Plus className="h-4 w-4" />
          New post
        </button>
      }
    >
      <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-7xl min-h-[680px] flex-col overflow-hidden text-slate-950">
        {message && <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-[#22a653] shadow-[0_16px_50px_rgba(31,52,36,0.2)]">{message}</div>}

        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[340px_1fr]">
          <aside className="flex min-h-0 flex-col rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-[0_24px_80px_rgba(31,52,36,0.28)] backdrop-blur-xl">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">Posts</h2>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {posts.map((post) => (
                <button key={post.id} onClick={() => selectPost(post)} className={`w-full rounded-2xl border p-3 text-left transition ${editingId === post.id ? 'border-[#15803d]/60 bg-[#15803d]/10 shadow-[0_12px_34px_rgba(21,128,61,0.12)]' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <div className="line-clamp-1 text-sm font-bold text-slate-950">{post.title}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="capitalize">{post.status}</span>
                    <span>{post.category}</span>
                  </div>
                  <button onClick={(event) => { event.stopPropagation(); remove(post.id) }} className="mt-2 inline-flex items-center gap-1 text-[11px] text-red-300">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-[0_24px_80px_rgba(31,52,36,0.28)] backdrop-blur-xl sm:p-5">
            <div className="grid shrink-0 gap-3 md:grid-cols-2">
              <input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Blog title" className="rounded-2xl border border-slate-200 bg-[#ffffff]/90 px-4 py-3 text-sm outline-none focus:border-[#15803d]/70" />
              <input value={draft.slug} onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))} placeholder="Custom slug optional" className="rounded-2xl border border-slate-200 bg-[#ffffff]/90 px-4 py-3 text-sm outline-none focus:border-[#15803d]/70" />
              <input value={draft.category} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" className="rounded-2xl border border-slate-200 bg-[#ffffff]/90 px-4 py-3 text-sm outline-none focus:border-[#15803d]/70" />
              <input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="Tags comma separated" className="rounded-2xl border border-slate-200 bg-[#ffffff]/90 px-4 py-3 text-sm outline-none focus:border-[#15803d]/70" />
            </div>

            <textarea value={draft.excerpt} onChange={(event) => setDraft((prev) => ({ ...prev, excerpt: event.target.value }))} placeholder="SEO excerpt / short summary" className="mt-3 h-20 shrink-0 resize-none rounded-2xl border border-slate-200 bg-[#ffffff]/90 px-4 py-3 text-sm outline-none focus:border-[#15803d]/70" />

            <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-[220px_1fr]">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-[#ffffff]/90 p-3">
                {draft.coverImageUrl ? <img src={draft.coverImageUrl} alt="Cover" className="aspect-video w-full rounded-xl object-cover" /> : <div className="flex aspect-video items-center justify-center text-xs text-slate-500">Cover image</div>}
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                  <Upload className="h-4 w-4" />
                  Upload cover
                  <input type="file" accept="image/*" onChange={(event) => onImage(event, 'cover')} className="sr-only" />
                </label>
              </div>
              <div className="flex min-h-0 flex-col">
                <div className="mb-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-[#ffffff]/90 p-2">
                  <select
                    onMouseDown={rememberEditorSelection}
                    onChange={(event) => {
                      format('formatBlock', event.target.value)
                      event.target.value = ''
                    }}
                    defaultValue=""
                    className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-600 outline-none"
                  >
                    <option value="" disabled>Format</option>
                    <option value="p">Paragraph</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="h4">Heading 4</option>
                    <option value="blockquote">Quote</option>
                    <option value="pre">Code block</option>
                  </select>
                  <EditorButton label="Bold" onClick={() => format('bold')}><Bold className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Italic" onClick={() => format('italic')}><Italic className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Underline" onClick={() => format('underline')}><Underline className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Strike" onClick={() => format('strikeThrough')}><Strikethrough className="h-4 w-4" /></EditorButton>
                  <EditorButton label="H2" onClick={() => format('formatBlock', 'h2')}><Heading2 className="h-4 w-4" /></EditorButton>
                  <EditorButton label="H3" onClick={() => format('formatBlock', 'h3')}><Heading3 className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Bullet list" onClick={() => format('insertUnorderedList')}><List className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Numbered list" onClick={() => format('insertOrderedList')}><ListOrdered className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Quote" onClick={() => format('formatBlock', 'blockquote')}><Quote className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Code block" onClick={() => format('formatBlock', 'pre')}><Code className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Align left" onClick={() => format('justifyLeft')}><AlignLeft className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Align center" onClick={() => format('justifyCenter')}><AlignCenter className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Align right" onClick={() => format('justifyRight')}><AlignRight className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Link" onClick={createLink}><LinkIcon className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Rule" onClick={() => format('insertHorizontalRule')}><Minus className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Undo" onClick={() => format('undo')}><Undo2 className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Redo" onClick={() => format('redo')}><Redo2 className="h-4 w-4" /></EditorButton>
                  <EditorButton label="Clear" onClick={() => format('removeFormat')}><Eraser className="h-4 w-4" /></EditorButton>
                  <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-2 text-xs font-bold text-slate-600" title="Text color">
                    <span className="flex items-center gap-1"><Highlighter className="h-4 w-4" />Text</span>
                    <input type="color" defaultValue="#ffffff" onMouseDown={rememberEditorSelection} onChange={(event) => setTextColor(event.target.value)} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />
                  </label>
                  <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-2 text-xs font-bold text-slate-600" title="Highlight color">
                    <span>Bg</span>
                    <input type="color" defaultValue="#15803d" onMouseDown={rememberEditorSelection} onChange={(event) => setHighlightColor(event.target.value)} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <ImagePlus className="h-4 w-4" />
                    Inline image
                    <input type="file" accept="image/*" onChange={(event) => onImage(event, 'inline')} className="sr-only" />
                  </label>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyUp={rememberEditorSelection}
                  onMouseUp={rememberEditorSelection}
                  onBlur={rememberEditorSelection}
                  className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-[#ffffff]/90 p-4 text-sm leading-7 text-slate-700 outline-none focus:border-[#15803d]/70 [&_a]:text-[#15803d] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[#15803d] [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_figcaption]:mt-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_figure]:my-4 [&_h2]:text-2xl [&_h2]:font-black [&_h3]:text-xl [&_h3]:font-black [&_h4]:text-lg [&_h4]:font-bold [&_hr]:my-5 [&_hr]:border-slate-200 [&_img]:max-h-[360px] [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:object-contain [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-auto [&_pre]:rounded-2xl [&_pre]:bg-black/40 [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-6"
                />
              </div>
            </div>

            <div className="mt-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <select value={draft.status} onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as BlogPayload['status'] }))} className="rounded-xl border border-slate-200 bg-[#ffffff]/90 px-4 py-2 text-sm text-slate-950">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <button onClick={save} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#15803d] px-5 py-3 text-sm font-black text-[#ffffff] shadow-[0_16px_40px_rgba(21,128,61,0.24)] transition hover:bg-[#22a653] disabled:opacity-50">
                <Save className="h-4 w-4" />
                {editingId ? 'Update blog' : 'Create blog'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function EditorButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="rounded-lg bg-slate-50 p-2 text-slate-600 transition hover:bg-[#15803d]/10 hover:text-[#15803d]"
    >
      {children}
    </button>
  )
}

