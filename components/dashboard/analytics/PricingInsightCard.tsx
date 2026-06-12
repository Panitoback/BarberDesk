'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'

type InsightData =
  | { hasEnoughData: false; totalCompleted: number }
  | { hasEnoughData: true; hasSignificantDifference: false; totalCompleted: number }
  | {
      hasEnoughData: true
      hasSignificantDifference: true
      totalCompleted: number
      ratio: number
      busiestDay: string
      slowestDay: string
      busiestCount: number
      slowestCount: number
    }

const DISMISS_KEY  = 'bq_pricing_dismissed_at'
const DISMISS_DAYS = 7

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY)
    if (!ts) return false
    const age = (Date.now() - parseInt(ts, 10)) / 86_400_000
    return age < DISMISS_DAYS
  } catch {
    return false
  }
}

export default function PricingInsightCard() {
  const [insight,   setInsight]   = useState<InsightData | null>(null)
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    setDismissed(isDismissed())
    void fetch('/api/analytics/pricing')
      .then(r => r.json() as Promise<InsightData>)
      .then(setInsight)
      .catch(() => {/* silent */})
  }, [])

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* noop */ }
    setDismissed(true)
  }

  if (dismissed) return null
  if (!insight) return null
  if (!insight.hasEnoughData) return null
  if (!insight.hasSignificantDifference) return null

  const { ratio, busiestDay, slowestDay } = insight

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
      <div className="shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-amber-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          Pricing insight
        </p>
        <p className="text-sm text-amber-800 mt-1">
          Your <strong>{busiestDay}s</strong> are <strong>{ratio}×</strong> busier than your{' '}
          <strong>{slowestDay}s</strong> — you could charge <strong>$5–10 more</strong> on peak
          days, or offer a small discount on slower days to fill those slots.
        </p>
        <p className="text-xs text-amber-600 mt-2">
          Suggestion only — no prices are changed automatically.
        </p>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
