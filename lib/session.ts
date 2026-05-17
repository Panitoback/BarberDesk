import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

export const getTenant = cache(async () => {
  const subdomain = await getSubdomain()
  if (!subdomain) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('subdomain', subdomain)
    .single()

  return tenant ?? null
})
