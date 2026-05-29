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
import { effectiveHoursForBarber, type BarberHours } from '@/lib/barbers'

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

  const barberIdParam = url.searchParams.get('barber_id') // 'any' | uuid | null

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, config, multi_barber')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) {
    return NextResponse.json({ taken: [] satisfies string[], slots: [] satisfies string[] })
  }

  const cfgResult = validateTenantConfig(tenant.config ?? {})
  const config = cfgResult.ok ? cfgResult.config : null

  // Ignore barber_id param for shops without multi-barber enabled
  const effectiveBarberParam = tenant.multi_barber ? barberIdParam : null

  // No barber_id param → legacy single-barber mode (shop-wide query)
  if (!effectiveBarberParam || effectiveBarberParam === 'any') {
    const [{ data: appts }, { data: blocks }] = await Promise.all([
      supabase
        .from('appointments')
        .select('time, duration_min, barber_id')
        .eq('tenant_id', tenant.id)
        .eq('date', date)
        .in('status', ['pending', 'completed']),
      supabase
        .from('time_blocks')
        .select('start_time, end_time, all_day, barber_id')
        .eq('tenant_id', tenant.id)
        .eq('date', date),
    ])

    if (effectiveBarberParam !== 'any') {
      // Legacy: shop-wide taken + all slots
      const daySlots = getSlotsForDate(config, date)
      const takenFromAppts = expandTakenSlots(
        (appts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 })),
      )
      const takenFromBlocks = expandBlockedSlots(blocks ?? [], daySlots)
      const taken = Array.from(new Set([...takenFromAppts, ...takenFromBlocks]))
      const slots = getStartableSlots(config, date, taken, duration)
      const responseSlots = url.searchParams.get('duration') === null ? daySlots : slots
      return NextResponse.json({ taken, slots: responseSlots })
    }

    // barber_id=any: a slot is available if AT LEAST ONE active barber has it free
    const { data: activeBarbers } = await supabase
      .from('barbers')
      .select('id, hours')
      .eq('tenant_id', tenant.id)
      .eq('active', true)

    if (!activeBarbers || activeBarbers.length === 0) {
      // No barbers configured — fall back to shop-wide slots
      const daySlots = getSlotsForDate(config, date)
      const takenFromAppts = expandTakenSlots(
        (appts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 })),
      )
      const takenFromBlocks = expandBlockedSlots(blocks ?? [], daySlots)
      const taken = Array.from(new Set([...takenFromAppts, ...takenFromBlocks]))
      const slots = getStartableSlots(config, date, taken, duration)
      return NextResponse.json({ taken, slots })
    }

    // Shop-wide blocks (barber_id IS NULL) apply to all barbers
    const shopWideBlocks = (blocks ?? []).filter(b => b.barber_id === null)

    const availableSlots = new Set<string>()
    const takenByAny = new Set<string>()

    for (const b of activeBarbers) {
      const barberHours = effectiveHoursForBarber({ hours: b.hours as BarberHours | null }, config ?? {})
      const effectiveConfig = barberHours ? { ...config, hours: barberHours } : config

      const barberAppts = (appts ?? []).filter(
        a => a.barber_id === b.id || a.barber_id === null,
      )
      const barberBlocks = [
        ...shopWideBlocks,
        ...(blocks ?? []).filter(bl => bl.barber_id === b.id),
      ]

      const daySlots = getSlotsForDate(effectiveConfig, date)
      const taken = Array.from(new Set([
        ...expandTakenSlots(barberAppts.map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 }))),
        ...expandBlockedSlots(barberBlocks, daySlots),
      ]))

      const startable = getStartableSlots(effectiveConfig, date, taken, duration)
      for (const s of startable) availableSlots.add(s)
      for (const s of taken) takenByAny.add(s)
    }

    return NextResponse.json({
      taken: Array.from(takenByAny).sort(),
      slots: Array.from(availableSlots).sort(),
    })
  }

  // Specific barber_id
  const [{ data: barber }, { data: appts }, { data: blocks }] = await Promise.all([
    supabase
      .from('barbers')
      .select('id, hours, active')
      .eq('id', effectiveBarberParam!)
      .eq('tenant_id', tenant.id)
      .single(),
    supabase
      .from('appointments')
      .select('time, duration_min')
      .eq('tenant_id', tenant.id)
      .eq('date', date)
      .in('status', ['pending', 'completed'])
      .or(`barber_id.eq.${effectiveBarberParam},barber_id.is.null`),
    supabase
      .from('time_blocks')
      .select('start_time, end_time, all_day')
      .eq('tenant_id', tenant.id)
      .eq('date', date)
      .or(`barber_id.eq.${effectiveBarberParam},barber_id.is.null`),
  ])

  if (!barber || !barber.active) {
    return NextResponse.json({ taken: [] satisfies string[], slots: [] satisfies string[] })
  }

  const barberHours = effectiveHoursForBarber({ hours: barber.hours as BarberHours | null }, config ?? {})
  const effectiveConfig = barberHours ? { ...config, hours: barberHours } : config

  const daySlots = getSlotsForDate(effectiveConfig, date)
  const taken = Array.from(new Set([
    ...expandTakenSlots(
      (appts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 })),
    ),
    ...expandBlockedSlots(blocks ?? [], daySlots),
  ]))
  const slots = getStartableSlots(effectiveConfig, date, taken, duration)

  return NextResponse.json({ taken, slots })
}
