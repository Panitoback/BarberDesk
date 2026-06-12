import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { todayInToronto } from '@/lib/dates'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MIN_APPOINTMENTS = 10
const MIN_RATIO = 1.8

export async function GET() {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = await createClient()

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  if (!tenantRow) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const today = todayInToronto()
  const fromDate = new Date(today + 'T00:00:00')
  fromDate.setDate(fromDate.getDate() - 60)
  const fromISO = fromDate.toISOString().slice(0, 10)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('date')
    .eq('tenant_id', tenantRow.id)
    .eq('status', 'completed')
    .gte('date', fromISO)

  const total = appointments?.length ?? 0

  if (total < MIN_APPOINTMENTS) {
    return NextResponse.json({ hasEnoughData: false, totalCompleted: total })
  }

  // Group by day of week (0=Sun … 6=Sat)
  const dowCounts: Record<number, number> = {}
  for (const appt of appointments!) {
    const dow = new Date(appt.date + 'T12:00:00').getDay()
    dowCounts[dow] = (dowCounts[dow] ?? 0) + 1
  }

  const dowEntries = Object.entries(dowCounts)
    .map(([d, count]) => ({ dow: parseInt(d, 10), name: DAY_NAMES[parseInt(d, 10)], count }))
    .sort((a, b) => b.count - a.count)

  if (dowEntries.length < 2) {
    return NextResponse.json({ hasEnoughData: true, hasSignificantDifference: false, totalCompleted: total })
  }

  const busiest = dowEntries[0]
  const slowest = dowEntries[dowEntries.length - 1]
  const ratio   = slowest.count > 0 ? busiest.count / slowest.count : 0

  if (ratio < MIN_RATIO) {
    return NextResponse.json({
      hasEnoughData: true,
      hasSignificantDifference: false,
      totalCompleted: total,
    })
  }

  return NextResponse.json({
    hasEnoughData: true,
    hasSignificantDifference: true,
    totalCompleted: total,
    ratio: Math.round(ratio * 10) / 10,
    busiestDay: busiest.name,
    slowestDay: slowest.name,
    busiestCount: busiest.count,
    slowestCount: slowest.count,
  })
}
