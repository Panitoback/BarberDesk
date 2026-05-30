'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { Service } from '@/lib/tenant-config'
import type { VisitExtra } from '@/lib/extras'

type Extra = { id: number; name: string; price: number }

interface Props {
  service:       string
  basePrice:     number | null
  services:      Service[]
  onClose:       () => void
  onConfirm:     (finalPrice: number | null, extras: VisitExtra[]) => void
  loading:       boolean
  depositPaid?:  boolean
  depositAmount?: number
}

let nextId = 1

export default function CompleteModal({
  service,
  basePrice,
  services,
  onClose,
  onConfirm,
  loading,
  depositPaid  = false,
  depositAmount = 0,
}: Props) {
  const [extras, setExtras]     = useState<Extra[]>([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function addExtra() {
    const svc = services.find(s => s.name === selected)
    if (!svc) return
    setExtras(prev => [...prev, { id: nextId++, name: svc.name, price: svc.price_cad }])
    setSelected('')
  }

  function removeExtra(id: number) {
    setExtras(prev => prev.filter(e => e.id !== id))
  }

  const extrasTotal     = extras.reduce((sum, e) => sum + e.price, 0)
  const total           = (basePrice ?? 0) + extrasTotal
  const hasPrice        = basePrice !== null || extrasTotal > 0
  const finalPrice      = hasPrice ? total : null
  const showDeposit     = depositPaid && depositAmount > 0 && hasPrice
  const remaining       = showDeposit ? Math.max(0, total - depositAmount) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Complete appointment</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Base service */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Service</p>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-slate-900">{service}</span>
              <span className="text-sm text-slate-600 font-mono">
                {basePrice !== null
                  ? `$${basePrice.toFixed(2)}`
                  : <span className="text-slate-300">—</span>}
              </span>
            </div>
          </div>

          {/* Extra services */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Extra services</p>

            {services.length > 0 ? (
              <div className="flex gap-2 mb-3">
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a service…</option>
                  {services.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} · ${s.price_cad.toFixed(2)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addExtra}
                  disabled={!selected}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-3">No services configured in Settings.</p>
            )}

            {extras.length > 0 && (
              <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                {extras.map(e => (
                  <li key={e.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-800">{e.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-slate-600">${e.price.toFixed(2)}</span>
                      <button
                        onClick={() => removeExtra(e.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Total + deposit breakdown */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {hasPrice
                  ? `$${total.toFixed(2)} CAD`
                  : <span className="text-slate-400 text-sm font-normal">No price set</span>}
              </span>
            </div>
            {showDeposit && (
              <>
                <div className="flex items-center justify-between text-sm text-emerald-700">
                  <span>Deposit paid</span>
                  <span className="font-mono">− ${depositAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-900">Collect from client</span>
                  <span className="text-lg font-bold text-amber-600 font-mono">${remaining!.toFixed(2)} CAD</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(finalPrice, extras.map(({ name, price }) => ({ name, price })))}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Confirm complete'}
          </button>
        </div>

      </div>
    </div>
  )
}
