import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/dashboard/SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  let subdomain = headersList.get('x-subdomain')

  if (!subdomain && process.env.NODE_ENV === 'development') {
  subdomain = 'test'
  }

  if (!subdomain) redirect('/') 

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nombre, subdominio')
    .eq('subdominio', subdomain)
    .single()

  if (!tenant) redirect('/login')

  return (
    <div className="flex h-screen bg-zinc-50">
      <SidebarNav barberia={tenant.nombre} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
