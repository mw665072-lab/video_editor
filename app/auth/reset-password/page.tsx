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
      {/* Background glow & accents */}
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
          Reset password
        </h1>
        <p style={{ marginTop: 8, fontSize: 14, color: '#5e6578', lineHeight: 1.5 }}>
          Provide your new password to finish resetting your account.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5e6578', marginBottom: 6 }}>
              NEW PASSWORD
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              type="password"
              placeholder="••••••••"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: 12,
                border: '1px solid #e4e6f2',
                background: '#f8f9fd',
                padding: '12px 14px',
                fontSize: 14,
                color: '#110d2e',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              borderRadius: 12,
              background: '#5842ed',
              color: '#ffffff',
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(88,66,237,0.25)',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        {error && (
          <p style={{ marginTop: 16, fontSize: 13, color: '#e11d48', background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: 8, padding: '8px 12px' }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ marginTop: 16, fontSize: 13, color: '#5842ed', background: '#f0eeff', border: '1px solid #ded7fb', borderRadius: 8, padding: '8px 12px' }}>
            {success}
          </p>
        )}

        <p style={{ marginTop: 24, fontSize: 13, color: '#5e6578', textAlign: 'center' }}>
          Back to{' '}
          <Link href="/auth/login" style={{ color: '#5842ed', fontWeight: 600, textDecoration: 'none' }}>
            Login
          </Link>
        </p>
      </section>
    </main>
  )
}
