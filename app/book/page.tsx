import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateTenantConfig, type Service } from '@/lib/tenant-config'
import BookingForm from './BookingForm'

export const dynamic = 'force-dynamic'

function readServices(config: unknown): Service[] {
  const result = validateTenantConfig(config ?? {})
  if (!result.ok) return []
  return result.config.services ?? []
}

export default async function BookPage() {
  const subdomain = await getSubdomain()
  if (!subdomain) notFound()

  const supabase = createAdminClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, subdomain, config, plan')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  const isSuspended = tenant.plan === 'suspended'
  const services = readServices(tenant.config)
  const hasServices = services.length > 0
  const configResult = validateTenantConfig(tenant.config ?? {})
  const depositActive    = configResult.ok ? (configResult.config.deposit_active ?? false) : false
  const depositAmountCad = configResult.ok ? (configResult.config.deposit_amount_cad ?? 20) : 20

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Scissors className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="text-white font-semibold tracking-tight truncate">
              {tenant.name}
            </span>
          </div>
          <Link
            href="https://barberqueue.pro"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Powered by BarberQueue
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 sm:py-16">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Book your appointment
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Pick a service and a time. {tenant.name} will text you to confirm.
          </p>
        </div>

        {isSuspended ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 text-center">
            <p className="text-slate-900 font-semibold">Online booking is paused.</p>
            <p className="text-slate-500 text-sm mt-2">
              Please contact {tenant.name} directly to book an appointment.
            </p>
          </div>
        ) : !hasServices ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 text-center">
            <p className="text-slate-900 font-semibold">Online booking is not available yet.</p>
            <p className="text-slate-500 text-sm mt-2">
              Please contact {tenant.name} directly to book an appointment.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
              <BookingForm
                services={services}
                shopName={tenant.name}
                depositActive={depositActive}
                depositAmountCad={depositAmountCad}
              />
            </div>

            <p className="text-slate-400 text-xs text-center mt-6">
              By booking you agree to receive SMS messages about your appointment.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
