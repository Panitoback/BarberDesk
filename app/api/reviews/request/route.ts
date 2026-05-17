import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { getSubdomain } from '@/lib/subdomain'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const body = await request.json()
  const clientId: string = body.client_id
  if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })

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
    .select('id')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: config } = await supabase
    .from('automations_config')
    .select('review_active, review_link')
    .eq('tenant_id', tenant.id)
    .single()

  if (!config?.review_active) {
    return NextResponse.json({ skipped: true, reason: 'review_request disabled' })
  }

  if (!config.review_link) {
    return NextResponse.json({ error: 'review_link not configured' }, { status: 422 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name, phone')
    .eq('id', clientId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const message = `Hi ${client.name}! Thanks for your visit today. We'd love your feedback — leave us a Google review: ${config.review_link}`

  let twilioSid: string | null = null
  let smsStatus: 'queued' | 'failed' = 'queued'

  try {
    twilioSid = await sendSms(client.phone, message)
  } catch {
    smsStatus = 'failed'
  }

  await Promise.all([
    supabase.from('messages').insert({
      tenant_id:  tenant.id,
      client_id:  clientId,
      direction:  'outbound',
      body:       message,
      status:     smsStatus,
      twilio_sid: twilioSid,
    }),
    supabase.from('actions_log').insert({
      tenant_id: tenant.id,
      client_id: clientId,
      type:      'review_request',
      metadata:  { review_link: config.review_link, sms_status: smsStatus },
    }),
  ])

  if (smsStatus === 'failed') {
    return NextResponse.json({ error: 'SMS delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, twilio_sid: twilioSid })
}
