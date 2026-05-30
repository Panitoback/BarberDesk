import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called when a client abandons the Stripe checkout — removes the unpaid pending appointment
// so the slot is freed for the next person.
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const appointmentId = searchParams.get('appointment_id')

  if (!appointmentId) {
    return NextResponse.json({ error: 'Missing appointment_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Only delete if still unpaid — prevents deleting a paid appointment
  // (e.g. if webhook fired before cancel redirect)
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId)
    .eq('deposit_paid', false)
    .eq('status', 'pending')

  if (error) {
    return NextResponse.json({ error: 'Could not cancel' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
