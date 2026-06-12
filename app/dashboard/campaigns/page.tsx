import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import CampaignsClient from '@/components/dashboard/CampaignsClient'

export default async function CampaignsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  return <CampaignsClient />
}
