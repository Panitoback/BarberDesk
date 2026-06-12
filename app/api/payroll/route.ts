import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

export async function GET(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end query params are required (YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, multi_barber')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  if (!tenant.multi_barber) return NextResponse.json({ error: 'Payroll requires multi-barber plan' }, { status: 403 })

  const { data: barbers, error: barbersError } = await supabase
    .from('barbers')
    .select('id, name, commission_pct')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('display_order', { ascending: true })

  if (barbersError) return NextResponse.json({ error: barbersError.message }, { status: 500 })

  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('barber_id, price')
    .eq('tenant_id', tenant.id)
    .eq('status', 'completed')
    .gte('date', start)
    .lte('date', end)
    .not('barber_id', 'is', null)

  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 500 })

  const apptMap = new Map<string, { count: number; revenue: number }>()
  for (const appt of appointments ?? []) {
    if (!appt.barber_id) continue
    const cur = apptMap.get(appt.barber_id) ?? { count: 0, revenue: 0 }
    apptMap.set(appt.barber_id, {
      count: cur.count + 1,
      revenue: cur.revenue + (appt.price ?? 0),
    })
  }

  const rows = (barbers ?? []).map(b => {
    const stats = apptMap.get(b.id) ?? { count: 0, revenue: 0 }
    const commissionPct = b.commission_pct ?? 50
    const barberEarns = stats.revenue * (commissionPct / 100)
    const ownerKeeps = stats.revenue - barberEarns
    return {
      barber_id:      b.id,
      name:           b.name,
      commission_pct: commissionPct,
      completed_count: stats.count,
      gross_revenue:  stats.revenue,
      barber_earns:   barberEarns,
      owner_keeps:    ownerKeeps,
    }
  })

  return NextResponse.json({ rows, period: { start, end } })
}
