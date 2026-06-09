import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import AutomationsForm, { type AutomationsState } from '@/components/dashboard/AutomationsForm'
import type { LoyaltyReward } from '@/lib/loyalty'

export default async function AutomationsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()

  const [{ data: row }, { data: rewardsData }] = await Promise.all([
    supabase
      .from('automations_config')
      .select('noshow_active, loyalty_active, loyalty_mode, loyalty_dollars_per_star, review_active, reactivation_active, reactivation_days, flash_active')
      .eq('tenant_id', tenant.id)
      .single(),
    supabase
      .from('loyalty_rewards')
      .select('id, name, description, stars_required, active, display_order')
      .eq('tenant_id', tenant.id)
      .order('display_order')
      .order('created_at'),
  ])

  const initial: AutomationsState = {
    noshow_active:            row?.noshow_active            ?? true,
    loyalty_active:           row?.loyalty_active           ?? true,
    loyalty_mode:             (row?.loyalty_mode as 'levels' | 'stars') ?? 'levels',
    loyalty_dollars_per_star: row?.loyalty_dollars_per_star ?? 10,
    review_active:            row?.review_active            ?? true,
    reactivation_active:      row?.reactivation_active      ?? true,
    reactivation_days:        row?.reactivation_days        ?? 30,
    flash_active:             row?.flash_active             ?? false,
  }

  const initialRewards: LoyaltyReward[] = (rewardsData ?? []) as LoyaltyReward[]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Automations</h1>
        <p className="text-slate-500 text-sm mt-1">
          Background tasks the system runs for you. Toggle each one on or off — message wording
          is handled by AI.
        </p>
      </div>
      <AutomationsForm initial={initial} initialRewards={initialRewards} />
    </div>
  )
}
