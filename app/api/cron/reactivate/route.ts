import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'
import { NextResponse } from 'next/server'
import { todayInToronto, addDaysISO } from '@/lib/dates'

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
      from: `${shopName} <noreply@barberqueue.pro>`,
      to: [to],
      subject: `We miss you at ${shopName} — come back for 10% off`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#1e293b;letter-spacing:-0.5px;">✂ ${shopName}</p>
        </td></tr>

        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:40px 32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;">We miss you</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">It's been a while, ${firstName}!</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
            We haven't seen you at <strong>${shopName}</strong> in a while and we'd love to have you back.
            As a thank-you for being a loyal client, here's a little something for your next visit:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:28px;">
            <tr><td align="center">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;">Your exclusive offer</p>
              <p style="margin:0;font-size:36px;font-weight:800;color:#15803d;">10% off</p>
              <p style="margin:4px 0 0;font-size:14px;color:#166534;">your next visit at ${shopName}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#4ade80;">Just mention this email when you book</p>
            </td></tr>
          </table>

          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
            Ready to book? Reach out to us directly or use our online booking link.
          </p>

          <p style="margin:0;font-size:14px;color:#94a3b8;">
            See you soon! — The ${shopName} team
          </p>
        </td></tr>

        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 BarberQueue · barberqueue.pro</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
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

    const cutoffDate = addDaysISO(todayInToronto(), -config.reactivation_days)
    const cutoffISO  = new Date(cutoffDate + 'T00:00:00Z').toISOString()

    const { data: inactive } = await supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('tenant_id', tenant.id)
      .eq('is_anonymous', false)
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
        if (client.phone) twilioSid = await sendSms(client.phone, smsBody)
        else smsStatus = 'failed'
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
