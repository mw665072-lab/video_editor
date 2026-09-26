'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'

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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

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
    <>
      <FontLoader />

      {/* noise overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
      }} />

      <main style={{
        minHeight: '100vh',
        background: '#f6f7fb',
        color: '#172033',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* background glow */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(21,128,61,0.13) 0%, transparent 65%)',
        }} />
        {/* wire grid */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(21,128,61,0.06) 0px,rgba(21,128,61,0.06) 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,rgba(21,128,61,0.06) 0px,rgba(21,128,61,0.06) 1px,transparent 1px,transparent 48px)',
        }} />
        {/* orbs */}
        <div style={{ position: 'fixed', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(21,128,61,0.09)', filter: 'blur(130px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(21,128,61,0.07)', filter: 'blur(110px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* card */}
        <section style={{
          position: 'relative', zIndex: 2,
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(23,32,51,0.10)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 28px 80px rgba(38,49,72,0.16), 0 0 0 1px rgba(23,32,51,0.04) inset',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>

          {/* logo */}
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18,
            letterSpacing: '-0.03em', textDecoration: 'none', color: '#172033', marginBottom: 32,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #15803D, #22A653)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            CLIPAI
          </a>

          {/* heading */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '4px 12px 4px 8px', borderRadius: 100,
              background: 'rgba(21,128,61,0.10)', border: '1px solid rgba(21,128,61,0.22)',
              fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#22A653', marginBottom: 16,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#15803D' }} />
              Secure Login
            </div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800,
              letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8,
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(104,115,134,0.92)', lineHeight: 1.6 }}>
              Log in to manage clips and subscription usage.
            </p>
          </div>

          {/* form */}
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* email */}
            <div>
              <label style={{
                display: 'block', fontFamily: "'DM Mono', monospace",
                fontSize: 11, color: 'rgba(104,115,134,0.88)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              }}>Email</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(23,32,51,0.04)', border: '1px solid rgba(23,32,51,0.10)',
                borderRadius: 12, padding: '0 16px',
                transition: 'border-color 0.2s',
              }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(21,128,61,0.5)')}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(23,32,51,0.10)')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(104,115,134,0.72)" strokeWidth="2">
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
                    color: '#172033', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                    padding: '13px 0',
                  }}
                />
              </div>
            </div>

            {/* password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11, color: 'rgba(104,115,134,0.88)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>Password</label>
                <Link href="/auth/forgot-password" style={{
                  fontSize: 12, color: '#22A653', textDecoration: 'none',
                  fontFamily: "'DM Mono', monospace",
                  transition: 'color 0.2s',
                }}>Forgot password?</Link>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(23,32,51,0.04)', border: '1px solid rgba(23,32,51,0.10)',
                borderRadius: 12, padding: '0 16px',
                transition: 'border-color 0.2s',
              }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(21,128,61,0.5)')}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(23,32,51,0.10)')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(104,115,134,0.72)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPass ? 'text' : 'password'}
                  minLength={8}
                  placeholder="Min. 8 characters"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#172033', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                    padding: '13px 0',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(104,115,134,0.72)', display: 'flex', alignItems: 'center' }}
                >
                  {showPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* error */}
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

            {/* submit */}
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
                  ? 'rgba(21,128,61,0.4)'
                  : 'linear-gradient(135deg, #15803D, #166534)',
                color: '#ffffff',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(21,128,61,0.4)',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.boxShadow = '0 8px 32px rgba(21,128,61,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(21,128,61,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Login
                </>
              )}
            </button>
          </form>

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(23,32,51,0.08)' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8a94a5' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(23,32,51,0.08)' }} />
          </div>

          {/* register link */}
          <p style={{ textAlign: 'center', fontSize: 14, color: '#687386' }}>
            Need an account?{' '}
            <Link href="/auth/register" style={{
              color: '#22A653', textDecoration: 'none', fontWeight: 600,
              fontFamily: "'DM Mono', monospace", fontSize: 13,
              transition: 'color 0.2s',
            }}>
              Register →
            </Link>
          </p>
        </section>

        {/* spin keyframe */}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </main>
    </>
  )
}
