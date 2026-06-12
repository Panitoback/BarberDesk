import { Suspense } from 'react'
import { Scissors } from 'lucide-react'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import DepositCancelContent from './DepositCancelContent'

export default async function DepositCancelPage() {
  const subdomain = await getSubdomain()
  let shopName = 'Booking'

  if (subdomain) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('tenants')
      .select('name')
      .eq('subdomain', subdomain)
      .maybeSingle()
    if (data?.name) shopName = data.name
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-400" />
            <span className="text-white font-semibold tracking-tight">{shopName}</span>
          </div>
        </div>
      </header>
      <Suspense>
        <DepositCancelContent />
      </Suspense>
    </div>
  )
}
