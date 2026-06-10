export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayInToronto, addDaysISO } from '@/lib/dates'
import { barberColor } from '@/lib/barbers'
import { Scissors } from 'lucide-react'
import StaffView from '@/components/staff/StaffView'

export default async function StaffPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, multi_barber')
    .eq('staff_token', token)
    .single()

  if (!tenant) notFound()

  const today      = todayInToronto()
  const weekOutISO = addDaysISO(today, 7)

  const todayLabel = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const [
    { data: todayAppts },
    { data: upcomingAppts },
    { data: barbers },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, time, service, status, client_note, haircut_photo_url, barber_id, duration_min, clients(name)')
      .eq('tenant_id', tenant.id)
      .eq('date', today)
      .order('time'),
    supabase
      .from('appointments')
      .select('id, date, time, service, barber_id, duration_min, clients(name)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .gt('date', today)
      .lte('date', weekOutISO)
      .order('date')
      .order('time')
      .limit(30),
    supabase
      .from('barbers')
      .select('id, name, display_order')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('display_order'),
  ])

  const barberList = (barbers ?? []).map((b, i) => ({
    id:    b.id,
    name:  b.name,
    color: barberColor(i),
  }))

  const showBarbers = tenant.multi_barber && barberList.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 leading-tight">{tenant.name}</h1>
            <p className="text-xs text-slate-400">Staff view · read only</p>
          </div>
        </div>
      </div>

      <StaffView
        todayAppts={todayAppts ?? []}
        upcomingAppts={upcomingAppts ?? []}
        barbers={barberList}
        showBarbers={showBarbers}
        todayLabel={todayLabel}
        todayCount={(todayAppts ?? []).length}
      />
    </div>
  )
}
