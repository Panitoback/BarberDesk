import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTimeForSms, torontoLocalToDate } from '@/lib/dates'

async function sendReminderEmail(opts: {
  to:        string
  clientName: string
  shopName:  string
  service:   string
  date:      string
  time:      string
  market:    'barber' | 'salon'
}): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')

  const when = formatDateTimeForSms(opts.date, opts.time)
  const firstName = opts.clientName.split(' ')[0]
  const brand       = opts.market === 'salon' ? 'SalonQueue' : 'BarberQueue'
  const brandDomain = opts.market === 'salon' ? 'salonqueue.pro' : 'barberqueue.pro'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    `${opts.shopName} <noreply@barberqueue.pro>`,
      to:      [opts.to],
      subject: `Reminder: your ${opts.service} appointment tomorrow`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#1e293b;letter-spacing:-0.5px;">✂ ${opts.shopName}</p>
        </td></tr>

        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:40px 32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;">Upcoming appointment</p>
          <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0f172a;">See you soon, ${firstName}!</h1>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="padding:6px 0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Service</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#0f172a;">${opts.service}</p>
              </td>
            </tr>
            <tr><td style="border-top:1px solid #e2e8f0;padding:6px 0 6px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">When</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#0f172a;">${when}</p>
            </td></tr>
            <tr><td style="border-top:1px solid #e2e8f0;padding-top:6px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Location</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#0f172a;">${opts.shopName}</p>
            </td></tr>
          </table>

          <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">
            Need to reschedule? Contact the shop directly as soon as possible so they can open the slot for someone else.
          </p>
        </td></tr>

        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 ${brand} · ${brandDomain}</p>
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
    .select('id, name, market, automations_config(reminder_active, reminder_hours)')
    .neq('plan', 'suspended')

  if (!tenants?.length) return NextResponse.json({ ok: true, sent: 0 })

  let totalSent = 0

  for (const tenant of tenants) {
    const cfgRaw = tenant.automations_config
    const config = Array.isArray(cfgRaw) ? cfgRaw[0] : cfgRaw
    if (!config?.reminder_active) continue

    const reminderHours: number = config.reminder_hours ?? 24

    // Find appointments whose reminder window falls within the next 30 minutes.
    // Window = [now + reminderHours - 30min, now + reminderHours + 30min]
    const windowStart = new Date(Date.now() + (reminderHours * 60 - 30) * 60_000)
    const windowEnd   = new Date(Date.now() + (reminderHours * 60 + 30) * 60_000)

    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, date, time, service, client_id, clients(name, email)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .is('reminder_sent_at', null)

    if (!appointments?.length) continue

    for (const appt of appointments) {
      const apptAt = torontoLocalToDate(appt.date, appt.time)
      if (apptAt < windowStart || apptAt > windowEnd) continue

      const client = Array.isArray(appt.clients) ? appt.clients[0] : appt.clients
      if (!client?.email) continue  // skip clients without email

      // Mark as sent first to prevent duplicate sends if the cron overlaps
      await supabase
        .from('appointments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', appt.id)

      try {
        await sendReminderEmail({
          to:         client.email,
          clientName: client.name,
          shopName:   tenant.name,
          service:    appt.service,
          date:       appt.date,
          time:       appt.time,
          market:     tenant.market,
        })
        totalSent++
      } catch {
        // Non-fatal — reminder_sent_at already set to prevent retry spam
      }
    }
  }

  return NextResponse.json({ ok: true, sent: totalSent })
}
