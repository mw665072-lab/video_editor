'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await register(name.trim(), email.trim(), password)
      setSuccess('Registration successful. Please check your email for verification.')
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:flex md:items-center md:justify-center">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-slate-300">Sign up and unlock the first 5 clips each month.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Name" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" minLength={8} placeholder="Password" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500 disabled:opacity-60">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}

        <p className="mt-4 text-sm text-slate-300">
          Already have an account?{' '}
          <Link className="text-cyan-300 underline" href="/auth/login">Login</Link>
        </p>
      </section>
    </main>
  )
}
