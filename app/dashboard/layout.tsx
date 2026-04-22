import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import SidebarNav from '@/components/dashboard/SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant()
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
