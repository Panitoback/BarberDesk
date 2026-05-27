import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'
import { todayInToronto, nowTimeInToronto } from '@/lib/dates'
import { logError } from '@/lib/error-logger'

function normalizePhone(input: string): string | null {
  const digits = (input ?? '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  return null
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { service: rawService, name: rawName, phone: rawPhone, final_price: rawFinalPrice } = body as {
    service?: unknown; name?: unknown; phone?: unknown; final_price?: unknown
  }

  const service    = typeof rawService    === 'string' ? rawService.trim() : ''
  const name       = typeof rawName       === 'string' ? rawName.trim()    : ''
  const phone      = typeof rawPhone      === 'string' ? rawPhone.trim()   : ''
  const finalPrice = typeof rawFinalPrice === 'number' && rawFinalPrice >= 0 ? rawFinalPrice : null

  if (!service) return NextResponse.json({ error: 'service is required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Resolve price from config
  const cfgResult = validateTenantConfig(tenant.config ?? {})
  const services  = cfgResult.ok ? (cfgResult.config.services ?? []) : []
  const matched   = services.find(s => s.name === service)
  if (!matched) return NextResponse.json({ error: 'Service not found' }, { status: 400 })

  const clientName  = name.length >= 2 ? name : 'Walk-in'
  const clientPhone = phone ? (normalizePhone(phone) ?? null) : null

  // Create a new client record for every walk-in — anonymous walk-ins don't have
  // a phone to match against, so deduplication isn't possible.
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .insert({ tenant_id: tenant.id, name: clientName, phone: clientPhone })
    .select('id')
    .single()

  if (clientErr || !client) {
    await logError({
      route: '/api/walkin', method: 'POST', status: 500, tenantId: tenant.id, userId: user.id,
      message: clientErr?.message ?? 'client_insert_failed',
      errorCode: clientErr?.code ?? null,
      metadata: { stage: 'insert_client' },
      requestBody: { service, name: clientName, phone: clientPhone },
    })
    return NextResponse.json({ error: 'Could not create client record' }, { status: 500 })
  }

  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      tenant_id: tenant.id,
      client_id: client.id,
      date:      todayInToronto(),
      time:      nowTimeInToronto(),
      service,
      price:     matched.price_cad,
      walkin:    true,
      status:    'pending',
    })
    .select('id')
    .single()

  if (apptErr || !appt) {
    // 23505 = unique_violation. After migration 20260526010000 the partial
    // unique index excludes walk-ins, so this should no longer fire — but if
    // the migration hasn't been applied yet, surface a clear message instead
    // of a generic 500 so the owner knows to just retry.
    if (apptErr?.code === '23505') {
      return NextResponse.json(
        { error: 'A walk-in was just recorded at the same time — try again.' },
        { status: 409 }
      )
    }
    await logError({
      route: '/api/walkin', method: 'POST', status: 500, tenantId: tenant.id, userId: user.id,
      message: apptErr?.message ?? 'appointment_insert_failed',
      errorCode: apptErr?.code ?? null,
      metadata: { stage: 'insert_appointment', client_id: client.id },
      requestBody: { service, walkin: true },
    })
    return NextResponse.json({ error: 'Could not create appointment' }, { status: 500 })
  }

  // Complete immediately — walk-in = client is already in the chair.
  // If extra services were added in the UI, final_price overrides the base price.
  const { error: rpcErr } = await supabase.rpc('complete_appointment', {
    p_appointment_id: appt.id,
    p_tenant_id:      tenant.id,
    ...(finalPrice !== null ? { p_price_override: finalPrice } : {}),
  })

  if (rpcErr) {
    await logError({
      route: '/api/walkin', method: 'POST', status: 500, tenantId: tenant.id, userId: user.id,
      message: rpcErr.message ?? 'rpc_complete_appointment_failed',
      errorCode: rpcErr.code ?? null,
      metadata: { stage: 'complete_appointment_rpc', appointment_id: appt.id, final_price: finalPrice },
    })
    return NextResponse.json({ error: 'Could not complete walk-in' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
