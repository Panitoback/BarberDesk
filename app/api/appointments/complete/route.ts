import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { NextResponse, after } from 'next/server'
import { logError } from '@/lib/error-logger'

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const body = await request.json()
  const appointmentId: string = body.appointment_id
  const finalPrice: number | null = typeof body.final_price === 'number' ? body.final_price : null
  if (!appointmentId) return NextResponse.json({ error: 'appointment_id is required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const [{ data: appointment }, { data: autoCfg }] = await Promise.all([
    supabase
      .from('appointments')
      .select('client_id')
      .eq('id', appointmentId)
      .eq('tenant_id', tenant.id)
      .single(),
    supabase
      .from('automations_config')
      .select('review_active')
      .eq('tenant_id', tenant.id)
      .single(),
  ])

  const { data, error } = await supabase.rpc('complete_appointment', {
    p_appointment_id: appointmentId,
    p_tenant_id:      tenant.id,
    ...(finalPrice !== null ? { p_price_override: finalPrice } : {}),
  })

  if (error) {
    if (error.code === 'P0001') {
      return NextResponse.json({ error: 'Appointment not found or not pending' }, { status: 409 })
    }
    await logError({
      route: '/api/appointments/complete', method: 'POST', status: 500,
      tenantId: tenant.id, userId: user.id,
      message: error.message ?? 'rpc_complete_appointment_failed',
      errorCode: error.code ?? null,
      metadata: { appointment_id: appointmentId, final_price: finalPrice },
    })
    return NextResponse.json({ error: 'Failed to complete appointment' }, { status: 500 })
  }

  // Trigger n8n review delay workflow — wrapped in after() so Vercel keeps
  // the runtime alive after the response is sent (bare fire-and-forget is
  // killed before the request reaches n8n on cold starts).
  // Skip when review automation is off so we don't waste a 30-min n8n delay
  // + HTTP round-trip just to have /api/reviews/request bail at the toggle.
  const reviewWebhookUrl = process.env.N8N_REVIEW_WEBHOOK_URL
  if (reviewWebhookUrl && appointment?.client_id && autoCfg?.review_active) {
    const payload = {
      client_id:    appointment.client_id,
      subdomain,
      completed_at: new Date().toISOString(),
    }
    after(async () => {
      await fetch(reviewWebhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      }).catch(() => {})
    })
  }

  return NextResponse.json(data)
}
