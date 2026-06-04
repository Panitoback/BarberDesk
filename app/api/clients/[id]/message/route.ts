import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/twilio'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const tenant = await getTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { message?: string }
  const message = body.message?.trim()
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, phone')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (!client.phone) return NextResponse.json({ error: 'Client has no phone number' }, { status: 400 })

  let twilioSid: string | null = null
  let smsStatus: 'queued' | 'failed' = 'queued'

  try {
    twilioSid = await sendSms(client.phone, message, tenant.twilioNumber ?? undefined)
  } catch {
    smsStatus = 'failed'
  }

  await supabase.from('messages').insert({
    tenant_id:  tenant.id,
    client_id:  id,
    direction:  'outbound',
    body:       message,
    status:     smsStatus,
    twilio_sid: twilioSid,
  })

  if (smsStatus === 'failed') {
    return NextResponse.json({ error: 'SMS delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
