'use client'

import { useState } from 'react'
import { Gift, ChevronDown, ChevronUp } from 'lucide-react'
import type { LoyaltyReward } from '@/lib/loyalty'

type Props = {
  clientId:    string
  initialStars: number
  rewards:     LoyaltyReward[]
}

export default function LoyaltyStarsPanel({ clientId, initialStars, rewards }: Props) {
  const [stars,     setStars]     = useState(initialStars)
  const [expanded,  setExpanded]  = useState(false)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [feedback,  setFeedback]  = useState<{ rewardId: string; msg: string; ok: boolean } | null>(null)

  const activeRewards = rewards.filter(r => r.active)

  async function redeem(reward: LoyaltyReward) {
    if (stars < reward.stars_required) return
    if (!confirm(`Redeem "${reward.name}" for ${reward.stars_required} ⭐?`)) return
    setRedeeming(reward.id)
    setFeedback(null)
    try {
      const res  = await fetch('/api/loyalty/redeem', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id: clientId, reward_id: reward.id }),
      })
      const json = await res.json() as { new_stars?: number; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setStars(json.new_stars ?? stars - reward.stars_required)
      setFeedback({ rewardId: reward.id, msg: 'Redeemed!', ok: true })
    } catch (err) {
      setFeedback({ rewardId: reward.id, msg: err instanceof Error ? err.message : 'Error', ok: false })
    } finally {
      setRedeeming(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      {/* Stars count header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{stars}</p>
            <p className="text-xs text-slate-400 mt-0.5">stars earned</p>
          </div>
        </div>
        {activeRewards.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 px-3 py-2 rounded-xl border border-indigo-200 hover:border-indigo-300 transition-colors"
          >
            <Gift className="w-4 h-4" />
            Redeem
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Rewards list */}
      {expanded && activeRewards.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Available rewards</p>
          {activeRewards.map(r => {
            const canRedeem = stars >= r.stars_required
            const isThis    = redeeming === r.id
            const fb        = feedback?.rewardId === r.id ? feedback : null
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${canRedeem ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                  {r.description && (
                    <p className="text-xs text-slate-400 truncate">{r.description}</p>
                  )}
                  <p className="text-xs font-semibold text-amber-600 mt-0.5">⭐ {r.stars_required} stars</p>
                  {fb && (
                    <p className={`text-xs mt-0.5 font-medium ${fb.ok ? 'text-green-600' : 'text-red-600'}`}>{fb.msg}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => redeem(r)}
                  disabled={!canRedeem || !!redeeming}
                  className="shrink-0 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed min-h-[34px] transition-colors"
                >
                  {isThis ? '…' : 'Redeem'}
                </button>
              </div>
            )
          })}
          {activeRewards.every(r => stars < r.stars_required) && (
            <p className="text-xs text-slate-400 italic pt-1">Not enough stars for any reward yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
