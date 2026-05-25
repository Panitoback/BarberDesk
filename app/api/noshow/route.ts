import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { getSubdomain } from '@/lib/subdomain'
import { NextResponse } from 'next/server'

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
    .select('id, name')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: config } = await supabase
    .from('automations_config')
    .select('noshow_active, noshow_message')
    .eq('tenant_id', tenant.id)
    .single()

  if (!config?.noshow_active) {
    return NextResponse.json({ skipped: true, reason: 'noshow automation disabled' })
  }

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

  await Promise.all([
    supabase.from('appointments')
      .update({ status: 'no_show' })
      .eq('id', appointmentId),
    supabase.from('clients')
      .update({ no_show_count: client.no_show_count + 1 })
      .eq('id', appointment.client_id)
      .eq('tenant_id', tenant.id),
  ])

  const defaultMessage = `Hi {name}, we noticed you missed your appointment at {shop} today. We'd love to reschedule — just reply to this message.`
  const message = (config.noshow_message ?? defaultMessage)
    .replace('{name}', client.name)
    .replace('{shop}', tenant.name)

  let twilioSid: string | null = null
  let smsStatus: 'queued' | 'failed' = 'queued'

  try {
    if (client.phone) twilioSid = await sendSms(client.phone, message)
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

  if (smsStatus === 'failed') {
    return NextResponse.json({ error: 'SMS delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, twilio_sid: twilioSid })
}
