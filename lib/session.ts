import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const getTenant = cache(async () => {
  const headersList = await headers()
  let subdomain = headersList.get('x-subdomain')

  if (!subdomain && process.env.NODE_ENV === 'development') subdomain = 'test'
  if (!subdomain) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nombre')
    .eq('subdominio', subdomain)
    .single()

  return tenant ?? null
})
