'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default function DepositCancelContent() {
  const searchParams  = useSearchParams()
  const appointmentId = searchParams.get('appointment_id')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!appointmentId) { setDone(true); return }
    fetch(`/api/book/deposit-cancel?appointment_id=${encodeURIComponent(appointmentId)}`, {
      method: 'DELETE',
    }).finally(() => setDone(true))
  }, [appointmentId])

  return (
    <main className="flex-1 max-w-xl w-full mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center mb-6">
        <XCircle className="w-7 h-7 text-slate-500" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
        Booking not confirmed
      </h1>
      <p className="text-slate-500 text-base mb-8 max-w-sm">
        Your payment was cancelled and your slot has been released. You can try booking again below.
      </p>

      {done && (
        <Link
          href="/book"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          Try again
        </Link>
      )}
    </main>
  )
}
