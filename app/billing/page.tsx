'use client'

import { useEffect, useState } from 'react'
import { getProfile, createSubscriptionCheckout } from '@/lib/api'
import { PageShell } from '@/components/PageShell'

const plans = [
  { key: 'FREE', label: 'Free', priceLabel: '$0', features: ['5 clips/month', '5 downloads/month'] },
  {
    key: 'BASIC',
    label: 'Basic',
    priceLabel: '$6 / month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ID,
    features: ['500 downloads/month', 'Priority processing'],
  },
  {
    key: 'PRO',
    label: 'Pro',
    priceLabel: '$8 / month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ID,
    features: ['700 downloads/month', 'Faster clips', 'No watermark'],
  },
]

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

  return (
    <PageShell title="Subscription Billing" subtitle="Update your plan and billing settings">
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-lg font-semibold">Your plan</h2>
        {user ? (
          <p className="mt-2 text-sm text-slate-200">
            {user.subscriptionPlan} plan • {user.clipsThisMonth}/{user.subscriptionPlan === 'FREE' ? 5 : user.subscriptionPlan === 'BASIC' ? 500 : 700} clips used
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-300">Loading...</p>
        )}
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.key === user?.subscriptionPlan
          const hasPrice = !!plan.priceId
          const isDisabled = isCurrent || loading || (!hasPrice && plan.key !== 'FREE')

          return (
            <article key={plan.key} className="rounded-xl border border-slate-700 bg-slate-950/30 p-4">
              <h3 className="text-lg font-semibold">{plan.label}</h3>
              <p className="mt-1 text-sm text-slate-300">{plan.priceLabel}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-200">
                {(plan.features || []).map((f) => (<li key={f}>• {f}</li>))}
              </ul>
              {!hasPrice && plan.key !== 'FREE' && (
                <p className="mt-2 text-xs text-amber-300">Price ID not configured. Set NEXT_PUBLIC_STRIPE_PRICE_{plan.key} in environment.</p>
              )}
              <button
                onClick={() => handleCheckout(plan.priceId)}
                disabled={isDisabled}
                className="mt-4 w-full rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                {isCurrent ? 'Current plan' : hasPrice ? 'Select' : 'Unavailable'}
              </button>
            </article>
          )
        })}
      </div>
    </PageShell>
  )
}
