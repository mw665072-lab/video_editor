'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/api'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token') || '')
  }, [])

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!token) {
      setError('Missing reset token')
      setLoading(false)
      return
    }

    try {
      await resetPassword(token, password)
      setSuccess('Password reset successful. You can now log in.')
      setTimeout(() => router.push('/auth/login'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-950 p-6 md:flex md:items-center md:justify-center">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-1 text-sm text-slate-300">Provide your new password to finish resetting your account.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} type="password" placeholder="New password" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-500 disabled:opacity-60">
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}

        <p className="mt-4 text-sm text-slate-300">
          Back to{' '}
          <Link className="text-cyan-300 underline" href="/auth/login">login</Link>
        </p>
      </section>
    </main>
  )
}
