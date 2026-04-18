'use client'

import { useEffect, useState } from 'react'
import { getProfile, createSubscriptionCheckout } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

const plans = [
  { key: 'FREE', label: 'Free', priceLabel: '$0', subLabel: '/ month', features: ['5 clips / month', '5 downloads / month'] },
  {
    key: 'BASIC',
    label: 'Basic',
    priceLabel: '$6',
    subLabel: '/ month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ID,
    features: ['500 downloads / month', 'Priority processing'],
  },
  {
    key: 'PRO',
    label: 'Pro',
    priceLabel: '$8',
    subLabel: '/ month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ID,
    features: ['700 downloads / month', 'Faster clips', 'No watermark'],
    popular: true,
  },
]

const CheckIcon = () => (
  <span
    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
    style={{ background: 'rgba(250,106,0,0.15)', border: '1px solid rgba(250,106,0,0.3)' }}
  >
    <svg className="h-2.5 w-2.5" viewBox="0 0 10 8" fill="none">
      <path d="M1 4l3 3 5-6" stroke="#fa6a00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
)

export default function BillingPage() {
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getProfile().then((data) => setUser(data.user)).catch((err) => setError(err.message))
  }, [])

  const handleCheckout = async (priceId: string | undefined) => {
    if (!priceId) return
    setLoading(true)
    setError('')

    try {
      const result = await createSubscriptionCheckout(priceId)
      if (result.url) window.location.href = result.url
      else setError('Could not create checkout session')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription checkout failed')
    } finally {
      setLoading(false)
    }
  }

  const clipsUsed = user?.clipsThisMonth ?? 0
  const clipsLimit =
    user?.subscriptionPlan === 'FREE' ? 5 : user?.subscriptionPlan === 'BASIC' ? 500 : 700
  const usagePct = clipsLimit > 0 ? Math.min((clipsUsed / clipsLimit) * 100, 100) : 0

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #2d1800 0%, #0d0905 55%, #080604 100%)',
      }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fa6a00 1px, transparent 1px), linear-gradient(90deg, #fa6a00 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute top-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full blur-[120px] opacity-20"
        style={{ background: '#fa6a00' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-80px] right-[-80px] w-[260px] h-[260px] rounded-full blur-[120px] opacity-10"
        style={{ background: '#e84d00' }}
      />

      <div className="relative z-10">
        <PageShell title="Subscription billing" subtitle="Manage your plan and usage">

          {/* ── Error banner ── */}
          {error && (
            <div
              className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{
                background: '#1a0808',
                border: '1px solid #3a1010',
                color: '#e07070',
              }}
            >
              {error}
            </div>
          )}

          {/* ── Current plan summary ── */}
          <section
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
            style={{
              background: '#13100c',
              border: '1px solid #2a1a08',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <p className="text-sm font-bold text-white">Current plan</p>
                {user && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-black tracking-wide"
                    style={{
                      background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                      color: 'white',
                      boxShadow: '0 1px 8px rgba(250,106,0,0.3)',
                    }}
                  >
                    {user.subscriptionPlan}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium" style={{ color: '#4a3020' }}>
                {user ? 'Renews monthly · billed automatically' : 'Loading…'}
              </p>
            </div>

            {user && (
              <div className="min-w-[180px] flex-1 max-w-[260px]">
                <div className="mb-1.5 flex justify-between text-xs font-semibold" style={{ color: '#6b4e2e' }}>
                  <span>Clips used</span>
                  <span style={{ color: '#fa6a00' }}>{clipsUsed} / {clipsLimit}</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ background: '#1a100a' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${usagePct}%`,
                      background: 'linear-gradient(90deg, #fa6a00 0%, #e84d00 100%)',
                      boxShadow: '0 0 6px rgba(250,106,0,0.4)',
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ── Plan cards ── */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.key === user?.subscriptionPlan
              const hasPrice = !!plan.priceId
              const isDisabled = isCurrent || loading || (!hasPrice && plan.key !== 'FREE')

              return (
                <article
                  key={plan.key}
                  className="relative flex flex-col rounded-2xl p-5 transition-all duration-200"
                  style={
                    plan.popular
                      ? {
                          background: '#13100c',
                          border: '2px solid rgba(250,106,0,0.5)',
                          boxShadow: '0 0 0 1px rgba(250,106,0,0.08), 0 8px 32px rgba(0,0,0,0.5)',
                        }
                      : {
                          background: '#13100c',
                          border: '1px solid #2a1a08',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                        }
                  }
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <span
                      className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg px-3 py-0.5 text-[11px] font-black tracking-wide whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                        color: 'white',
                        boxShadow: '0 2px 10px rgba(250,106,0,0.4)',
                      }}
                    >
                      Most popular
                    </span>
                  )}

                  {/* Plan name + price */}
                  <div className={plan.popular ? 'mt-4' : ''}>
                    <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b4e2e' }}>
                      {plan.label}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">{plan.priceLabel}</span>
                      <span className="text-sm font-semibold" style={{ color: '#4a3020' }}>{plan.subLabel}</span>
                    </div>
                  </div>

                  <div className="my-4" style={{ borderTop: '1px solid #2a1a08' }} />

                  {/* Features */}
                  <ul className="flex flex-1 flex-col gap-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-white">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Config warning */}
                  {!hasPrice && plan.key !== 'FREE' && (
                    <p className="mt-3 text-xs" style={{ color: '#c09050' }}>
                      Price ID not configured. Set{' '}
                      <code className="font-mono" style={{ color: '#fa6a00' }}>
                        NEXT_PUBLIC_STRIPE_PRICE_{plan.key}
                      </code>{' '}
                      in environment.
                    </p>
                  )}

                  {/* CTA */}
                  {isCurrent ? (
                    <div
                      className="mt-5 w-full rounded-xl py-2.5 text-center text-xs font-bold uppercase tracking-wider"
                      style={{
                        background: '#1a100a',
                        border: '1px solid #2a1a08',
                        color: '#4a3020',
                      }}
                    >
                      Current plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckout(plan.priceId)}
                      disabled={isDisabled}
                      className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={
                        plan.popular
                          ? {
                              background: 'linear-gradient(135deg, #fa6a00 0%, #e84d00 100%)',
                              color: 'white',
                              boxShadow: '0 2px 14px rgba(250,106,0,0.35)',
                            }
                          : {
                              background: '#1a100a',
                              border: '1px solid #3a2210',
                              color: '#fa6a00',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isDisabled && !plan.popular) {
                          e.currentTarget.style.background = '#2a1a0a'
                          e.currentTarget.style.borderColor = 'rgba(250,106,0,0.5)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!plan.popular) {
                          e.currentTarget.style.background = '#1a100a'
                          e.currentTarget.style.borderColor = '#3a2210'
                        }
                      }}
                    >
                      {hasPrice ? 'Select plan' : 'Unavailable'}
                    </button>
                  )}
                </article>
              )
            })}
          </div>

        </PageShell>
      </div>
    </div>
  )
}