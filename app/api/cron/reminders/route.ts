import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTimeForSms } from '@/lib/dates'

async function sendReminderEmail(opts: {
  to:        string
  clientName: string
  shopName:  string
  service:   string
  date:      string
  time:      string
}): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')

  const when = formatDateTimeForSms(opts.date, opts.time)
  const firstName = opts.clientName.split(' ')[0]

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    `${opts.shopName} <noreply@barberqueue.pro>`,
      to:      [opts.to],
      subject: `Reminder: your ${opts.service} at ${opts.shopName}`,
      html: `
        <p>Hi ${firstName},</p>
        <p>Just a reminder that your <strong>${opts.service}</strong> appointment at <strong>${opts.shopName}</strong> is scheduled for <strong>${when}</strong>.</p>
        <p>If you need to reschedule, please contact the shop directly.</p>
        <p>See you soon!</p>
        <p>— The ${opts.shopName} team</p>
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
    .select('id, name, automations_config(reminder_active, reminder_hours)')
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
      const apptAt = new Date(`${appt.date}T${appt.time}`)
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
        })
        totalSent++
      } catch {
        // Non-fatal — reminder_sent_at already set to prevent retry spam
      }
    }
  }

  return NextResponse.json({ ok: true, sent: totalSent })
}
