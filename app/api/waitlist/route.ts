import { NextResponse } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateTenantConfig } from '@/lib/tenant-config'
import { sendSms } from '@/lib/twilio'
import { normalizePhone } from '@/lib/phone'
import { todayInToronto } from '@/lib/dates'

const WAITLIST_MAX = 10

function formatDateSms(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })

  let body: { name?: string; phone?: string; service?: string; date?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const name    = (body.name    ?? '').trim()
  const phone   = normalizePhone(body.phone ?? '')
  const service = (body.service ?? '').trim()
  const date    = (body.date    ?? '').trim()

  if (name.length < 2)  return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!phone)           return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
  if (!service)         return NextResponse.json({ error: 'Please pick a service.' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayInToronto()) {
    return NextResponse.json({ error: 'Please pick a valid future date.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, twilio_number, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })

  const cfg           = validateTenantConfig(tenant.config ?? {})
  const validServices = cfg.ok ? (cfg.config.services ?? []).map(s => s.name) : []
  if (!validServices.includes(service)) {
    return NextResponse.json({ error: 'Invalid service.' }, { status: 400 })
  }

  // Idempotent — same phone+service+date on same tenant only registers once.
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('phone', phone)
    .eq('service', service)
    .eq('date', date)
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true })

  // Capacity guard — prevents unbounded lists per slot.
  const { count } = await supabase
    .from('waitlist')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('service', service)
    .eq('date', date)
    .is('notified_at', null)

  if ((count ?? 0) >= WAITLIST_MAX) {
    return NextResponse.json({ error: 'The waitlist for this date is full.' }, { status: 409 })
  }

  await supabase.from('waitlist').insert({ tenant_id: tenant.id, name, phone, service, date })

  // Confirmation SMS — best-effort, never blocks the response.
  const firstName  = name.split(' ')[0]
  const smsBody    = `Hi ${firstName}, you're on the waitlist for ${service} at ${tenant.name} on ${formatDateSms(date)}. We'll text you as soon as a spot opens up.`
  try {
    await sendSms(phone, smsBody, tenant.twilio_number ?? undefined)
  } catch {
    // non-critical
  }

  return NextResponse.json({ ok: true })
}
