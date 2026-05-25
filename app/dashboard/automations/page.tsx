import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import AutomationsForm, { type AutomationsState } from '@/components/dashboard/AutomationsForm'

export default async function AutomationsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('automations_config')
    .select('noshow_active, loyalty_active, review_active, reactivation_active, reactivation_days, flash_active')
    .eq('tenant_id', tenant.id)
    .single()

  const initial: AutomationsState = {
    noshow_active:       row?.noshow_active       ?? true,
    loyalty_active:      row?.loyalty_active      ?? true,
    review_active:       row?.review_active       ?? true,
    reactivation_active: row?.reactivation_active ?? true,
    reactivation_days:   row?.reactivation_days   ?? 30,
    flash_active:        row?.flash_active        ?? false,
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Automations</h1>
        <p className="text-slate-500 text-sm mt-1">
          Background tasks the system runs for you. Toggle each one on or off — message wording
          is handled by AI.
        </p>
      </div>
      <AutomationsForm initial={initial} />
    </div>
  )
}
