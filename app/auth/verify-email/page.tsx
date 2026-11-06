'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    <main
      style={{
        minHeight: '100vh',
        background: '#f8f9fd',
        color: '#110d2e',
        fontFamily: "'Manrope', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(88,66,237,0.08) 0%, transparent 65%)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '-10%',
          left: '-5%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(88,66,237,0.07)',
          filter: 'blur(130px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <section
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          border: '1px solid #e4e6f2',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 20px 60px rgba(88,66,237,0.08)',
          textAlign: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '-0.03em',
            textDecoration: 'none',
            color: '#110d2e',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #5842ed 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(88,66,237,0.35)',
            }}
          >
            <span style={{ color: '#fff', fontSize: 16 }}>⚡</span>
          </div>
          <span>VideoHub</span>
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#110d2e', margin: 0, letterSpacing: '-0.02em' }}>
          Email verification
        </h1>
        <p
          style={{
            marginTop: 16,
            fontSize: 14,
            color: status === 'error' ? '#e11d48' : status === 'success' ? '#5842ed' : '#5e6578',
            lineHeight: 1.5,
          }}
        >
          {status === 'loading' ? 'Verifying your email...' : message || 'Waiting...'}
        </p>

        <div style={{ marginTop: 24 }}>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-block',
              borderRadius: 12,
              background: '#5842ed',
              color: '#ffffff',
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(88,66,237,0.25)',
            }}
          >
            Go to Login
          </Link>
        </div>
      </section>
    </main>
  )
}
