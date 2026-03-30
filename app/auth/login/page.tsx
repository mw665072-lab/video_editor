'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:flex md:items-center md:justify-center">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-300">Log in to manage clips and subscription usage.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" minLength={8} placeholder="Password" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500 disabled:opacity-60">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <p className="mt-4 text-sm text-slate-300">
          Need an account?{' '}
          <Link className="text-cyan-300 underline" href="/auth/register">Register</Link>
        </p>

        <p className="mt-2 text-sm text-slate-300">
          <Link className="text-cyan-300 underline" href="/auth/forgot-password">Forgot password?</Link>
        </p>
      </section>
    </main>
  )
}
