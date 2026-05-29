import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'
import { todayInToronto, nowTimeInToronto } from '@/lib/dates'
import { logError } from '@/lib/error-logger'
import { parseExtras } from '@/lib/extras'
import { applyPriceModifier, effectiveHoursForBarber, type BarberHours } from '@/lib/barbers'
import { getSlotsForDate, expandTakenSlots, expandBlockedSlots } from '@/lib/slots'

function normalizePhone(input: string): string | null {
  const digits = (input ?? '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  return null
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    service: rawService,
    name: rawName,
    phone: rawPhone,
    final_price: rawFinalPrice,
    extras: rawExtras,
    barber_id: rawBarberId,
  } = body as Record<string, unknown>

  const service    = typeof rawService    === 'string' ? rawService.trim() : ''
  const name       = typeof rawName       === 'string' ? rawName.trim()    : ''
  const phone      = typeof rawPhone      === 'string' ? rawPhone.trim()   : ''
  const finalPrice = typeof rawFinalPrice === 'number' && rawFinalPrice >= 0 ? rawFinalPrice : null
  const extras     = parseExtras(rawExtras)
  const barberIdRaw = typeof rawBarberId === 'string' ? rawBarberId.trim() : null

  if (!service) return NextResponse.json({ error: 'service is required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const cfgResult = validateTenantConfig(tenant.config ?? {})
  const services  = cfgResult.ok ? (cfgResult.config.services ?? []) : []
  const matched   = services.find(s => s.name === service)
  if (!matched) return NextResponse.json({ error: 'Service not found' }, { status: 400 })

  const config = cfgResult.ok ? cfgResult.config : null
  const today  = todayInToronto()
  const now    = nowTimeInToronto()

  // Resolve barber
  let assignedBarberId: string | null = null
  let priceModifier = 1.0

  if (barberIdRaw && barberIdRaw !== 'any') {
    const { data: b } = await supabase
      .from('barbers')
      .select('id, price_modifier, active')
      .eq('id', barberIdRaw)
      .eq('tenant_id', tenant.id)
      .single()

    if (b?.active) {
      assignedBarberId = b.id
      priceModifier = b.price_modifier
    }
  } else {
    // Auto-assign least-loaded active barber
    const { data: activeBarbers } = await supabase
      .from('barbers')
      .select('id, hours, price_modifier')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('display_order', { ascending: true })

    if (activeBarbers && activeBarbers.length > 0) {
      const { data: todayAppts } = await supabase
        .from('appointments')
        .select('barber_id')
        .eq('tenant_id', tenant.id)
        .eq('date', today)
        .in('status', ['pending', 'completed'])
        .not('barber_id', 'is', null)

      const countByBarber = new Map<string, number>()
      for (const a of todayAppts ?? []) {
        if (a.barber_id) countByBarber.set(a.barber_id, (countByBarber.get(a.barber_id) ?? 0) + 1)
      }

      const { data: todayBlocks } = await supabase
        .from('time_blocks')
        .select('start_time, end_time, all_day, barber_id')
        .eq('tenant_id', tenant.id)
        .eq('date', today)

      const shopWideBlocks = (todayBlocks ?? []).filter(b => b.barber_id === null)

      const sorted = [...activeBarbers].sort(
        (a, b) => (countByBarber.get(a.id) ?? 0) - (countByBarber.get(b.id) ?? 0),
      )

      for (const b of sorted) {
        const barberHours = effectiveHoursForBarber({ hours: b.hours as BarberHours | null }, config ?? {})
        const fakeConfig = barberHours ? { ...config, hours: barberHours } : config
        const { data: bAppts } = await supabase
          .from('appointments')
          .select('time, duration_min')
          .eq('tenant_id', tenant.id)
          .eq('date', today)
          .eq('barber_id', b.id)
          .in('status', ['pending', 'completed'])

        const bBlocks = [...shopWideBlocks, ...(todayBlocks ?? []).filter(bl => bl.barber_id === b.id)]
        const daySlots = getSlotsForDate(fakeConfig, today)
        const taken = Array.from(new Set([
          ...expandTakenSlots((bAppts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 }))),
          ...expandBlockedSlots(bBlocks, daySlots),
        ]))

        // Walk-in: pick first least-loaded barber whose hours are open now
        // (slots are on a 30-min grid; round current minute down to nearest 30)
        const [nowH, nowM] = now.split(':').map(Number)
        const nowRounded = `${String(nowH).padStart(2, '0')}:${nowM < 30 ? '00' : '30'}`
        const takenSet = new Set(taken)
        if (daySlots.length > 0 && !takenSet.has(nowRounded)) {
          assignedBarberId = b.id
          priceModifier = b.price_modifier
          break
        }
      }

      // If none free right now, fall back to least-loaded — owner is present and can decide
      if (!assignedBarberId && sorted.length > 0) {
        assignedBarberId = sorted[0].id
        priceModifier = sorted[0].price_modifier
      }
    }
  }

  const finalPriceWithModifier = finalPrice !== null
    ? finalPrice // manual override takes precedence
    : applyPriceModifier(matched.price_cad, priceModifier)

  const hasName     = name.length >= 2
  const clientName  = hasName ? name : 'Walk-in'
  const clientPhone = phone ? (normalizePhone(phone) ?? null) : null

  let clientId: string

  if (clientPhone) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('phone', clientPhone)
      .maybeSingle()

    if (existing) {
      clientId = existing.id
      await supabase.from('clients').update({ name: clientName }).eq('id', existing.id)
    } else {
      const { data: created, error: clientErr } = await supabase
        .from('clients')
        .insert({ tenant_id: tenant.id, name: clientName, phone: clientPhone })
        .select('id')
        .single()

      if (clientErr || !created) {
        await logError({
          route: '/api/walkin', method: 'POST', status: 500, tenantId: tenant.id, userId: user.id,
          message: clientErr?.message ?? 'client_insert_failed',
          errorCode: clientErr?.code ?? null,
          metadata: { stage: 'insert_client' },
          requestBody: { service, name: clientName, phone: clientPhone },
        })
        return NextResponse.json({ error: 'Could not create client record' }, { status: 500 })
      }
      clientId = created.id
    }
  } else if (hasName) {
    const { data: created, error: clientErr } = await supabase
      .from('clients')
      .insert({ tenant_id: tenant.id, name: clientName, phone: null })
      .select('id')
      .single()

    if (clientErr || !created) {
      await logError({
        route: '/api/walkin', method: 'POST', status: 500, tenantId: tenant.id, userId: user.id,
        message: clientErr?.message ?? 'client_insert_failed',
        errorCode: clientErr?.code ?? null,
        metadata: { stage: 'insert_client' },
        requestBody: { service, name: clientName, phone: null },
      })
      return NextResponse.json({ error: 'Could not create client record' }, { status: 500 })
    }
    clientId = created.id
  } else {
    const { data: bucket } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('is_anonymous', true)
      .maybeSingle()

    if (bucket) {
      clientId = bucket.id
    } else {
      const { data: created, error: clientErr } = await supabase
        .from('clients')
        .insert({ tenant_id: tenant.id, name: 'Walk-in', phone: null, is_anonymous: true })
        .select('id')
        .single()

      if (clientErr || !created) {
        await logError({
          route: '/api/walkin', method: 'POST', status: 500, tenantId: tenant.id, userId: user.id,
          message: clientErr?.message ?? 'anon_bucket_insert_failed',
          errorCode: clientErr?.code ?? null,
          metadata: { stage: 'insert_anon_bucket' },
        })
        return NextResponse.json({ error: 'Could not create walk-in record' }, { status: 500 })
      }
      clientId = created.id
    }
  }

  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      tenant_id:    tenant.id,
      client_id:    clientId,
      date:         today,
      time:         now,
      service,
      price:        finalPriceWithModifier,
      duration_min: matched.duration_min,
      walkin:       true,
      barber_id:    assignedBarberId,
      status:       'pending',
    })
    .select('id')
    .single()

  if (apptErr || !appt) {
    if (apptErr?.code === '23505') {
      return NextResponse.json(
        { error: 'A walk-in was just recorded at the same time — try again.' },
        { status: 409 }
      )
    }
    await logError({
      route: '/api/walkin', method: 'POST', status: 500, tenantId: tenant.id, userId: user.id,
      message: apptErr?.message ?? 'appointment_insert_failed',
      errorCode: apptErr?.code ?? null,
      metadata: { stage: 'insert_appointment', client_id: clientId },
      requestBody: { service, walkin: true },
    })
    return NextResponse.json({ error: 'Could not create appointment' }, { status: 500 })
  }

  const needsPriceOverride = finalPrice !== null || priceModifier !== 1.0

  const { error: rpcErr } = await supabase.rpc('complete_appointment', {
    p_appointment_id: appt.id,
    p_tenant_id:      tenant.id,
    ...(needsPriceOverride ? { p_price_override: finalPriceWithModifier } : {}),
    ...(extras.length > 0 ? { p_extras: extras } : {}),
  })

  if (rpcErr) {
    await logError({
      route: '/api/walkin', method: 'POST', status: 500, tenantId: tenant.id, userId: user.id,
      message: rpcErr.message ?? 'rpc_complete_appointment_failed',
      errorCode: rpcErr.code ?? null,
      metadata: { stage: 'complete_appointment_rpc', appointment_id: appt.id },
    })
    return NextResponse.json({ error: 'Could not complete walk-in' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
