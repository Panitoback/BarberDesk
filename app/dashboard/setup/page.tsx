import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { validateTenantConfig } from '@/lib/tenant-config'
import SetupWizard from '@/components/setup/SetupWizard'

export default async function SetupPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')
  if (tenant.onboardingDone) redirect('/')

  const supabase = await createClient()

  const [{ data: tenantRow }, { data: autoConfig }] = await Promise.all([
    supabase.from('tenants').select('config, market').eq('id', tenant.id).single(),
    supabase.from('automations_config')
      .select('reminder_active, reminder_hours')
      .eq('tenant_id', tenant.id)
      .single(),
  ])

  const cfgResult = validateTenantConfig(tenantRow?.config ?? {})
  const config    = cfgResult.ok ? cfgResult.config : {}

  return (
    <SetupWizard
      shopName={tenant.name}
      subdomain={tenant.subdomain}
      market={tenantRow?.market ?? 'barber'}
      initialConfig={config}
      initialReminderActive={autoConfig?.reminder_active ?? true}
      initialReminderHours={autoConfig?.reminder_hours ?? 24}
    />
  )
}
