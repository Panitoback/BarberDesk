import { NextResponse } from 'next/server'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const tenant = await getTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .update({ staff_token: crypto.randomUUID() })
    .eq('id', tenant.id)
    .select('staff_token')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 })
  }

  return NextResponse.json({ staff_token: data.staff_token })
}
