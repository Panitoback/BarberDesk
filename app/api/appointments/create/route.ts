import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'
import { getStartableSlots, getSlotsForDate, expandTakenSlots, expandBlockedSlots } from '@/lib/slots'
import { todayInToronto, isPastInToronto, formatDateTimeForSms } from '@/lib/dates'
import { sendSms } from '@/lib/twilio'

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

  const { client_name: rawName, client_phone: rawPhone, service: rawService, date: rawDate, time: rawTime } = body as {
    client_name?: unknown; client_phone?: unknown; service?: unknown; date?: unknown; time?: unknown
  }

  const clientName = typeof rawName    === 'string' ? rawName.trim()    : ''
  const clientPhone = typeof rawPhone  === 'string' ? rawPhone.trim()   : ''
  const service     = typeof rawService === 'string' ? rawService.trim() : ''
  const date        = typeof rawDate   === 'string' ? rawDate.trim()    : ''
  const time        = typeof rawTime   === 'string' ? rawTime.trim()    : ''

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

  const daySlots = getSlotsForDate(cfgResult.ok ? cfgResult.config : null, date)
  const takenSlots = Array.from(new Set([
    ...expandTakenSlots(
      (dayAppts ?? []).map(a => ({
        time: a.time.slice(0, 5),
        duration_min: a.duration_min ?? 30,
      })),
    ),
    ...expandBlockedSlots(dayBlocks ?? [], daySlots),
  ]))
  const startableSlots = getStartableSlots(
    cfgResult.ok ? cfgResult.config : null,
    date,
    takenSlots,
    matched.duration_min,
  )
  if (!startableSlots.includes(time)) {
    return NextResponse.json({ error: 'That time is not available for the chosen service.' }, { status: 409 })
  }

  const phone = clientPhone ? (normalizePhone(clientPhone) ?? null) : null

  // Try to find existing client by phone, otherwise create one
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
      // Update name in case the owner is correcting a previous entry
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
      tenant_id: tenant.id,
      client_id: clientId,
      date,
      time,
      service,
      price:  matched.price_cad,
      duration_min: matched.duration_min,
      status: 'pending',
    })

  if (apptErr) {
    if (apptErr.code === '23505') {
      return NextResponse.json({ error: 'That slot is already taken.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not save appointment.' }, { status: 500 })
  }

  // Best-effort confirmation SMS — only when client has a phone number.
  if (phone) {
    const firstName = clientName.split(' ')[0]
    const smsBody = `Hi ${firstName}, your ${service} at ${tenant!.name} is confirmed for ${formatDateTimeForSms(date, time)}.`
    try {
      const sid = await sendSms(phone, smsBody)
      await supabase.from('messages').insert({
        tenant_id:  tenant!.id,
        client_id:  clientId,
        direction:  'outbound',
        body:       smsBody,
        status:     'sent',
        twilio_sid: sid,
      })
    } catch {
      await supabase.from('messages').insert({
        tenant_id: tenant!.id,
        client_id: clientId,
        direction: 'outbound',
        body:      smsBody,
        status:    'failed',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
