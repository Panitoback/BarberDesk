import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'
import { getStartableSlots, getSlotsForDate, expandTakenSlots, expandBlockedSlots } from '@/lib/slots'
import { todayInToronto, isPastInToronto, formatDateTimeForSms } from '@/lib/dates'
import { sendSms } from '@/lib/twilio'
import { applyPriceModifier, effectiveHoursForBarber, type BarberHours } from '@/lib/barbers'

function normalizePhone(input: string): string | null {
  const digits = (input ?? '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  return null
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return s >= todayInToronto()
}

function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):(00|30)$/.test(s)
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    client_name: rawName,
    client_phone: rawPhone,
    service: rawService,
    date: rawDate,
    time: rawTime,
    barber_id: rawBarberId,
  } = body as Record<string, unknown>

  const clientName  = typeof rawName     === 'string' ? rawName.trim()     : ''
  const clientPhone = typeof rawPhone    === 'string' ? rawPhone.trim()    : ''
  const service     = typeof rawService  === 'string' ? rawService.trim()  : ''
  const date        = typeof rawDate     === 'string' ? rawDate.trim()     : ''
  const time        = typeof rawTime     === 'string' ? rawTime.trim()     : ''
  const barberIdRaw = typeof rawBarberId === 'string' ? rawBarberId.trim() : null

  if (clientName.length < 2) return NextResponse.json({ error: 'Client name is required.' }, { status: 400 })
  if (!service)              return NextResponse.json({ error: 'Service is required.' }, { status: 400 })
  if (!isValidDate(date))    return NextResponse.json({ error: 'Pick a valid date (today or later).' }, { status: 400 })
  if (!isValidTime(time))    return NextResponse.json({ error: 'Pick a valid time slot.' }, { status: 400 })
  if (isPastInToronto(date, time)) return NextResponse.json({ error: 'That time is in the past.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const cfgResult = validateTenantConfig(tenant.config ?? {})
  const services  = cfgResult.ok ? (cfgResult.config.services ?? []) : []
  const matched   = services.find(s => s.name === service)
  if (!matched) return NextResponse.json({ error: 'Service not found.' }, { status: 400 })

  const config = cfgResult.ok ? cfgResult.config : null

  // Resolve barber
  let assignedBarber: { id: string; name: string; email: string | null; price_modifier: number } | null = null

  if (barberIdRaw && barberIdRaw !== 'any') {
    // Specific barber
    const { data: specificBarber } = await supabase
      .from('barbers')
      .select('id, name, email, hours, price_modifier, active')
      .eq('id', barberIdRaw)
      .eq('tenant_id', tenant.id)
      .single()

    if (!specificBarber || !specificBarber.active) {
      return NextResponse.json({ error: 'The selected barber is not available.' }, { status: 400 })
    }

    const barberHours = effectiveHoursForBarber({ hours: specificBarber.hours as BarberHours | null }, config ?? {})
    const fakeConfig = { ...config, hours: barberHours }

    const [{ data: barberAppts }, { data: barberBlocks }] = await Promise.all([
      supabase
        .from('appointments')
        .select('time, duration_min')
        .eq('tenant_id', tenant.id)
        .eq('date', date)
        .or(`barber_id.eq.${specificBarber.id},barber_id.is.null`)
        .in('status', ['pending', 'completed']),
      supabase
        .from('time_blocks')
        .select('start_time, end_time, all_day')
        .eq('tenant_id', tenant.id)
        .eq('date', date)
        .or(`barber_id.eq.${specificBarber.id},barber_id.is.null`),
    ])

    const daySlots = getSlotsForDate(fakeConfig, date)
    const taken = Array.from(new Set([
      ...expandTakenSlots(
        (barberAppts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 })),
      ),
      ...expandBlockedSlots(barberBlocks ?? [], daySlots),
    ]))
    if (!getStartableSlots(fakeConfig, date, taken, matched.duration_min).includes(time)) {
      return NextResponse.json({ error: 'That barber is not available at the chosen time.' }, { status: 409 })
    }

    assignedBarber = { id: specificBarber.id, name: specificBarber.name, email: specificBarber.email, price_modifier: specificBarber.price_modifier }
  } else {
    // 'any' or no barber_id: try auto-assign if shop has barbers
    const { data: activeBarbers } = await supabase
      .from('barbers')
      .select('id, name, email, hours, price_modifier')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('display_order', { ascending: true })

    if (activeBarbers && activeBarbers.length > 0) {
      const { data: todayAppts } = await supabase
        .from('appointments')
        .select('barber_id')
        .eq('tenant_id', tenant.id)
        .eq('date', date)
        .in('status', ['pending', 'completed'])
        .not('barber_id', 'is', null)

      const countByBarber = new Map<string, number>()
      for (const a of todayAppts ?? []) {
        if (a.barber_id) countByBarber.set(a.barber_id, (countByBarber.get(a.barber_id) ?? 0) + 1)
      }

      const sorted = [...activeBarbers].sort(
        (a, b) => (countByBarber.get(a.id) ?? 0) - (countByBarber.get(b.id) ?? 0),
      )

      const { data: allBlocks } = await supabase
        .from('time_blocks')
        .select('start_time, end_time, all_day, barber_id')
        .eq('tenant_id', tenant.id)
        .eq('date', date)

      const shopWideBlocks = (allBlocks ?? []).filter(b => b.barber_id === null)

      for (const b of sorted) {
        const barberHours = effectiveHoursForBarber({ hours: b.hours as BarberHours | null }, config ?? {})
        const fakeConfig = { ...config, hours: barberHours }
        const { data: bAppts } = await supabase
          .from('appointments')
          .select('time, duration_min')
          .eq('tenant_id', tenant.id)
          .eq('date', date)
          .eq('barber_id', b.id)
          .in('status', ['pending', 'completed'])

        const bBlocks = [...shopWideBlocks, ...(allBlocks ?? []).filter(bl => bl.barber_id === b.id)]
        const daySlots = getSlotsForDate(fakeConfig, date)
        const taken = Array.from(new Set([
          ...expandTakenSlots((bAppts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 }))),
          ...expandBlockedSlots(bBlocks, daySlots),
        ]))

        if (getStartableSlots(fakeConfig, date, taken, matched.duration_min).includes(time)) {
          assignedBarber = { id: b.id, name: b.name, email: b.email, price_modifier: b.price_modifier }
          break
        }
      }

      if (!assignedBarber) {
        return NextResponse.json({ error: 'No barber is available at that time.' }, { status: 409 })
      }
    }
  }

  // If no barbers at all, validate shop-wide
  if (!assignedBarber) {
    const [{ data: dayAppts }, { data: dayBlocks }] = await Promise.all([
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
    const takenSlots = Array.from(new Set([
      ...expandTakenSlots(
        (dayAppts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 })),
      ),
      ...expandBlockedSlots(dayBlocks ?? [], daySlots),
    ]))
    if (!getStartableSlots(config, date, takenSlots, matched.duration_min).includes(time)) {
      return NextResponse.json({ error: 'That time is not available for the chosen service.' }, { status: 409 })
    }
  }

  const finalPrice = assignedBarber
    ? applyPriceModifier(matched.price_cad, assignedBarber.price_modifier)
    : matched.price_cad

  const phone = clientPhone ? (normalizePhone(clientPhone) ?? null) : null

  let clientId: string

  if (phone) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      clientId = existing.id
      await supabase.from('clients').update({ name: clientName }).eq('id', existing.id)
    } else {
      const { data: created, error } = await supabase
        .from('clients')
        .insert({ tenant_id: tenant.id, name: clientName, phone })
        .select('id')
        .single()
      if (error || !created) return NextResponse.json({ error: 'Could not create client.' }, { status: 500 })
      clientId = created.id
    }
  } else {
    const { data: created, error } = await supabase
      .from('clients')
      .insert({ tenant_id: tenant.id, name: clientName, phone: null })
      .select('id')
      .single()
    if (error || !created) return NextResponse.json({ error: 'Could not create client.' }, { status: 500 })
    clientId = created.id
  }

  const { error: apptErr } = await supabase
    .from('appointments')
    .insert({
      tenant_id:    tenant.id,
      client_id:    clientId,
      date,
      time,
      service,
      price:        finalPrice,
      duration_min: matched.duration_min,
      barber_id:    assignedBarber?.id ?? null,
      status:       'pending',
    })

  if (apptErr) {
    if (apptErr.code === '23505') {
      return NextResponse.json({ error: 'That slot is already taken.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not save appointment.' }, { status: 500 })
  }

  // Update preferred_barber_id (fire-and-forget)
  if (assignedBarber) {
    const bid = assignedBarber.id
    const cid = clientId
    after(async () => {
      try { await supabase.from('clients').update({ preferred_barber_id: bid }).eq('id', cid) } catch {}
    })
  }

  // Barber notification email
  const resendKey = process.env.RESEND_API_KEY
  if (assignedBarber?.email && resendKey) {
    const barberEmail = assignedBarber.email
    const barberName  = assignedBarber.name
    after(async () => {
      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from:    `BarberQueue <noreply@barberqueue.pro>`,
          to:      [barberEmail],
          subject: `New booking — ${clientName} at ${time} (${service})`,
          html:    `<p>Hi ${barberName},</p><p>You have a new booking:</p><p><strong>Client:</strong> ${clientName}<br><strong>Service:</strong> ${service}<br><strong>When:</strong> ${formatDateTimeForSms(date, time)}<br><strong>Duration:</strong> ${matched.duration_min} min</p>`,
        }),
      }).catch(() => {})
    })
  }

  if (phone) {
    const firstName = clientName.split(' ')[0]
    const barberSuffix = assignedBarber ? ` with ${assignedBarber.name}` : ''
    const smsBody = `Hi ${firstName}, your ${service}${barberSuffix} at ${tenant.name} is confirmed for ${formatDateTimeForSms(date, time)}.`
    try {
      const sid = await sendSms(phone, smsBody)
      await supabase.from('messages').insert({
        tenant_id:  tenant.id,
        client_id:  clientId,
        direction:  'outbound',
        body:       smsBody,
        status:     'sent',
        twilio_sid: sid,
      })
    } catch {
      await supabase.from('messages').insert({
        tenant_id: tenant.id,
        client_id: clientId,
        direction: 'outbound',
        body:      smsBody,
        status:    'failed',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
