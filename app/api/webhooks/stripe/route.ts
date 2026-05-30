import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { formatDateTimeForSms } from '@/lib/dates'

export const runtime = 'nodejs'

// Stripe sends the raw body — we must NOT parse it as JSON before verifying
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) return new NextResponse('Missing signature', { status: 400 })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return new NextResponse('Webhook secret not configured', { status: 500 })

  let event: import('stripe').Stripe.Event
  try {
    const body = await request.text()
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return new NextResponse('Webhook signature invalid', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as import('stripe').Stripe.Checkout.Session
  const meta = session.metadata ?? {}

  const appointmentId = meta.appointment_id
  const tenantId      = meta.tenant_id
  const clientId      = meta.client_id
  const phone         = meta.phone
  const clientName    = meta.client_name
  const service       = meta.service
  const date          = meta.date
  const time          = meta.time
  const shopName      = meta.shop_name
  const barberName    = meta.barber_name ?? null

  if (!appointmentId || !tenantId) {
    return new NextResponse('Missing metadata', { status: 400 })
  }

  const supabase = createAdminClient()

  // Idempotency check — Stripe can deliver the same event more than once.
  // If stripe_session_id is already set, the SMS was already sent; skip.
  const { data: existing } = await supabase
    .from('appointments')
    .select('stripe_session_id')
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
    .single()

  const alreadyProcessed = existing?.stripe_session_id === session.id

  // Mark appointment as deposit paid (safe to repeat — idempotent write)
  await supabase
    .from('appointments')
    .update({ deposit_paid: true, stripe_session_id: session.id })
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)

  // Send confirmation SMS only on first delivery
  if (!alreadyProcessed && phone && clientName && service && date && time && shopName) {
    const barberSuffix = barberName ? ` with ${barberName}` : ''
    const smsBody = `Hi ${clientName.split(' ')[0]}, your deposit is confirmed! Your ${service}${barberSuffix} at ${shopName} is booked for ${formatDateTimeForSms(date, time)}.`
    const resolvedClientId = clientId && clientId.length > 0 ? clientId : null
    try {
      const sid = await sendSms(phone, smsBody)
      await supabase.from('messages').insert({
        tenant_id:  tenantId,
        client_id:  resolvedClientId,
        direction:  'outbound',
        body:       smsBody,
        status:     'sent',
        twilio_sid: sid,
      })
    } catch {
      await supabase.from('messages').insert({
        tenant_id: tenantId,
        client_id: resolvedClientId,
        direction: 'outbound',
        body:      smsBody,
        status:    'failed',
      })
    }
  }

  return NextResponse.json({ received: true })
}
