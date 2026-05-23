import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { sendSms } from '@/lib/twilio'
import { formatDateTimeForSms } from '@/lib/dates'

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  let body: { appointment_id?: string; notify?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const appointmentId = body.appointment_id
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointment_id is required' }, { status: 400 })
  }
  const notify = body.notify !== false

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Fetch first so we have the data needed for the SMS body and a clear status check.
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, date, time, status, client_id, clients(name, phone)')
    .eq('id', appointmentId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }
  if (appointment.status !== 'pending') {
    return NextResponse.json(
      { error: 'Only pending appointments can be cancelled.' },
      { status: 409 }
    )
  }

  const { error: updateErr } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('tenant_id', tenant.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Could not cancel.' }, { status: 500 })
  }

  // Best-effort SMS — never blocks the cancel. Persist outcome to messages.
  const client = appointment.clients
  if (notify && client?.phone) {
    const smsBody =
      `Hi ${client.name.split(' ')[0]}, your appointment at ${tenant.name} on ${formatDateTimeForSms(appointment.date, appointment.time)} was cancelled. ` +
      `Reply if you'd like to rebook.`

    try {
      const sid = await sendSms(client.phone, smsBody)
      await supabase.from('messages').insert({
        tenant_id:  tenant.id,
        client_id:  appointment.client_id,
        direction:  'outbound',
        body:       smsBody,
        status:     'sent',
        twilio_sid: sid,
      })
    } catch {
      await supabase.from('messages').insert({
        tenant_id: tenant.id,
        client_id: appointment.client_id,
        direction: 'outbound',
        body:      smsBody,
        status:    'failed',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
