'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wallet, ChevronLeft, ChevronRight } from 'lucide-react'
import { todayInToronto } from '@/lib/dates'

type PayrollRow = {
  barber_id:       string
  name:            string
  commission_pct:  number
  completed_count: number
  gross_revenue:   number
  barber_earns:    number
  owner_keeps:     number
}

type Period = 'week' | 'month' | 'custom'

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

function weekStart(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function PayrollPage() {
  const [period, setPeriod]     = useState<Period>('month')
  const [offset, setOffset]     = useState(0)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd]     = useState('')
  const [rows, setRows]         = useState<PayrollRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const { start, end, label } = getRange(period, offset, customStart, customEnd)

  const load = useCallback(async () => {
    if (!start || !end) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/payroll?start=${start}&end=${end}`)
      const json = await res.json() as { rows?: PayrollRow[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setRows(json.rows ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [start, end])

  useEffect(() => { void load() }, [load])

  const totalRevenue = rows.reduce((s, r) => s + r.gross_revenue, 0)
  const totalEarns   = rows.reduce((s, r) => s + r.barber_earns, 0)
  const totalKeeps   = rows.reduce((s, r) => s + r.owner_keeps, 0)
  const totalJobs    = rows.reduce((s, r) => s + r.completed_count, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payroll</h1>
          <p className="text-sm text-slate-500">How much you owe each barber this period</p>
        </div>
      </div>

      {/* Period controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
          {(['week', 'month', 'custom'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setOffset(0) }}
              className={`px-4 py-2 capitalize transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Custom'}
            </button>
          ))}
        </div>

        {period !== 'custom' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(o => o - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-700 min-w-[160px] text-center font-medium">{label}</span>
            <button
              onClick={() => setOffset(o => o + 1)}
              disabled={offset >= 0}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {period === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Revenue" value={fmt(totalRevenue)} sub={`${totalJobs} jobs`} />
        <SummaryCard label="Barbers Earn" value={fmt(totalEarns)} accent />
        <SummaryCard label="You Keep" value={fmt(totalKeeps)} />
        <SummaryCard label="Barbers" value={String(rows.length)} sub="active" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {error && (
          <div className="px-6 py-4 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
        )}

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No completed appointments in this period.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 font-medium text-slate-500">Barber</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Jobs</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Revenue</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Commission</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500 text-indigo-600">You Owe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.barber_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-medium text-slate-900">{r.name}</span>
                  </td>
                  <td className="px-4 py-4 text-right text-slate-600">{r.completed_count}</td>
                  <td className="px-4 py-4 text-right text-slate-700">{fmt(r.gross_revenue)}</td>
                  <td className="px-4 py-4 text-right text-slate-500">{r.commission_pct}%</td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-semibold text-indigo-600">{fmt(r.barber_earns)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="px-5 py-4 font-semibold text-slate-900">Total</td>
                <td className="px-4 py-4 text-right font-semibold text-slate-700">{totalJobs}</td>
                <td className="px-4 py-4 text-right font-semibold text-slate-700">{fmt(totalRevenue)}</td>
                <td className="px-4 py-4 text-right text-slate-400">—</td>
                <td className="px-5 py-4 text-right font-bold text-indigo-600 text-base">{fmt(totalEarns)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Based on completed appointments in the selected period. You keep {fmt(totalKeeps)} ({totalRevenue > 0 ? Math.round((totalKeeps / totalRevenue) * 100) : 0}% of revenue).
      </p>
    </div>
  )
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100'} shadow-sm`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function getRange(period: Period, offset: number, customStart: string, customEnd: string) {
  const now = new Date(todayInToronto() + 'T12:00:00')

  if (period === 'custom') {
    if (!customStart || !customEnd) return { start: '', end: '', label: 'Select dates' }
    return { start: customStart, end: customEnd, label: `${customStart} – ${customEnd}` }
  }

  if (period === 'week') {
    const base = weekStart(now)
    base.setDate(base.getDate() + offset * 7)
    const end = new Date(base)
    end.setDate(base.getDate() + 6)
    return {
      start: toISO(base),
      end:   toISO(end),
      label: `${base.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`,
    }
  }

  // month
  const year  = now.getFullYear()
  const month = now.getMonth() + offset
  const d = new Date(year, month, 1)
  const start = toISO(d)
  const endD  = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return {
    start,
    end:   toISO(endD),
    label: d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }),
  }
}
