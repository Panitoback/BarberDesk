import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { getSubdomain } from '@/lib/subdomain'
import { todayInToronto, addDaysISO } from '@/lib/dates'

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const body = await request.json()
  const appointmentId: string = body.appointment_id
  if (!appointmentId) return NextResponse.json({ error: 'appointment_id is required' }, { status: 400 })

  const webhookSecret = process.env.WEBHOOK_SECRET
  const isWebhook =
    !!webhookSecret && request.headers.get('authorization') === `Bearer ${webhookSecret}`

  // Webhook callers (n8n) have no session — they need a service-role
  // client because every table queried below has RLS enabled.
  const supabase = isWebhook ? createAdminClient() : await createClient()

  if (!isWebhook) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, twilio_number')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: config } = await supabase
    .from('automations_config')
    .select('noshow_active, noshow_message, flash_active, flash_discount_pct')
    .eq('tenant_id', tenant.id)
    .single()

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, client_id, status')
    .eq('id', appointmentId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (appointment.status !== 'pending') {
    return NextResponse.json({ error: 'Appointment is not pending' }, { status: 409 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name, phone, no_show_count')
    .eq('id', appointment.client_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Always update status + count regardless of automation toggle.
  await Promise.all([
    supabase.from('appointments')
      .update({ status: 'no_show' })
      .eq('id', appointmentId)
      .eq('tenant_id', tenant.id),
    supabase.from('clients')
      .update({ no_show_count: client.no_show_count + 1 })
      .eq('id', appointment.client_id)
      .eq('tenant_id', tenant.id),
  ])

  // Recovery SMS — only when automation is active.
  if (!config?.noshow_active) {
    return NextResponse.json({ ok: true, skipped_sms: true })
  }

  const defaultMessage = `Hi {name}, we noticed you missed your appointment at {shop} today. We'd love to reschedule — just reply to this message.`
  const message = (config.noshow_message ?? defaultMessage)
    .replace('{name}', client.name)
    .replace('{shop}', tenant.name)

  let twilioSid: string | null = null
  let smsStatus: 'queued' | 'failed' = 'queued'

  try {
    if (client.phone) twilioSid = await sendSms(client.phone, message, tenant.twilio_number ?? undefined)
    else smsStatus = 'failed'
  } catch {
    smsStatus = 'failed'
  }

  await Promise.all([
    supabase.from('messages').insert({
      tenant_id:  tenant.id,
      client_id:  appointment.client_id,
      direction:  'outbound',
      body:       message,
      status:     smsStatus,
      twilio_sid: twilioSid,
    }),
    supabase.from('actions_log').insert({
      tenant_id: tenant.id,
      client_id: appointment.client_id,
      type:      'noshow',
      metadata:  { appointment_id: appointmentId, sms_status: smsStatus },
    }),
  ])

  // Flash discount — fire-and-forget after response so noshow resolves immediately.
  if (config?.flash_active && process.env.RESEND_API_KEY) {
    const resendKey   = process.env.RESEND_API_KEY
    const tenantId    = tenant.id
    const shopName    = tenant.name
    const discountPct = config.flash_discount_pct ?? 20
    const adminClient = createAdminClient()

    after(async () => {
      const cutoffDate = addDaysISO(todayInToronto(), -20)

      const { data: targets } = await adminClient
        .from('clients')
        .select('name, email')
        .eq('tenant_id', tenantId)
        .not('email', 'is', null)
        .not('last_visit', 'is', null)
        .lte('last_visit', cutoffDate)

      if (!targets?.length) return

      await Promise.all(targets.map(c => {
        const firstName = c.name.split(' ')[0]
        return fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from:    `BarberQueue <noreply@barberqueue.pro>`,
            to:      [c.email],
            subject: `${discountPct}% off at ${shopName} — open slot right now`,
            html: `
              <p>Hi <strong>${firstName}</strong>,</p>
              <p><strong>${shopName}</strong> just had a cancellation and has an open slot available right now.</p>
              <p>Come in within the next hour and get <strong>${discountPct}% off</strong> your visit.</p>
              <p>It's been a while since we've seen you — we'd love to have you back. Just show up!</p>
            `,
          }),
        }).catch(() => {})
      }))
    })
  }

  if (smsStatus === 'failed') {
    return NextResponse.json({ error: 'SMS delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, twilio_sid: twilioSid })
}
