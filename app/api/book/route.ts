import { NextResponse } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import {
  todayInToronto,
  isPastInToronto,
  formatDateTimeForSms,
} from '@/lib/dates'

const NAME_MIN = 2
const NAME_MAX = 80

// Rate-limit knobs. Tuned to be invisible to real customers (max 3
// bookings per phone per day, 10 bookings per shop per minute) but cap
// SMS-spend damage from abuse to < 1$/min.
const TENANT_BURST_LIMIT = 10
const TENANT_BURST_WINDOW_MS = 60_000
const PHONE_DAILY_LIMIT = 3
const PHONE_DAILY_WINDOW_MS = 24 * 60 * 60_000

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

// Slots offered to clients are 30-min increments only (HH:00 or HH:30).
// Reject anything else to keep bookings on the grid.
function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):(00|30)$/.test(s)
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) {
    return NextResponse.json({ error: 'This booking link is invalid.' }, { status: 400 })
  }

  let body: {
    name?: string
    phone?: string
    service?: string
    date?: string
    time?: string
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
    .select('id, name, plan')
    .eq('subdomain', subdomain)
    .single()

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })
  }

  // Suspended shops (unpaid / disabled) must not accept new bookings —
  // otherwise we'd burn SMS credit for an account that isn't paying.
  if (tenant.plan === 'suspended') {
    return NextResponse.json(
      { error: 'This shop is not accepting bookings right now. Please contact the shop directly.' },
      { status: 403 }
    )
  }

  // Tenant-wide burst guard — caps SMS spend if someone hammers the endpoint
  // with rotating phone numbers (which would slip past the per-phone limit).
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
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    // Per-phone limit — only checked on existing clients (a new phone can
    // never have prior bookings). Stops one phone from booking 50 slots in
    // a single sitting.
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

    clientId = existing.id
  } else {
    const { data: created, error: clientErr } = await supabase
      .from('clients')
      .insert({ tenant_id: tenant.id, name, phone })
      .select('id')
      .single()

    if (clientErr || !created) {
      return NextResponse.json({ error: 'Could not create your record. Try again.' }, { status: 500 })
    }
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
      status: 'pending',
    })

  if (apptErr) {
    // 23505 = Postgres unique_violation. Raised by the partial unique index
    // on (tenant_id, date, time) for active appointments — somebody else
    // grabbed the slot between the form check and this INSERT.
    if (apptErr.code === '23505') {
      return NextResponse.json(
        { error: 'That time was just taken. Please pick another.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Could not save the appointment. Try again.' }, { status: 500 })
  }

  // Best-effort confirmation SMS — persist outcome to messages, never fail the booking.
  const smsBody =
    `Hi ${name.split(' ')[0]}, your ${service} at ${tenant.name} is confirmed for ${formatDateTimeForSms(date, time)}.`

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
