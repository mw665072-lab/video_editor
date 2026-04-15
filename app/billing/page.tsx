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
  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-50">
    <svg className="h-2.5 w-2.5" viewBox="0 0 10 8" fill="none">
      <path d="M1 4l3 3 5-6" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
    <PageShell title="Subscription billing" subtitle="Manage your plan and usage">

      {/* ── Error banner ── */}
      {error && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* ── Current plan summary ── */}
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="text-sm font-medium text-slate-100">Current plan</p>
            {user && (
              <span className="rounded-full bg-teal-900/50 px-2.5 py-0.5 text-xs font-medium tracking-wide text-teal-300 ring-1 ring-teal-700/50">
                {user.subscriptionPlan}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {user ? 'Renews monthly · billed automatically' : 'Loading…'}
          </p>
        </div>

        {user && (
          <div className="min-w-[180px] flex-1 max-w-[260px]">
            <div className="mb-1.5 flex justify-between text-xs text-slate-400">
              <span>Clips used</span>
              <span>{clipsUsed} / {clipsLimit}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{ width: `${usagePct}%` }}
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
              className={[
                'relative flex flex-col rounded-xl p-5 transition-all',
                plan.popular
                  ? 'border-2 border-blue-500/60 bg-slate-900/60'
                  : 'border border-slate-700/60 bg-slate-900/40',
              ].join(' ')}
            >
              {/* Popular badge */}
              {plan.popular && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg bg-blue-900/60 px-3 py-0.5 text-[11px] font-medium tracking-wide text-blue-300 ring-1 ring-blue-700/50">
                  Most popular
                </span>
              )}

              {/* Plan name + price */}
              <div className={plan.popular ? 'mt-4' : ''}>
                <h3 className="text-sm font-medium text-slate-200">{plan.label}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-100">{plan.priceLabel}</span>
                  <span className="text-sm text-slate-400">{plan.subLabel}</span>
                </div>
              </div>

              <hr className="my-4 border-slate-700/50" />

              {/* Features */}
              <ul className="flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Config warning */}
              {!hasPrice && plan.key !== 'FREE' && (
                <p className="mt-3 text-xs text-amber-400/80">
                  Price ID not configured. Set{' '}
                  <code className="font-mono text-amber-300">
                    NEXT_PUBLIC_STRIPE_PRICE_{plan.key}
                  </code>{' '}
                  in environment.
                </p>
              )}

              {/* CTA */}
              {isCurrent ? (
                <p className="mt-5 text-center text-xs text-slate-500">Current plan</p>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={isDisabled}
                  className={[
                    'mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40',
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'border border-slate-600 bg-transparent text-slate-200 hover:border-slate-400 hover:bg-slate-800',
                  ].join(' ')}
                >
                  {hasPrice ? 'Select plan' : 'Unavailable'}
                </button>
              )}
            </article>
          )
        })}
      </div>

    </PageShell>
  )
}