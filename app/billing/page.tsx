'use client'

import { useEffect, useState } from 'react'
import { getProfile, createSubscriptionCheckout } from '@/lib/api'
import { PageShell } from '@/components/layout/PageShell'

const plans = [
  { key: 'FREE', label: 'Free', priceLabel: '$0', subLabel: '/ month', features: ['150 clips / month', '150 downloads / month'] },
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
    style={{ background: 'rgba(34,163,83,0.16)', border: '1px solid rgba(34,163,83,0.28)' }}
  >
    <svg className="h-2.5 w-2.5" viewBox="0 0 10 8" fill="none">
      <path d="M1 4l3 3 5-6" stroke="#d99b00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
)

export default function BillingPage() {
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Anonymous users can view plans during the public MVP period.
    getProfile().then((data) => setUser(data.user)).catch(() => setUser(null))
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
    user?.subscriptionPlan === 'FREE' ? 150 : user?.subscriptionPlan === 'BASIC' ? 500 : 700
  const usagePct = clipsLimit > 0 ? Math.min((clipsUsed / clipsLimit) * 100, 100) : 0

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: '#f6f7fb',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(34,163,83,0.16) 0%, transparent 28%), radial-gradient(circle at 80% 18%, rgba(255,179,44,0.08) 0%, transparent 24%)',
      }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,163,83,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,179,44,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute top-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full blur-[120px] opacity-20"
        style={{ background: '#22a653' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-80px] right-[-80px] w-[260px] h-[260px] rounded-full blur-[120px] opacity-10"
        style={{ background: '#15803d' }}
      />

      <div className="relative z-10">
        <PageShell title="Subscription billing" subtitle="Manage your plan and usage">

          {/* ── Error banner ── */}
          {error && (
            <div
              className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
              }}
            >
              {error}
            </div>
          )}

          {/* ── Current plan summary ── */}
          <section
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
            style={{
              background: 'rgba(255,255,255,0.94)',
              border: '1px solid #dce5dc',
              boxShadow: '0 10px 30px rgba(31,52,36,0.08)',
            }}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <p className="text-sm font-bold text-slate-950">Current plan</p>
                {user && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-black tracking-wide"
                    style={{
                      background: 'linear-gradient(135deg, #d99b00 0%, #b77900 100%)',
                      color: 'white',
                      boxShadow: '0 1px 8px rgba(217,155,0,0.3)',
                    }}
                  >
                    {user.subscriptionPlan}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium" style={{ color: '#667069' }}>
                {user ? 'Renews monthly · billed automatically' : 'Loading…'}
              </p>
            </div>

            {user && (
              <div className="min-w-[180px] flex-1 max-w-[260px]">
                <div className="mb-1.5 flex justify-between text-xs font-semibold" style={{ color: '#667069' }}>
                  <span>Clips used</span>
                  <span style={{ color: '#166534' }}>{clipsUsed} / {clipsLimit}</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ background: '#eef1f6' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${usagePct}%`,
                      background: 'linear-gradient(90deg, #d99b00 0%, #b77900 100%)',
                      boxShadow: '0 0 6px rgba(217,155,0,0.4)',
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
                          background: '#ffffff',
                          border: '2px solid rgba(21,128,61,0.52)',
                          boxShadow: '0 0 0 1px rgba(21,128,61,0.06), 0 14px 38px rgba(31,52,36,0.12)',
                        }
                      : {
                          background: '#ffffff',
                          border: '1px solid #dce5dc',
                          boxShadow: '0 8px 26px rgba(31,52,36,0.08)',
                        }
                  }
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <span
                      className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg px-3 py-0.5 text-[11px] font-black tracking-wide whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(135deg, #d99b00 0%, #b77900 100%)',
                        color: '#493b00',
                        boxShadow: '0 2px 10px rgba(217,155,0,0.4)',
                      }}
                    >
                      Most popular
                    </span>
                  )}

                  {/* Plan name + price */}
                  <div className={plan.popular ? 'mt-4' : ''}>
                    <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#166534' }}>
                      {plan.label}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-950">{plan.priceLabel}</span>
                      <span className="text-sm font-semibold" style={{ color: '#667069' }}>{plan.subLabel}</span>
                    </div>
                  </div>

                  <div className="my-4" style={{ borderTop: '1px solid rgba(34,163,83,0.14)' }} />

                  {/* Features */}
                  <ul className="flex flex-1 flex-col gap-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-slate-950">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Config warning */}
                  {!hasPrice && plan.key !== 'FREE' && (
                    <p className="mt-3 text-xs" style={{ color: '#8a6700' }}>
                      Price ID not configured. Set{' '}
                      <code className="font-mono" style={{ color: '#d99b00' }}>
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
                        background: '#edf7ef',
                        border: '1px solid rgba(34,163,83,0.16)',
                        color: '#166534',
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
                              background: 'linear-gradient(135deg, #d99b00 0%, #b77900 100%)',
                              color: '#493b00',
                              boxShadow: '0 2px 14px rgba(217,155,0,0.35)',
                            }
                          : {
                              background: '#edf7ef',
                              border: '1px solid rgba(34,163,83,0.14)',
                              color: '#166534',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isDisabled && !plan.popular) {
                        e.currentTarget.style.background = '#e1f2e5'
                        e.currentTarget.style.borderColor = 'rgba(34,163,83,0.5)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!plan.popular) {
                        e.currentTarget.style.background = '#edf7ef'
                        e.currentTarget.style.borderColor = 'rgba(34,163,83,0.14)'
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
