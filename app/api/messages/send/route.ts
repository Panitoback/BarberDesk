import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const webhookSecret = process.env.WEBHOOK_SECRET
  if (!webhookSecret || request.headers.get('authorization') !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { client_id?: string; to_number?: string; subdomain?: string; message?: string }
  const { client_id, to_number, subdomain, message } = body

  if (!subdomain || !message || (!client_id && !to_number)) {
    return NextResponse.json({ error: 'subdomain, message and either client_id or to_number are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  let phone = to_number
  let resolvedClientId = client_id ?? null

  if (client_id && !phone) {
    const { data: client } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', client_id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    phone = client.phone ?? undefined
  }

  let twilioSid: string | null = null
  let smsStatus: 'queued' | 'failed' = 'queued'

  try {
    twilioSid = await sendSms(phone!, message)
  } catch {
    smsStatus = 'failed'
  }

  await Promise.all([
    supabase.from('messages').insert({
      tenant_id:  tenant.id,
      client_id:  resolvedClientId,
      direction:  'outbound',
      body:       message,
      status:     smsStatus,
      twilio_sid: twilioSid,
    }),
    supabase.from('actions_log').insert({
      tenant_id: tenant.id,
      client_id: resolvedClientId,
      type:      'sms_auto_reply',
      metadata:  { sms_status: smsStatus },
    }),
  ])

  if (smsStatus === 'failed') {
    return NextResponse.json({ error: 'SMS delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, twilio_sid: twilioSid })
}
