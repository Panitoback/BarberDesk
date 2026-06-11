'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, DollarSign, AlertCircle, Users, UserPlus, Repeat2 } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import RevenueChart from '@/components/dashboard/analytics/RevenueChart'
import TopServicesChart from '@/components/dashboard/analytics/TopServicesChart'
import HoursChart from '@/components/dashboard/analytics/HoursChart'
import StatusChart from '@/components/dashboard/analytics/StatusChart'
import BarberRevenueChart from '@/components/dashboard/analytics/BarberRevenueChart'

type Period = '1m' | '3m' | '6m' | '1y'

const PERIOD_LABELS: Record<Period, string> = {
  '1m': '1M', '3m': '3M', '6m': '6M', '1y': '1Y',
}

type AnalyticsData = {
  revenueBuckets: { label: string; revenue: number; visits: number }[]
  topServices:    { name: string; count: number; revenue: number }[]
  hoursData:      { hour: number; count: number }[]
  statusData:     { key: string; label: string; count: number; pct: number }[]
  barberRevenue:  { name: string; revenue: number; count: number }[]
  totalAppts:     number
  summary: {
    totalRevenue:          number
    avgPerVisit:           number
    noShowRate:            number
    totalClients:          number
    newClients:            number
    retentionRate:         number
    uniqueClientsInPeriod: number
  }
}

const PERIOD_DESCRIPTIONS: Record<Period, string> = {
  '1m': 'Last 30 days',
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '1y': 'Last 12 months',
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('1m')
  const [data, setData]     = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/analytics?period=${period}`)
      const json = await res.json() as AnalyticsData & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to load analytics')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { void load() }, [load])

  const s = data?.summary

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header + period picker */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">{PERIOD_DESCRIPTIONS[period]}</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-5 py-3 border border-red-100">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          label="Revenue"
          value={s ? `$${s.totalRevenue.toFixed(2)}` : '—'}
          icon={TrendingUp}
          description="CAD · completed visits"
        />
        <StatsCard
          label="Avg per visit"
          value={s ? `$${s.avgPerVisit.toFixed(2)}` : '—'}
          icon={DollarSign}
          description="This period"
        />
        <StatsCard
          label="No-show rate"
          value={s ? `${s.noShowRate}%` : '—'}
          icon={AlertCircle}
          description="Of completed + no-shows"
        />
        <StatsCard
          label="Total clients"
          value={s ? s.totalClients : '—'}
          icon={Users}
          description="Registered (all time)"
        />
        <StatsCard
          label="New clients"
          value={s ? s.newClients : '—'}
          icon={UserPlus}
          description="Joined this period"
        />
        <StatsCard
          label="Retention"
          value={s ? `${s.retentionRate}%` : '—'}
          icon={Repeat2}
          description={s ? `${s.uniqueClientsInPeriod} unique visitors` : 'Clients with 2+ visits'}
        />
      </div>

      {loading && (
        <div className="text-center text-sm text-slate-400 py-8">Loading…</div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue trend */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Revenue trend</h2>
            <p className="text-xs text-slate-400 mb-5">
              {period === '6m' || period === '1y' ? 'Monthly' : 'Weekly'} · completed visits · hover for details
            </p>
            <RevenueChart data={data.revenueBuckets} />
          </div>

          {/* Top services */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Top services</h2>
            <p className="text-xs text-slate-400 mb-5">Ranked by revenue · this period</p>
            <TopServicesChart data={data.topServices} />
          </div>

          {/* Busiest times */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Busiest times</h2>
            <p className="text-xs text-slate-400 mb-5">8 am – 9 pm · non-cancelled · hover for details</p>
            <HoursChart data={data.hoursData} />
          </div>

          {/* Revenue by barber — only shown in multi-barber setups */}
          {data.barberRevenue.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-1">Revenue by barber</h2>
              <p className="text-xs text-slate-400 mb-5">Completed appointments · this period</p>
              <BarberRevenueChart data={data.barberRevenue} />
            </div>
          )}

          {/* Status breakdown */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${data.barberRevenue.length > 0 ? '' : 'lg:col-span-2'}`}>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Appointment status</h2>
            <p className="text-xs text-slate-400 mb-5">{data.totalAppts} total · this period</p>
            <StatusChart data={data.statusData} total={data.totalAppts} />
          </div>
        </div>
      )}
    </div>
  )
}
