import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { getSubdomain } from '@/lib/subdomain'
import { NextResponse } from 'next/server'
import { todayInToronto, addDaysISO } from '@/lib/dates'

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

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
    .select('reactivation_active, reactivation_days')
    .eq('tenant_id', tenant.id)
    .single()

  if (!config?.reactivation_active) {
    return NextResponse.json({ skipped: true, reason: 'reactivation automation disabled' })
  }

  const cutoffDate = addDaysISO(todayInToronto(), -config.reactivation_days)
  const cutoffISO  = new Date(cutoffDate + 'T00:00:00Z').toISOString()

  const { data: inactiveClients } = await supabase
    .from('clients')
    .select('id, name, phone')
    .eq('tenant_id', tenant.id)
    .lt('last_visit', cutoffDate)

  if (!inactiveClients?.length) {
    return NextResponse.json({ ok: true, contacted: 0, skipped: 0 })
  }

  // Clients already sent a reactivation SMS within the same window (avoid spamming)
  const { data: recentlySent } = await supabase
    .from('actions_log')
    .select('client_id')
    .eq('tenant_id', tenant.id)
    .eq('type', 'reactivation_sms')
    .gte('created_at', cutoffISO)

  const alreadySentIds = new Set(recentlySent?.map(r => r.client_id) ?? [])
  const eligible = inactiveClients.filter(c => !alreadySentIds.has(c.id))

  let contacted = 0
  const skipped = inactiveClients.length - eligible.length

  for (const client of eligible) {
    const message = `Hi ${client.name}! We miss you at ${tenant.name}. It's been a while — we'd love to see you again. Book your next appointment anytime!`

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
        client_id:  client.id,
        direction:  'outbound',
        body:       message,
        status:     smsStatus,
        twilio_sid: twilioSid,
      }),
      supabase.from('actions_log').insert({
        tenant_id: tenant.id,
        client_id: client.id,
        type:      'reactivation_sms',
        metadata:  { days_inactive: config.reactivation_days, sms_status: smsStatus },
      }),
    ])

    if (smsStatus === 'queued') contacted++
  }

  return NextResponse.json({ ok: true, contacted, skipped })
}
