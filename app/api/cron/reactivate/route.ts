import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { NextResponse } from 'next/server'

async function sendReactivationEmail(to: string, clientName: string, shopName: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${shopName} <noreply@barberpro.ca>`,
      to: [to],
      subject: `We miss you, ${clientName}! 10% off your next visit at ${shopName}`,
      html: `
        <p>Hi ${clientName},</p>
        <p>It's been a while since we've seen you at <strong>${shopName}</strong>. We'd love to have you back!</p>
        <p>As a special welcome-back offer, enjoy <strong>10% off</strong> your next visit. Just mention this email when you book.</p>
        <p>See you soon!</p>
        <p>— The ${shopName} team</p>
      `,
    }),
  })

  if (!res.ok) {
    const err = await res.json() as unknown
    throw new Error(`Resend error: ${JSON.stringify(err)}`)
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.WEBHOOK_SECRET
  if (!webhookSecret || request.headers.get('authorization') !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, automations_config(reactivation_active, reactivation_days)')
    .neq('plan', 'suspended')

  if (!tenants?.length) return NextResponse.json({ ok: true, processed: 0 })

  let totalContacted = 0
  let totalEmailed = 0

  for (const tenant of tenants) {
    const cfgRaw = tenant.automations_config
    const config = Array.isArray(cfgRaw) ? cfgRaw[0] : cfgRaw
    if (!config?.reactivation_active) continue

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - config.reactivation_days)
    const cutoffDate = cutoff.toISOString().split('T')[0]
    const cutoffISO  = cutoff.toISOString()

    const { data: inactive } = await supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('tenant_id', tenant.id)
      .lt('last_visit', cutoffDate)

    if (!inactive?.length) continue

    const { data: recentlySent } = await supabase
      .from('actions_log')
      .select('client_id')
      .eq('tenant_id', tenant.id)
      .eq('type', 'reactivation_sms')
      .gte('created_at', cutoffISO)

    const alreadySentIds = new Set(recentlySent?.map(r => r.client_id) ?? [])
    const eligible = inactive.filter(c => !alreadySentIds.has(c.id))

    for (const client of eligible) {
      const smsBody = `Hi ${client.name}! We miss you at ${tenant.name}. It's been a while — we'd love to see you again. Book your next appointment anytime!`

      let twilioSid: string | null = null
      let smsStatus: 'queued' | 'failed' = 'queued'

      try {
        twilioSid = await sendSms(client.phone, smsBody)
      } catch {
        smsStatus = 'failed'
      }

      await Promise.all([
        supabase.from('messages').insert({
          tenant_id:  tenant.id,
          client_id:  client.id,
          direction:  'outbound',
          body:       smsBody,
          status:     smsStatus,
          twilio_sid: twilioSid,
        }),
        supabase.from('actions_log').insert({
          tenant_id: tenant.id,
          client_id: client.id,
          type:      'reactivation_sms',
          metadata:  { days_inactive: config.reactivation_days, sms_status: smsStatus, source: 'cron' },
        }),
      ])

      if (smsStatus === 'queued') totalContacted++

      if (client.email) {
        try {
          await sendReactivationEmail(client.email, client.name, tenant.name)
          totalEmailed++
        } catch {
          // Email failure is non-fatal — SMS already sent
        }
      }
    }
  }

  return NextResponse.json({ ok: true, contacted: totalContacted, emailed: totalEmailed })
}
