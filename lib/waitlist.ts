import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'

function formatDateSms(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

/**
 * Notifies ALL unnotified waitlist entries for the given slot.
 * All entries are marked notified before any SMS is sent (prevents double-send
 * on concurrent calls). First client to book wins the slot — the partial
 * unique index on appointments(tenant_id, date, time) handles the race.
 */
export async function notifyWaitlist(
  tenantId:    string,
  subdomain:   string,
  tenantName:  string,
  date:        string,   // YYYY-MM-DD
  service:     string,
  fromNumber?: string,   // tenant's own Twilio number; falls back to platform default
  market:      'barber' | 'salon' = 'barber',
): Promise<void> {
  const supabase = createAdminClient()

  const { data: entries } = await supabase
    .from('waitlist')
    .select('id, name, phone')
    .eq('tenant_id', tenantId)
    .eq('date', date)
    .eq('service', service)
    .is('notified_at', null)
    .order('created_at', { ascending: true })

  if (!entries || entries.length === 0) return

  // Mark all notified before sending — prevents double-send on concurrent calls.
  const ids = entries.map(e => e.id)
  await supabase
    .from('waitlist')
    .update({ notified_at: new Date().toISOString() })
    .in('id', ids)

  const baseDomain = market === 'salon' ? 'salonqueue.pro' : 'barberqueue.pro'
  const bookingUrl = `https://${subdomain}.${baseDomain}/book`

  // Send all SMS in parallel — best-effort, failure of one doesn't block others.
  await Promise.allSettled(
    entries.map(entry => {
      const firstName = entry.name.split(' ')[0]
      const smsBody   = `Hi ${firstName}, a spot just opened up for ${service} at ${tenantName} on ${formatDateSms(date)}! Book now (first come first served): ${bookingUrl}`
      return sendSms(entry.phone, smsBody, fromNumber)
    })
  )
}
