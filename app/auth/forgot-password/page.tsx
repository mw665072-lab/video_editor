'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/api'

function FontLoader() {
  useEffect(() => {
    const link = document.createElement('link')
    link.href =
      'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }, [])
  return null
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await forgotPassword(email.trim())
      setSuccess('If account exists, a reset link was sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <FontLoader />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      />
      <main
        style={{
          minHeight: '100vh',
          background: '#05070C',
          color: '#fff',
          fontFamily: "'DM Sans', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(249,115,22,0.13) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(249,115,22,0.06) 0px,rgba(249,115,22,0.06) 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,rgba(249,115,22,0.06) 0px,rgba(249,115,22,0.06) 1px,transparent 1px,transparent 48px)',
        }} />
        <div style={{ position: 'fixed', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(249,115,22,0.09)', filter: 'blur(130px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(249,115,22,0.07)', filter: 'blur(110px)', pointerEvents: 'none', zIndex: 0 }} />

        <section style={{
          position: 'relative', zIndex: 2,
          width: '100%', maxWidth: 420,
          background: 'rgba(15,17,26,0.90)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>

          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18,
            letterSpacing: '-0.03em', textDecoration: 'none', color: '#fff', marginBottom: 32,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #F97316, #FB923C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            CLIPAI
          </a>

          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '4px 12px 4px 8px', borderRadius: 100,
              background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.22)',
              fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#FB923C', marginBottom: 16,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F97316' }} />
              Reset Password
            </div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800,
              letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8,
            }}>
              Forgot your password?
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Enter your email and we’ll send a link to reset your password.
            </p>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{
                display: 'block', fontFamily: "'DM Mono', monospace",
                fontSize: 11, color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              }}>Email</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12, padding: '0 16px', transition: 'border-color 0.2s',
              }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(249,115,22,0.5)')}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="you@example.com"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#fff', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                    padding: '13px 0',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
                fontSize: 13, color: '#F87171',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                fontSize: 13, color: '#34D399',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 24px', borderRadius: 100,
                fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none', letterSpacing: '0.03em', marginTop: 4,
                background: loading
                  ? 'rgba(249,115,22,0.4)'
                  : 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#fff',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(249,115,22,0.4)',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.boxShadow = '0 8px 32px rgba(249,115,22,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(249,115,22,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Sending…
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            Remembered your password?{' '}
            <Link href="/auth/login" style={{
              color: '#FB923C', textDecoration: 'none', fontWeight: 600,
              fontFamily: "'DM Mono', monospace", fontSize: 13,
              transition: 'color 0.2s',
            }}>
              Login →
            </Link>
          </p>
        </section>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </main>
    </>
  )
}
