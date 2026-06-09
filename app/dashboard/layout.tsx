import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import SidebarNav from '@/components/dashboard/SidebarNav'
import { themeStyle } from '@/lib/theme'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  return (
    <div
      className="min-h-screen bg-slate-50 md:flex md:h-screen overflow-x-hidden"
      style={themeStyle(tenant.brandTheme)}
    >
      <SidebarNav
        shopName={tenant.name}
        logoUrl={tenant.logoUrl}
      />
      <main className="flex-1 md:overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-20 md:p-8">
        {children}
      </main>
    </div>
  )
}
