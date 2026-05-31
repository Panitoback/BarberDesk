import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'

function formatDateSms(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

/**
 * Finds the first unnotified waitlist entry for the given slot and sends
 * them an SMS. Called via after() from all three cancellation paths.
 */
export async function notifyWaitlist(
  tenantId:   string,
  subdomain:  string,
  tenantName: string,
  date:       string,   // YYYY-MM-DD
  service:    string,
): Promise<void> {
  const supabase = createAdminClient()

  const { data: entry } = await supabase
    .from('waitlist')
    .select('id, name, phone')
    .eq('tenant_id', tenantId)
    .eq('date', date)
    .eq('service', service)
    .is('notified_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!entry) return

  // Mark notified before sending — prevents double-send on concurrent calls.
  await supabase
    .from('waitlist')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', entry.id)

  const firstName  = entry.name.split(' ')[0]
  const bookingUrl = `https://${subdomain}.barberqueue.pro/book`
  const smsBody    = `Hi ${firstName}, a spot just opened up for ${service} at ${tenantName} on ${formatDateSms(date)}! Book now: ${bookingUrl}`

  try {
    await sendSms(entry.phone, smsBody)
  } catch {
    // Best-effort — loss of one SMS notification is acceptable.
  }
}
