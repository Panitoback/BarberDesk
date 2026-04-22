'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/lib/supabase/types'

type AppointmentWithClient = Tables<'citas'> & {
  clients: { nombre: string; telefono: string } | null
}

const statusStyles: Record<string, string> = {
  pendiente:  'bg-amber-50 text-amber-700 ring-amber-200',
  completada: 'bg-green-50 text-green-700 ring-green-200',
  noshow:     'bg-red-50 text-red-700 ring-red-200',
  cancelada:  'bg-zinc-100 text-zinc-500 ring-zinc-200',
}

const statusLabel: Record<string, string> = {
  pendiente:  'Pending',
  completada: 'Completed',
  noshow:     'No show',
  cancelada:  'Cancelled',
}

export default function CitasHoyTable({ citas: initialAppointments }: { citas: AppointmentWithClient[] }) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [completing, setCompleting] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function completeAppointment(appointmentId: string) {
    setCompleting(appointmentId)

    const res = await fetch('/api/citas/completar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cita_id: appointmentId }),
    })

    if (res.ok) {
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, estado: 'completada' as const } : a)
      )
      startTransition(() => router.refresh())
    }

    setCompleting(null)
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center">
        <p className="text-zinc-400 text-sm">No appointments for today.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left">
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Time</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Client</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Service</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Status</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-6 py-4 font-mono font-medium text-zinc-900">
                {appointment.hora.slice(0, 5)}
              </td>
              <td className="px-6 py-4">
                <p className="font-medium text-zinc-900">{appointment.clients?.nombre ?? '—'}</p>
                <p className="text-xs text-zinc-400">{appointment.clients?.telefono}</p>
              </td>
              <td className="px-6 py-4 text-zinc-600">{appointment.servicio}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[appointment.estado]}`}>
                  {statusLabel[appointment.estado]}
                </span>
              </td>
              <td className="px-6 py-4">
                {appointment.estado === 'pendiente' && (
                  <button
                    onClick={() => completeAppointment(appointment.id)}
                    disabled={completing === appointment.id}
                    className="text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {completing === appointment.id ? 'Saving...' : 'Complete'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
