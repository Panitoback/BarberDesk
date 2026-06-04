import { NextResponse, after } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayInToronto, formatDateTimeForSms } from '@/lib/dates'
import { sendSms } from '@/lib/twilio'
import { normalizePhone } from '@/lib/phone'
import { notifyWaitlist } from '@/lib/waitlist'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })

  const { id: appointmentId } = await params
  const { searchParams } = new URL(request.url)
  const phone = normalizePhone(searchParams.get('phone') ?? '')

  if (!phone) return NextResponse.json({ error: 'Phone required.' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, twilio_number')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('phone', phone)
    .eq('is_anonymous', false)
    .maybeSingle()

  if (!client) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })

  // Fetch appointment — must belong to this client+tenant, be pending, and be in the future
  const today = todayInToronto()
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, date, time, service, status')
    .eq('id', appointmentId)
    .eq('tenant_id', tenant.id)
    .eq('client_id', client.id)
    .eq('status', 'pending')
    .gte('date', today)
    .maybeSingle()

  if (!appointment) {
    return NextResponse.json(
      { error: 'Appointment not found or already cancelled.' },
      { status: 404 },
    )
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: 'Could not cancel.' }, { status: 500 })

  // Confirmation SMS — best-effort
  const firstName = client.name.split(' ')[0]
  const smsBody = `Hi ${firstName}, your appointment at ${tenant.name} on ${formatDateTimeForSms(appointment.date, appointment.time)} has been cancelled. Book again at https://${subdomain}.barberqueue.pro/book`
  try {
    const sid = await sendSms(phone, smsBody, tenant.twilio_number ?? undefined)
    await supabase.from('messages').insert({
      tenant_id: tenant.id,
      client_id: client.id,
      direction: 'outbound',
      body:      smsBody,
      status:    'sent',
      twilio_sid: sid,
    })
  } catch {
    await supabase.from('messages').insert({
      tenant_id: tenant.id,
      client_id: client.id,
      direction: 'outbound',
      body:      smsBody,
      status:    'failed',
    })
  }

  after(async () => {
    await notifyWaitlist(tenant.id, subdomain, tenant.name, appointment.date, appointment.service, tenant.twilio_number ?? undefined)
  })

  return NextResponse.json({ ok: true })
}
