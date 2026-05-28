import { NextResponse } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateTenantConfig, SERVICE_DURATIONS } from '@/lib/tenant-config'
import {
  getSlotsForDate,
  getStartableSlots,
  expandTakenSlots,
  expandBlockedSlots,
} from '@/lib/slots'

export async function GET(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) {
    return NextResponse.json({ error: 'No subdomain' }, { status: 400 })
  }

  const url = new URL(request.url)
  const date = url.searchParams.get('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const durationRaw = Number(url.searchParams.get('duration') ?? '30')
  const duration = (SERVICE_DURATIONS as readonly number[]).includes(durationRaw)
    ? durationRaw
    : 30

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) {
    return NextResponse.json({ taken: [] satisfies string[], slots: [] satisfies string[] })
  }

  const cfgResult = validateTenantConfig(tenant.config ?? {})
  const config = cfgResult.ok ? cfgResult.config : null

  const [{ data: appts }, { data: blocks }] = await Promise.all([
    supabase
      .from('appointments')
      .select('time, duration_min')
      .eq('tenant_id', tenant.id)
      .eq('date', date)
      .in('status', ['pending', 'completed']),
    supabase
      .from('time_blocks')
      .select('start_time, end_time, all_day')
      .eq('tenant_id', tenant.id)
      .eq('date', date),
  ])

  const daySlots = getSlotsForDate(config, date)

  // Expand each booking to ALL the 30-min slots it occupies, so a 60-min
  // booking at 10:00 prevents another booking from starting at 10:30.
  const takenFromAppts = expandTakenSlots(
    (appts ?? []).map(a => ({
      time: a.time.slice(0, 5),
      duration_min: a.duration_min ?? 30,
    })),
  )
  const takenFromBlocks = expandBlockedSlots(blocks ?? [], daySlots)
  const taken = Array.from(new Set([...takenFromAppts, ...takenFromBlocks]))

  // Slots where a new booking of `duration` minutes can START. A slot is
  // returned only if it AND the following slots needed for the duration are
  // all free and inside opening hours.
  const slots = getStartableSlots(config, date, taken, duration)

  // Backward compatibility: legacy callers that don't pass `duration` get the
  // pre-feature behaviour — slots = all opening-hour slots, regardless of fit.
  const responseSlots = url.searchParams.get('duration') === null
    ? daySlots
    : slots

  return NextResponse.json({ taken, slots: responseSlots })
}
