import type { Tables } from '@/lib/supabase/types'

type CitaConCliente = Tables<'citas'> & {
  clients: { nombre: string; telefono: string } | null
}

const estadoStyles: Record<string, string> = {
  pendiente:  'bg-amber-50 text-amber-700 ring-amber-200',
  completada: 'bg-green-50 text-green-700 ring-green-200',
  noshow:     'bg-red-50 text-red-700 ring-red-200',
  cancelada:  'bg-zinc-100 text-zinc-500 ring-zinc-200',
}

const estadoLabel: Record<string, string> = {
  pendiente:  'Pendiente',
  completada: 'Completada',
  noshow:     'No show',
  cancelada:  'Cancelada',
}

export default function CitasHoyTable({ citas }: { citas: CitaConCliente[] }) {
  if (citas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center">
        <p className="text-zinc-400 text-sm">No hay citas para hoy.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left">
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Hora</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Cliente</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Servicio</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {citas.map((cita) => (
            <tr key={cita.id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-6 py-4 font-mono font-medium text-zinc-900">
                {cita.hora.slice(0, 5)}
              </td>
              <td className="px-6 py-4">
                <p className="font-medium text-zinc-900">{cita.clients?.nombre ?? '—'}</p>
                <p className="text-xs text-zinc-400">{cita.clients?.telefono}</p>
              </td>
              <td className="px-6 py-4 text-zinc-600">{cita.servicio}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${estadoStyles[cita.estado]}`}>
                  {estadoLabel[cita.estado]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
