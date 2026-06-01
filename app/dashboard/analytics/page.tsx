import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { todayInToronto, addDaysISO } from '@/lib/dates'
import { TrendingUp, DollarSign, AlertCircle, Users } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import RevenueChart from '@/components/dashboard/analytics/RevenueChart'
import TopServicesChart from '@/components/dashboard/analytics/TopServicesChart'
import HoursChart from '@/components/dashboard/analytics/HoursChart'
import StatusChart from '@/components/dashboard/analytics/StatusChart'

// Returns the ISO date of the Monday of the week containing dateISO (UTC-stable).
function weekStartISO(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00Z')
  const day = d.getUTCDay() // 0 = Sun
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().slice(0, 10)
}

function weekLabel(iso: string, isCurrent: boolean): string {
  if (isCurrent) return 'This wk'
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

// Largest-remainder normalization — ensures percentages sum to exactly 100.
function normalizePcts(counts: number[], total: number): number[] {
  if (total === 0) return counts.map(() => 0)
  const floats  = counts.map(c => (c / total) * 100)
  const floors  = floats.map(Math.floor)
  const deficit = 100 - floors.reduce((s, n) => s + n, 0)
  floats.map((f, i) => ({ i, rem: f - floors[i] }))
        .sort((a, b) => b.rem - a.rem)
        .slice(0, deficit)
        .forEach(({ i }) => { floors[i]++ })
  return floors
}

export default async function AnalyticsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')
  if (!tenant.onboardingDone) redirect('/setup')

  const supabase = await createClient()

  const today         = todayInToronto()
  const firstOfMonth  = `${today.slice(0, 7)}-01`
  const eightWeeksAgo = addDaysISO(today, -56)
  const thirtyDaysAgo = addDaysISO(today, -30)

  const [
    { data: visitRows },
    { data: apptStatusRows },
    { data: apptHourRows },
    { count: totalClients },
  ] = await Promise.all([
    supabase
      .from('visits')
      .select('date, price, service')
      .eq('tenant_id', tenant.id)
      .gte('date', eightWeeksAgo)
      .limit(5000),
    supabase
      .from('appointments')
      .select('status')
      .eq('tenant_id', tenant.id)
      .gte('date', firstOfMonth)
      .limit(2000),
    supabase
      .from('appointments')
      .select('time')
      .eq('tenant_id', tenant.id)
      .neq('status', 'cancelled')
      .not('time', 'is', null)
      .gte('date', thirtyDaysAgo)
      .limit(2000),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('is_anonymous', false),
  ])

  // ── Weekly revenue — 8 week buckets, oldest first ─────────────
  const currentWeekISO = weekStartISO(today)
  const weekMap = new Map<string, { label: string; revenue: number; visits: number }>()
  for (let i = 7; i >= 0; i--) {
    const iso = weekStartISO(addDaysISO(today, -i * 7))
    if (!weekMap.has(iso)) {
      weekMap.set(iso, { label: weekLabel(iso, iso === currentWeekISO), revenue: 0, visits: 0 })
    }
  }
  for (const v of visitRows ?? []) {
    const b = weekMap.get(weekStartISO(v.date))
    if (b) { b.revenue += v.price ?? 0; b.visits += 1 }
  }
  const weeklyData = Array.from(weekMap.values())

  // ── Top services — last 30 days, by revenue ───────────────────
  const svcMap = new Map<string, { count: number; revenue: number }>()
  for (const v of visitRows ?? []) {
    if (v.date < thirtyDaysAgo) continue
    const key = v.service ?? 'Other'
    const cur = svcMap.get(key) ?? { count: 0, revenue: 0 }
    svcMap.set(key, { count: cur.count + 1, revenue: cur.revenue + (v.price ?? 0) })
  }
  const topServices = Array.from(svcMap.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7)

  // ── Busiest hours — last 30 days, 8 am–9 pm ──────────────────
  const hourMap = new Map<number, number>()
  for (const a of apptHourRows ?? []) {
    const h = parseInt(a.time.split(':')[0], 10)
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1)
  }
  const hoursData = Array.from({ length: 14 }, (_, i) => ({
    hour: 8 + i,
    count: hourMap.get(8 + i) ?? 0,
  }))

  // ── Status breakdown — this month ─────────────────────────────
  const statusMap = new Map<string, number>()
  for (const a of apptStatusRows ?? []) {
    statusMap.set(a.status, (statusMap.get(a.status) ?? 0) + 1)
  }
  const totalAppts = Array.from(statusMap.values()).reduce((s, n) => s + n, 0)
  const STATUS_META = [
    { key: 'completed', label: 'Completed' },
    { key: 'pending',   label: 'Upcoming'  },
    { key: 'no_show',   label: 'No-show'   },
    { key: 'cancelled', label: 'Cancelled' },
  ]
  const rawCounts = STATUS_META.map(s => statusMap.get(s.key) ?? 0)
  const pcts      = normalizePcts(rawCounts, totalAppts)
  const statusData = STATUS_META.map((s, i) => ({
    key:   s.key,
    label: s.label,
    count: rawCounts[i],
    pct:   pcts[i],
  }))

  // ── Summary stats ──────────────────────────────────────────────
  const monthVisits  = visitRows?.filter(v => v.date >= firstOfMonth) ?? []
  const monthRevenue = monthVisits.reduce((s, v) => s + (v.price ?? 0), 0)
  const avgPerVisit  = monthVisits.length > 0 ? monthRevenue / monthVisits.length : 0
  const completed    = statusMap.get('completed') ?? 0
  const noShows      = statusMap.get('no_show')   ?? 0
  const closedBase   = completed + noShows
  const noShowRate   = closedBase > 0 ? Math.round((noShows / closedBase) * 100) : 0

  const monthLabel = new Date(firstOfMonth + 'T12:00:00Z').toLocaleDateString('en-CA', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">{monthLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Revenue this month"
          value={`$${monthRevenue.toFixed(2)}`}
          icon={TrendingUp}
          description="CAD"
        />
        <StatsCard
          label="Avg per visit"
          value={`$${avgPerVisit.toFixed(2)}`}
          icon={DollarSign}
          description="This month"
        />
        <StatsCard
          label="No-show rate"
          value={`${noShowRate}%`}
          icon={AlertCircle}
          description="Of completed + no-shows"
        />
        <StatsCard
          label="Registered clients"
          value={totalClients ?? 0}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue trend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Revenue · last 8 weeks</h2>
          <p className="text-xs text-slate-400 mb-5">Week-by-week from completed visits · hover for details</p>
          <RevenueChart data={weeklyData} />
        </div>

        {/* Top services */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Top services · last 30 days</h2>
          <p className="text-xs text-slate-400 mb-5">Ranked by revenue</p>
          <TopServicesChart data={topServices} />
        </div>

        {/* Busiest times */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Busiest times · last 30 days</h2>
          <p className="text-xs text-slate-400 mb-5">8 am – 9 pm · non-cancelled · hover for details</p>
          <HoursChart data={hoursData} />
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Appointments · this month</h2>
          <p className="text-xs text-slate-400 mb-5">{totalAppts} total</p>
          <StatusChart data={statusData} total={totalAppts} />
        </div>
      </div>
    </div>
  )
}
