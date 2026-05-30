import { NextResponse, after } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import {
  todayInToronto,
  isPastInToronto,
  formatDateTimeForSms,
} from '@/lib/dates'
import { validateTenantConfig } from '@/lib/tenant-config'
import { getStartableSlots, getSlotsForDate, expandTakenSlots, expandBlockedSlots } from '@/lib/slots'
import { logError } from '@/lib/error-logger'
import { applyPriceModifier, effectiveHoursForBarber, type BarberHours } from '@/lib/barbers'
import { getStripe } from '@/lib/stripe'
import { normalizePhone } from '@/lib/phone'

const NAME_MIN = 2
const NAME_MAX = 80

const TENANT_BURST_LIMIT = 10
const TENANT_BURST_WINDOW_MS = 60_000
const PHONE_DAILY_LIMIT = 3
const PHONE_DAILY_WINDOW_MS = 24 * 60 * 60_000

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return s >= todayInToronto()
}

function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):(00|30)$/.test(s)
}

/** Pick least-loaded available barber for the given slot. Returns barber or null. */
async function autoAssignBarber(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  date: string,
  time: string,
  durationMin: number,
  shopConfig: ReturnType<typeof validateTenantConfig>,
) {
  const { data: activeBarbers } = await supabase
    .from('barbers')
    .select('id, name, email, hours, price_modifier')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('display_order', { ascending: true })

  if (!activeBarbers || activeBarbers.length === 0) return null

  // Count today's appointments per barber (least-loaded first)
  const today = date
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('barber_id')
    .eq('tenant_id', tenantId)
    .eq('date', today)
    .in('status', ['pending', 'completed'])
    .not('barber_id', 'is', null)

  const countByBarber = new Map<string, number>()
  for (const a of todayAppts ?? []) {
    if (a.barber_id) countByBarber.set(a.barber_id, (countByBarber.get(a.barber_id) ?? 0) + 1)
  }

  // Sort by load ASC, then display_order (already ordered above, stable sort)
  const sorted = [...activeBarbers].sort(
    (a, b) => (countByBarber.get(a.id) ?? 0) - (countByBarber.get(b.id) ?? 0),
  )

  // Shop-wide blocks for the date
  const { data: allBlocks } = await supabase
    .from('time_blocks')
    .select('start_time, end_time, all_day, barber_id')
    .eq('tenant_id', tenantId)
    .eq('date', date)

  const shopWideBlocks = (allBlocks ?? []).filter(b => b.barber_id === null)

  for (const barber of sorted) {
    const config = shopConfig.ok ? shopConfig.config : {}
    const barberHours = effectiveHoursForBarber(
      { hours: barber.hours as BarberHours | null },
      config,
    )
    const fakeConfig = barberHours ? { ...config, hours: barberHours } : config

    const { data: barberAppts } = await supabase
      .from('appointments')
      .select('time, duration_min')
      .eq('tenant_id', tenantId)
      .eq('date', date)
      .eq('barber_id', barber.id)
      .in('status', ['pending', 'completed'])

    const barberSpecificBlocks = (allBlocks ?? []).filter(b => b.barber_id === barber.id)
    const allBarberBlocks = [...shopWideBlocks, ...barberSpecificBlocks]

    const daySlots = getSlotsForDate(fakeConfig, date)
    const taken = Array.from(new Set([
      ...expandTakenSlots(
        (barberAppts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 })),
      ),
      ...expandBlockedSlots(allBarberBlocks, daySlots),
    ]))
    const startable = getStartableSlots(fakeConfig, date, taken, durationMin)

    if (startable.includes(time)) {
      return barber
    }
  }

  return null
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) {
    return NextResponse.json({ error: 'This booking link is invalid.' }, { status: 400 })
  }

  let body: {
    name?:        string
    phone?:       string
    email?:       string
    service?:     string
    date?:        string
    time?:        string
    client_note?: string
    barber_id?:   string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const name    = (body.name ?? '').trim()
  const service = (body.service ?? '').trim()
  const date    = (body.date ?? '').trim()
  const time    = (body.time ?? '').trim()
  const phone   = normalizePhone(body.phone ?? '')
  const email   = (body.email ?? '').trim().toLowerCase() || null
  const barberIdRaw = (body.barber_id ?? '').trim() || null
  const clientNote = (() => {
    const raw = (body.client_note ?? '').trim()
    if (raw.length === 0) return null
    return raw.slice(0, 500)
  })()

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
  }
  if (!phone) {
    return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
  }
  if (!service || service.length > 80) {
    return NextResponse.json({ error: 'Please pick a service.' }, { status: 400 })
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Please pick a date today or later.' }, { status: 400 })
  }
  if (!isValidTime(time)) {
    return NextResponse.json({ error: 'Please pick a valid time.' }, { status: 400 })
  }
  if (isPastInToronto(date, time)) {
    return NextResponse.json({ error: 'That time is in the past.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, plan, config, multi_barber')
    .eq('subdomain', subdomain)
    .single()

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })
  }

  if (tenant.plan === 'suspended') {
    return NextResponse.json(
      { error: 'This shop is not accepting bookings right now. Please contact the shop directly.' },
      { status: 403 }
    )
  }

  const cfgResult = validateTenantConfig(tenant.config ?? {})
  const configuredServices = cfgResult.ok ? (cfgResult.config.services ?? []) : []
  if (configuredServices.length === 0) {
    return NextResponse.json(
      { error: 'This shop has not set up online booking yet. Please contact the shop directly.' },
      { status: 409 }
    )
  }
  const matchedService = configuredServices.find(s => s.name === service)
  if (!matchedService) {
    return NextResponse.json({ error: 'Please pick a service.' }, { status: 400 })
  }
  const serviceDuration = matchedService.duration_min

  // Resolve barber assignment
  let assignedBarber: {
    id: string; name: string; email: string | null; price_modifier: number
  } | null = null

  if (tenant.multi_barber && barberIdRaw && barberIdRaw !== 'any') {
    // Specific barber requested — validate they exist and are available
    const { data: specificBarber } = await supabase
      .from('barbers')
      .select('id, name, email, hours, price_modifier, active')
      .eq('id', barberIdRaw)
      .eq('tenant_id', tenant.id)
      .single()

    if (!specificBarber || !specificBarber.active) {
      return NextResponse.json({ error: 'The selected barber is not available.' }, { status: 400 })
    }

    // Check slot availability for this specific barber
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

    const config = cfgResult.ok ? cfgResult.config : {}
    const barberHours = effectiveHoursForBarber(
      { hours: specificBarber.hours as BarberHours | null },
      config,
    )
    const fakeConfig = barberHours ? { ...config, hours: barberHours } : config
    const daySlots = getSlotsForDate(fakeConfig, date)
    const taken = Array.from(new Set([
      ...expandTakenSlots(
        (barberAppts ?? []).map(a => ({ time: a.time.slice(0, 5), duration_min: a.duration_min ?? 30 })),
      ),
      ...expandBlockedSlots(barberBlocks ?? [], daySlots),
    ]))
    const startable = getStartableSlots(fakeConfig, date, taken, serviceDuration)
    if (!startable.includes(time)) {
      return NextResponse.json(
        { error: 'That barber is not available at the chosen time.' },
        { status: 409 }
      )
    }

    assignedBarber = {
      id: specificBarber.id,
      name: specificBarber.name,
      email: specificBarber.email,
      price_modifier: specificBarber.price_modifier,
    }
  } else if (tenant.multi_barber) {
    // 'any' or no barber_id: check if shop has barbers configured
    const { count: barberCount } = await supabase
      .from('barbers')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('active', true)

    if ((barberCount ?? 0) > 0) {
      // Auto-assign least-loaded
      const picked = await autoAssignBarber(
        supabase, tenant.id, date, time, serviceDuration, cfgResult,
      )
      if (!picked) {
        return NextResponse.json(
          { error: 'No barber is available at that time. Please pick another slot.' },
          { status: 409 }
        )
      }
      assignedBarber = {
        id: picked.id,
        name: picked.name,
        email: picked.email,
        price_modifier: picked.price_modifier,
      }
    }
    // If no barbers configured, assignedBarber stays null → single-barber mode, fall through to shop-wide validation
  }

  // If no barbers configured, run shop-wide slot validation (legacy path)
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

    const config = cfgResult.ok ? cfgResult.config : null
    const daySlots = getSlotsForDate(config, date)
    const takenSlots = Array.from(new Set([
      ...expandTakenSlots(
        (dayAppts ?? []).map(a => ({
          time: a.time.slice(0, 5),
          duration_min: a.duration_min ?? 30,
        })),
      ),
      ...expandBlockedSlots(dayBlocks ?? [], daySlots),
    ]))
    const startableSlots = getStartableSlots(config, date, takenSlots, serviceDuration)
    if (!startableSlots.includes(time)) {
      return NextResponse.json(
        { error: 'That time is not available for the chosen service.' },
        { status: 409 }
      )
    }
  }

  // Compute final price applying barber's price_modifier
  const serviceBasePrice = matchedService.price_cad
  const finalPrice = assignedBarber
    ? applyPriceModifier(serviceBasePrice, assignedBarber.price_modifier)
    : serviceBasePrice

  // Burst guard
  const burstWindowStart = new Date(Date.now() - TENANT_BURST_WINDOW_MS).toISOString()
  const { count: tenantRecent } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .gte('created_at', burstWindowStart)

  if ((tenantRecent ?? 0) >= TENANT_BURST_LIMIT) {
    return NextResponse.json(
      { error: 'Too many bookings right now. Please try again in a minute.' },
      { status: 429 }
    )
  }

  let clientId: string | null = null

  const { data: existing } = await supabase
    .from('clients')
    .select('id, email')
    .eq('tenant_id', tenant.id)
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    const phoneWindowStart = new Date(Date.now() - PHONE_DAILY_WINDOW_MS).toISOString()
    const { count: phoneRecent } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('client_id', existing.id)
      .gte('created_at', phoneWindowStart)

    if ((phoneRecent ?? 0) >= PHONE_DAILY_LIMIT) {
      return NextResponse.json(
        { error: 'Too many bookings from this number recently. Please contact the shop directly to book another.' },
        { status: 429 }
      )
    }

    if (email && !existing.email) {
      await supabase.from('clients').update({ email }).eq('id', existing.id)
    }

    clientId = existing.id
  } else {
    const { data: created, error: clientErr } = await supabase
      .from('clients')
      .insert({ tenant_id: tenant.id, name, phone, email })
      .select('id')
      .single()

    if (clientErr || !created) {
      await logError({
        route: '/api/book', method: 'POST', status: 500, tenantId: tenant.id,
        message: clientErr?.message ?? 'client_insert_failed',
        errorCode: clientErr?.code ?? null,
        metadata: { stage: 'create_client', subdomain },
        requestBody: { name, phone, email, service, date, time },
      })
      return NextResponse.json({ error: 'Could not create your record. Try again.' }, { status: 500 })
    }
    clientId = created.id
  }

  const { data: insertedAppt, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      tenant_id:   tenant.id,
      client_id:   clientId,
      date,
      time,
      service,
      price:       finalPrice,
      duration_min: serviceDuration,
      client_note: clientNote,
      barber_id:   assignedBarber?.id ?? null,
      status:      'pending',
    })
    .select('id')
    .single()

  if (apptErr || !insertedAppt) {
    if (apptErr?.code === '23505') {
      return NextResponse.json(
        { error: 'That time was just taken. Please pick another.' },
        { status: 409 }
      )
    }
    await logError({
      route: '/api/book', method: 'POST', status: 500, tenantId: tenant.id,
      message: apptErr?.message ?? 'appointment_insert_failed',
      errorCode: apptErr?.code ?? null,
      metadata: { stage: 'insert_appointment', subdomain, client_id: clientId },
      requestBody: { service, date, time, price: finalPrice },
    })
    return NextResponse.json({ error: 'Could not save the appointment. Try again.' }, { status: 500 })
  }

  const appointmentId = insertedAppt.id

  // Update client's preferred barber (fire-and-forget)
  if (assignedBarber && clientId) {
    after(async () => {
      try {
        await supabase
          .from('clients')
          .update({ preferred_barber_id: assignedBarber!.id })
          .eq('id', clientId!)
      } catch {}
    })
  }

  // ── Deposit flow ──────────────────────────────────────────────────────────
  const depositActive    = cfgResult.ok && cfgResult.config.deposit_active
  const depositAmountCad = cfgResult.ok ? (cfgResult.config.deposit_amount_cad ?? 20) : 20

  if (depositActive && process.env.STRIPE_SECRET_KEY) {
    const origin = request.headers.get('origin') ?? `https://${subdomain}.barberqueue.pro`

    let checkoutUrl: string
    try {
      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        mode:                 'payment',
        line_items: [{
          price_data: {
            currency:     'cad',
            unit_amount:  Math.round(depositAmountCad * 100),
            product_data: { name: `Deposit — ${service} at ${tenant.name}` },
          },
          quantity: 1,
        }],
        metadata: {
          appointment_id: appointmentId,
          tenant_id:      tenant.id,
          client_id:      clientId ?? '',
          phone:          phone ?? '',
          client_name:    name,
          service,
          date,
          time,
          shop_name:      tenant.name,
          barber_name:    assignedBarber?.name ?? '',
        },
        success_url: `${origin}/book/deposit-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${origin}/book/deposit-cancel?appointment_id=${appointmentId}`,
      })

      if (!session.url) throw new Error('Stripe returned no checkout URL')
      checkoutUrl = session.url
    } catch (stripeErr) {
      // Roll back the appointment so the slot is freed
      await supabase.from('appointments').delete().eq('id', appointmentId)
      await logError({
        route: '/api/book', method: 'POST', status: 500, tenantId: tenant.id,
        message: stripeErr instanceof Error ? stripeErr.message : 'stripe_session_failed',
        errorCode: null,
        metadata: { stage: 'stripe_checkout_create', appointment_id: appointmentId },
        requestBody: { service, date, time },
      })
      return NextResponse.json(
        { error: 'Could not start payment. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ checkout_url: checkoutUrl })
  }
  // ── End deposit flow ──────────────────────────────────────────────────────

  const resendKey = process.env.RESEND_API_KEY

  // Owner notification email
  const notifEmail = cfgResult.ok ? cfgResult.config.notification_email : undefined
  if (notifEmail && resendKey) {
    const barberLine = assignedBarber ? `<br>Barber: ${assignedBarber.name}` : ''
    after(async () => {
      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from:    `BarberQueue <noreply@barberqueue.pro>`,
          to:      [notifEmail],
          subject: `New booking: ${name} — ${service}`,
          html:    `<p><strong>New booking received</strong></p><p>Client: ${name}<br>Service: ${service}${barberLine}<br>When: ${formatDateTimeForSms(date, time)}</p>`,
        }),
      }).catch(() => {})
    })
  }

  // Barber notification email
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
          subject: `New booking — ${name} at ${time} (${service})`,
          html:    `<p>Hi ${barberName},</p><p>You have a new booking:</p><p><strong>Client:</strong> ${name}<br><strong>Service:</strong> ${service}<br><strong>When:</strong> ${formatDateTimeForSms(date, time)}<br><strong>Duration:</strong> ${serviceDuration} min${clientNote ? `<br><strong>Client note:</strong> ${clientNote}` : ''}</p>`,
        }),
      }).catch(() => {})
    })
  }

  // Confirmation SMS (only when no deposit — with deposit the webhook sends it)
  const barberSuffix = assignedBarber ? ` with ${assignedBarber.name}` : ''
  const smsBody =
    `Hi ${name.split(' ')[0]}, your ${service}${barberSuffix} at ${tenant.name} is confirmed for ${formatDateTimeForSms(date, time)}.`

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

  return NextResponse.json({ ok: true })
}
