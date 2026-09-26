'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyEmail } from '@/lib/api'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [token, setToken] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token') || '')
  }, [])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Verification token missing.')
      return
    }

    const run = async () => {
      setStatus('loading')
      try {
        await verifyEmail(token)
        setStatus('success')
        setMessage('Email verified successfully! Redirecting to login...')
        setTimeout(() => router.push('/auth/login'), 1600)
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Email verification failed.')
      }
    }

    run()
  }, [token, router])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-950 p-6 md:flex md:items-center md:justify-center">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Email verification</h1>
        <p className="mt-4 text-sm text-slate-300">
          {status === 'loading' ? 'Verifying your email...' : message || 'Waiting...'}
        </p>
      </section>
    </main>
  )
}
