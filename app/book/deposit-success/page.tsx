import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, Scissors, CreditCard, AlertCircle } from 'lucide-react'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateTenantConfig } from '@/lib/tenant-config'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ session_id?: string }>

export default async function DepositSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const subdomain = await getSubdomain()
  if (!subdomain) notFound()

  const supabase = createAdminClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  const cfgResult    = validateTenantConfig(tenant.config ?? {})
  const depositAmount = cfgResult.ok ? (cfgResult.config.deposit_amount_cad ?? 0) : 0

  const { session_id } = await searchParams

  // Fetch appointment linked to this session
  let appointmentDetails: { date: string; time: string; price: number | null } | null = null
  if (session_id) {
    const { data } = await supabase
      .from('appointments')
      .select('date, time, price')
      .eq('stripe_session_id', session_id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    if (data) appointmentDetails = data
  }

  const remaining = appointmentDetails?.price != null && depositAmount > 0
    ? Math.max(0, appointmentDetails.price - depositAmount)
    : null

  function formatDate(iso: string) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-CA', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  function formatTime(t: string) {
    const [hStr, m] = t.split(':')
    const h = parseInt(hStr, 10)
    return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
  }

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
        <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mb-6">
          <Check className="w-7 h-7 text-white" strokeWidth={3} />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
          Deposit received!
        </h1>
        <p className="text-slate-500 text-base mb-8 max-w-sm">
          Your deposit is confirmed and your appointment is locked in. You&apos;ll get a text shortly.
        </p>

        {appointmentDetails && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full max-w-sm mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Your appointment
            </p>
            <p className="text-slate-900 font-semibold">{formatDate(appointmentDetails.date)}</p>
            <p className="text-slate-600 text-sm mt-0.5">{formatTime(appointmentDetails.time)}</p>
          </div>
        )}

        {remaining !== null && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 w-full max-w-sm mb-4 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Remaining balance at appointment</p>
                <p className="text-2xl font-bold text-amber-700 font-mono mt-1">${remaining.toFixed(2)} CAD</p>
                <p className="text-xs text-amber-700 mt-1">
                  Your ${depositAmount.toFixed(2)} deposit has been applied — please bring the remaining balance.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400 mb-8">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Deposit processed securely via Stripe</span>
        </div>

        <Link
          href="/book"
          className="text-slate-500 hover:text-slate-900 text-sm transition-colors"
        >
          Book another appointment
        </Link>
      </main>
    </div>
  )
}
