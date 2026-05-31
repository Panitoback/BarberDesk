import { NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyWaitlist } from '@/lib/waitlist'

// Called when a client abandons the Stripe checkout — removes the unpaid pending appointment
// so the slot is freed for the next person.
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const appointmentId = searchParams.get('appointment_id')

  if (!appointmentId) {
    return NextResponse.json({ error: 'Missing appointment_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch before deleting so we have service+date+tenant_id for the waitlist notification.
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, tenant_id, service, date')
    .eq('id', appointmentId)
    .eq('deposit_paid', false)
    .eq('status', 'pending')
    .maybeSingle()

  if (!appt) {
    // Already deleted or paid — no-op, still return ok.
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appt.id)

  if (error) {
    return NextResponse.json({ error: 'Could not cancel' }, { status: 500 })
  }

  // Notify the first waitlisted client for this slot (fire-and-forget).
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, subdomain')
    .eq('id', appt.tenant_id)
    .single()

  if (tenant) {
    after(async () => {
      await notifyWaitlist(appt.tenant_id, tenant.subdomain, tenant.name, appt.date, appt.service)
    })
  }

  return NextResponse.json({ ok: true })
}
