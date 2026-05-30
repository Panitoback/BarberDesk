import { NextResponse } from 'next/server'
import { getStripeForKey } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { formatDateTimeForSms } from '@/lib/dates'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'

export const runtime = 'nodejs'

// Stripe sends the raw body — we must NOT parse it as JSON before verifying
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) return new NextResponse('Missing signature', { status: 400 })

  const subdomain = await getSubdomain()
  if (!subdomain) return new NextResponse('Missing subdomain', { status: 400 })

  const supabase = createAdminClient()

  // Look up tenant and their Stripe credentials
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return new NextResponse('Tenant not found', { status: 404 })

  const cfgResult = validateTenantConfig(tenant.config ?? {})
  const stripeKey     = cfgResult.ok ? cfgResult.config.stripe_secret_key     : undefined
  const webhookSecret = cfgResult.ok ? cfgResult.config.stripe_webhook_secret : undefined

  if (!stripeKey || !webhookSecret) {
    return new NextResponse('Stripe not configured for this tenant', { status: 400 })
  }

  let event: import('stripe').Stripe.Event
  try {
    const body = await request.text()
    event = getStripeForKey(stripeKey).webhooks.constructEvent(body, sig, webhookSecret)
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

  // Cross-check: metadata tenant must match the tenant resolved from subdomain
  if (tenantId !== tenant.id) {
    return new NextResponse('Tenant mismatch', { status: 400 })
  }

  // Idempotency check — Stripe can deliver the same event more than once.
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
