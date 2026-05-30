import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import MyAppointmentsForm from './MyAppointmentsForm'

export const dynamic = 'force-dynamic'

export default async function MyAppointmentsPage() {
  const subdomain = await getSubdomain()
  if (!subdomain) notFound()

  const supabase = createAdminClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  const isProduction = process.env.NODE_ENV === 'production'
  const bookUrl = isProduction
    ? `https://${subdomain}.barberqueue.pro/book`
    : `http://${subdomain}.localhost:3000/book`

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
            My appointments
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Enter your phone number to see your upcoming appointments and cancel if needed.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <MyAppointmentsForm bookUrl={bookUrl} />
        </div>

        <p className="text-slate-400 text-xs text-center mt-6">
          Need to book?{' '}
          <a href={bookUrl} className="underline hover:text-slate-600">
            Book a new appointment
          </a>
        </p>
      </main>
    </div>
  )
}
