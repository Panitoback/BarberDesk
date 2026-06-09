'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarX, Star, Sparkles, MessageCircleHeart, Zap, type LucideIcon } from 'lucide-react'
import LoyaltyStarsConfig from './LoyaltyStarsConfig'
import type { LoyaltyMode, LoyaltyReward } from '@/lib/loyalty'

export type AutomationsState = {
  noshow_active:            boolean
  loyalty_active:           boolean
  loyalty_mode:             LoyaltyMode
  loyalty_dollars_per_star: number
  review_active:            boolean
  reactivation_active:      boolean
  reactivation_days:        number
  flash_active:             boolean
}

type AutomationKey = Exclude<keyof AutomationsState, 'reactivation_days' | 'loyalty_mode' | 'loyalty_dollars_per_star'>

type AutomationCard = {
  key:         AutomationKey
  icon:        LucideIcon
  title:       string
  description: string
}

const CARDS: AutomationCard[] = [
  {
    key:         'noshow_active',
    icon:        CalendarX,
    title:       'No-show recovery',
    description: 'Send a friendly SMS to clients who miss their appointment so they rebook.',
  },
  {
    key:         'loyalty_active',
    icon:        Sparkles,
    title:       'Loyalty program',
    description: 'Reward clients for every visit — choose between levels (Bronze → Platinum) or a stars system with custom rewards.',
  },
  {
    key:         'review_active',
    icon:        Star,
    title:       'Review request',
    description: 'After a completed visit, ask the client for a Google review with your link.',
  },
  {
    key:         'reactivation_active',
    icon:        MessageCircleHeart,
    title:       'Win-back inactive clients',
    description: "Reach out by SMS to clients who haven't come in for a while.",
  },
  {
    key:         'flash_active',
    icon:        Zap,
    title:       'Flash discount on no-show',
    description: "When a client no-shows, instantly email clients who haven't visited in 20+ days with a discount to fill the open slot.",
  },
]

export default function AutomationsForm({
  initial,
  initialRewards = [],
}: {
  initial:         AutomationsState
  initialRewards?: LoyaltyReward[]
}) {
  const router = useRouter()
  const [state,    setState]    = useState<AutomationsState>(initial)
  const [saving,   setSaving]   = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function toggle(key: AutomationKey) {
    setState(s => ({ ...s, [key]: !s[key] }))
  }

  function setDays(value: string) {
    const n = Number(value)
    if (!Number.isFinite(n)) return
    setState(s => ({ ...s, reactivation_days: Math.round(n) }))
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/automations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(state),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      setFeedback({ type: 'success', text: 'Automations saved.' })
      router.refresh()
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {CARDS.map(({ key, icon: Icon, title, description }) => {
        const active = state[key]
        return (
          <section
            key={key}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{description}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={`Toggle ${title}`}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${active ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {key === 'reactivation_active' && active && (
              <div className="mt-4 pl-[52px]">
                <label className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                  Trigger after
                  <input
                    type="number"
                    min="7"
                    max="365"
                    step="1"
                    inputMode="numeric"
                    value={state.reactivation_days}
                    onChange={(e) => setDays(e.target.value)}
                    aria-label="Reactivation days"
                    className="w-20 text-sm border border-slate-300 rounded-lg px-2 py-1.5 min-h-[36px]"
                  />
                  days of no visit
                </label>
              </div>
            )}

            {key === 'loyalty_active' && active && (
              <LoyaltyStarsConfig
                mode={state.loyalty_mode}
                dollarsPerStar={state.loyalty_dollars_per_star}
                onModeChange={m => setState(s => ({ ...s, loyalty_mode: m }))}
                onDollarsChange={n => setState(s => ({ ...s, loyalty_dollars_per_star: n }))}
                initialRewards={initialRewards}
              />
            )}
          </section>
        )
      })}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {feedback ? (
          <p
            role="status"
            className={`text-sm ${feedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}
          >
            {feedback.text}
          </p>
        ) : <span className="hidden sm:block" />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {saving ? 'Saving...' : 'Save automations'}
        </button>
      </div>
    </div>
  )
}
