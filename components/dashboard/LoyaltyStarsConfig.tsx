'use client'

import { useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { LoyaltyMode, LoyaltyReward } from '@/lib/loyalty'

type Props = {
  mode:               LoyaltyMode
  dollarsPerStar:     number
  onModeChange:       (m: LoyaltyMode) => void
  onDollarsChange:    (n: number) => void
  initialRewards:     LoyaltyReward[]
}

export default function LoyaltyStarsConfig({
  mode,
  dollarsPerStar,
  onModeChange,
  onDollarsChange,
  initialRewards,
}: Props) {
  const [rewards,   setRewards]   = useState<LoyaltyReward[]>(initialRewards)
  const [newName,   setNewName]   = useState('')
  const [newStars,  setNewStars]  = useState('10')
  const [newDesc,   setNewDesc]   = useState('')
  const [adding,    setAdding]    = useState(false)
  const [showForm,  setShowForm]  = useState(false)

  async function addReward() {
    const name  = newName.trim()
    const stars = parseInt(newStars, 10)
    if (!name || isNaN(stars) || stars < 1) return
    setAdding(true)
    try {
      const res  = await fetch('/api/loyalty/rewards', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, stars_required: stars, description: newDesc.trim() || null }),
      })
      const json = await res.json() as { reward?: LoyaltyReward; error?: string }
      if (!res.ok) throw new Error(json.error)
      setRewards(r => [...r, json.reward!])
      setNewName('')
      setNewStars('10')
      setNewDesc('')
      setShowForm(false)
    } catch { /* silent — reward list stays unchanged */ }
    finally { setAdding(false) }
  }

  async function toggleActive(id: string, current: boolean) {
    setRewards(r => r.map(x => x.id === id ? { ...x, active: !current } : x))
    await fetch(`/api/loyalty/rewards/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: !current }),
    })
  }

  async function deleteReward(id: string) {
    if (!confirm('Delete this reward?')) return
    setRewards(r => r.filter(x => x.id !== id))
    await fetch(`/api/loyalty/rewards/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="mt-4 pl-[52px] space-y-4">
      {/* Mode selector */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mode</p>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
          {(['levels', 'stars'] as LoyaltyMode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'levels' ? '🏅 Levels' : '⭐ Stars'}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {mode === 'levels'
            ? 'Clients climb Bronze → Silver → Gold → Platinum based on total points.'
            : 'Clients collect stars and redeem them for rewards you define.'}
        </p>
      </div>

      {/* Stars config */}
      {mode === 'stars' && (
        <>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Earning rate</p>
            <label className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
              1 star per
              <div className="flex items-center gap-1">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  inputMode="numeric"
                  value={dollarsPerStar}
                  onChange={e => {
                    const n = parseFloat(e.target.value)
                    if (n >= 1) onDollarsChange(n)
                  }}
                  className="w-20 text-sm border border-slate-300 rounded-lg px-2 py-1.5 min-h-[36px]"
                />
              </div>
              spent
            </label>
            <p className="text-xs text-slate-400 mt-1">
              Min 1 star per visit. E.g. $35 haircut at ${dollarsPerStar}/star = {Math.max(1, Math.floor(35 / dollarsPerStar))} ⭐
            </p>
          </div>

          {/* Rewards list */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rewards</p>
            {rewards.length === 0 && !showForm && (
              <p className="text-sm text-slate-400 italic mb-2">No rewards yet — add one below.</p>
            )}
            <div className="space-y-2">
              {rewards.map(r => (
                <div
                  key={r.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${r.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                    {r.description && (
                      <p className="text-xs text-slate-400 truncate">{r.description}</p>
                    )}
                    <p className="text-xs font-semibold text-amber-600 mt-0.5">⭐ {r.stars_required} stars</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleActive(r.id, r.active)}
                      aria-label={r.active ? 'Deactivate reward' : 'Activate reward'}
                      className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg transition-colors"
                    >
                      {r.active ? <ToggleRight className="w-5 h-5 text-indigo-600" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReward(r.id)}
                      aria-label="Delete reward"
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add reward form */}
            {showForm ? (
              <div className="mt-2 p-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Reward name (e.g. Free beard trim)"
                  maxLength={100}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[36px]"
                />
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  maxLength={200}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[36px]"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-700 whitespace-nowrap">Stars required</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={newStars}
                    onChange={e => setNewStars(e.target.value)}
                    className="w-20 text-sm border border-slate-300 rounded-lg px-2 py-1.5 min-h-[36px]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addReward}
                    disabled={adding || !newName.trim()}
                    className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50 min-h-[36px]"
                  >
                    {adding ? 'Adding…' : 'Add reward'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg min-h-[36px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 hover:border-indigo-400 min-h-[36px]"
              >
                <Plus className="w-4 h-4" /> Add reward
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
