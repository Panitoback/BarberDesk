import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { todayInToronto, addDaysISO } from '@/lib/dates'

function weekStartISO(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().slice(0, 10)
}

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

const PERIOD_DAYS: Record<string, number> = { '1m': 30, '3m': 91, '6m': 182, '1y': 365 }

export async function GET(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '1m'
  if (!['1m', '3m', '6m', '1y'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const today      = todayInToronto()
  const useMonthly = period === '6m' || period === '1y'

  // For monthly views, align periodStart to the first day of the oldest bucket
  // so all queries (visits, appts) cover exactly the same date range as the chart buckets.
  let periodStart: string
  if (useMonthly) {
    const monthCount = period === '1y' ? 12 : 6
    const ref = new Date(today.slice(0, 7) + '-01T00:00:00Z')
    ref.setUTCMonth(ref.getUTCMonth() - (monthCount - 1))
    periodStart = ref.toISOString().slice(0, 10)
  } else {
    periodStart = addDaysISO(today, -PERIOD_DAYS[period])
  }

  const [
    { data: visitRows },
    { data: apptRows },
    { data: barbers },
    { count: totalClients },
    { count: newClients },
  ] = await Promise.all([
    supabase
      .from('visits')
      .select('date, price, service, client_id')
      .eq('tenant_id', tenant.id)
      .gte('date', periodStart)
      .limit(10000),
    supabase
      .from('appointments')
      .select('status, time, barber_id, date, price')
      .eq('tenant_id', tenant.id)
      .gte('date', periodStart)
      .limit(5000),
    supabase
      .from('barbers')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('is_anonymous', false),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('is_anonymous', false)
      .gte('created_at', periodStart + 'T00:00:00Z'),
  ])

  // ── Revenue buckets ──────────────────────────────────────────────
  const bucketMap = new Map<string, { label: string; revenue: number; visits: number }>()
  const currentWeekISO = weekStartISO(today)

  if (useMonthly) {
    const monthCount = period === '1y' ? 12 : 6
    for (let i = monthCount - 1; i >= 0; i--) {
      const ref = new Date(today.slice(0, 7) + '-01T00:00:00Z')
      ref.setUTCMonth(ref.getUTCMonth() - i)
      const key   = ref.toISOString().slice(0, 7)
      const label = ref.toLocaleDateString('en-CA', {
        month: 'short', year: i === 0 ? 'numeric' : undefined, timeZone: 'UTC',
      })
      bucketMap.set(key, { label, revenue: 0, visits: 0 })
    }
    for (const v of visitRows ?? []) {
      const key = v.date.slice(0, 7)
      const b   = bucketMap.get(key)
      if (b) { b.revenue += v.price ?? 0; b.visits += 1 }
    }
  } else {
    const weekCount = period === '1m' ? 5 : 13
    for (let i = weekCount - 1; i >= 0; i--) {
      const iso = weekStartISO(addDaysISO(today, -i * 7))
      if (!bucketMap.has(iso)) {
        const label = iso === currentWeekISO
          ? 'This wk'
          : new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', {
              month: 'short', day: 'numeric', timeZone: 'UTC',
            })
        bucketMap.set(iso, { label, revenue: 0, visits: 0 })
      }
    }
    for (const v of visitRows ?? []) {
      const b = bucketMap.get(weekStartISO(v.date))
      if (b) { b.revenue += v.price ?? 0; b.visits += 1 }
    }
  }
  const revenueBuckets = Array.from(bucketMap.values())

  // ── Top services ─────────────────────────────────────────────────
  const svcMap = new Map<string, { count: number; revenue: number }>()
  for (const v of visitRows ?? []) {
    const key = v.service ?? 'Other'
    const cur = svcMap.get(key) ?? { count: 0, revenue: 0 }
    svcMap.set(key, { count: cur.count + 1, revenue: cur.revenue + (v.price ?? 0) })
  }
  const topServices = Array.from(svcMap.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7)

  // ── Busiest hours ────────────────────────────────────────────────
  const hourMap = new Map<number, number>()
  for (const a of apptRows ?? []) {
    if (!a.time || a.status === 'cancelled') continue
    const h = parseInt(a.time.split(':')[0], 10)
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1)
  }
  const hoursData = Array.from({ length: 14 }, (_, i) => ({
    hour: 8 + i,
    count: hourMap.get(8 + i) ?? 0,
  }))

  // ── Status breakdown ─────────────────────────────────────────────
  const statusMap = new Map<string, number>()
  for (const a of apptRows ?? []) {
    statusMap.set(a.status, (statusMap.get(a.status) ?? 0) + 1)
  }
  const totalAppts  = Array.from(statusMap.values()).reduce((s, n) => s + n, 0)
  const STATUS_META = [
    { key: 'completed', label: 'Completed' },
    { key: 'pending',   label: 'Upcoming'  },
    { key: 'no_show',   label: 'No-show'   },
    { key: 'cancelled', label: 'Cancelled' },
  ]
  const rawCounts = STATUS_META.map(s => statusMap.get(s.key) ?? 0)
  const pcts      = normalizePcts(rawCounts, totalAppts)
  const statusData = STATUS_META.map((s, i) => ({
    key: s.key, label: s.label, count: rawCounts[i], pct: pcts[i],
  }))

  // ── Revenue by barber ────────────────────────────────────────────
  const barberMap = new Map<string, { name: string; revenue: number; count: number }>()
  for (const b of barbers ?? []) {
    barberMap.set(b.id, { name: b.name, revenue: 0, count: 0 })
  }
  for (const a of apptRows ?? []) {
    if (a.status !== 'completed' || !a.barber_id) continue
    const b = barberMap.get(a.barber_id)
    if (b) { b.revenue += a.price ?? 0; b.count += 1 }
  }
  const barberRevenue = Array.from(barberMap.values())
    .filter(b => b.count > 0)
    .sort((a, b) => b.revenue - a.revenue)

  // ── Retention rate ───────────────────────────────────────────────
  const clientVisitCount = new Map<string, number>()
  for (const v of visitRows ?? []) {
    if (!v.client_id) continue
    clientVisitCount.set(v.client_id, (clientVisitCount.get(v.client_id) ?? 0) + 1)
  }
  const uniqueClientsInPeriod  = clientVisitCount.size
  const returningClientsInPeriod = Array.from(clientVisitCount.values()).filter(n => n >= 2).length
  const retentionRate = uniqueClientsInPeriod > 0
    ? Math.round((returningClientsInPeriod / uniqueClientsInPeriod) * 100)
    : 0

  // ── Summary stats ────────────────────────────────────────────────
  const totalRevenue = revenueBuckets.reduce((s, b) => s + b.revenue, 0)
  const totalVisits  = revenueBuckets.reduce((s, b) => s + b.visits, 0)
  const avgPerVisit  = totalVisits > 0 ? totalRevenue / totalVisits : 0
  const completed    = statusMap.get('completed') ?? 0
  const noShows      = statusMap.get('no_show') ?? 0
  const closedBase   = completed + noShows
  const noShowRate   = closedBase > 0 ? Math.round((noShows / closedBase) * 100) : 0

  return NextResponse.json({
    revenueBuckets,
    topServices,
    hoursData,
    statusData,
    barberRevenue,
    totalAppts,
    summary: {
      totalRevenue,
      avgPerVisit,
      noShowRate,
      totalClients:   totalClients ?? 0,
      newClients:     newClients ?? 0,
      retentionRate,
      uniqueClientsInPeriod,
    },
  })
}
