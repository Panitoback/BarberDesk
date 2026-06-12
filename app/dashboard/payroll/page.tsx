import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import PayrollClient from '@/components/dashboard/PayrollClient'

export default async function PayrollPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')
  if (!tenant.multiBarber) redirect('/')

  return <PayrollClient />
}
