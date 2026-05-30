import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, Scissors } from 'lucide-react'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function formatDate(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`)
  return d.toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time: string): string {
  const [hStr, m] = time.split(':')
  const h = parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${period}`
}

type SearchParams = Promise<{ date?: string; time?: string }>

export default async function ConfirmedPage({ searchParams }: { searchParams: SearchParams }) {
  const subdomain = await getSubdomain()
  if (!subdomain) notFound()

  const supabase = createAdminClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  const { date, time } = await searchParams
  const showDetails = Boolean(date && time)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-400" />
            <span className="text-white font-semibold tracking-tight">{tenant.name}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center mb-6">
          <Check className="w-7 h-7 text-slate-900" strokeWidth={3} />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
          You&apos;re booked.
        </h1>
        <p className="text-slate-500 text-base mb-8 max-w-sm">
          {tenant.name} got your request. You&apos;ll receive a confirmation text shortly.
        </p>

        {showDetails && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full max-w-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Your appointment
            </p>
            <p className="text-slate-900 font-semibold">{formatDate(date!)}</p>
            <p className="text-slate-600 text-sm mt-0.5">{formatTime(time!)}</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 mt-10">
          <Link
            href="/book"
            className="text-slate-500 hover:text-slate-900 text-sm transition-colors"
          >
            Book another appointment
          </Link>
          <Link
            href="/my-appointments"
            className="text-slate-400 hover:text-slate-600 text-xs transition-colors"
          >
            View or cancel my appointments
          </Link>
        </div>
      </main>
    </div>
  )
}
