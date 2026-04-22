import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const headersList = await headers()
  let subdomain = headersList.get('x-subdomain')

  if (!subdomain && process.env.NODE_ENV === 'development') subdomain = 'test'
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const body = await request.json()
  const appointmentId: string = body.cita_id
  if (!appointmentId) return NextResponse.json({ error: 'cita_id is required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdominio', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data, error } = await supabase.rpc('complete_appointment', {
    p_appointment_id: appointmentId,
    p_tenant_id: tenant.id,
  })

  if (error) {
    if (error.code === 'P0001') {
      return NextResponse.json({ error: 'Appointment not found or not pending' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to complete appointment' }, { status: 500 })
  }

  return NextResponse.json(data)
}
