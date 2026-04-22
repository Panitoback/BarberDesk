import { redirect, notFound } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail } from 'lucide-react'
import type { LoyaltyLevel } from '@/lib/loyalty'

const levelStyles: Record<LoyaltyLevel, string> = {
  bronze:   'bg-amber-50 text-amber-700 ring-amber-200',
  silver:   'bg-zinc-100 text-zinc-600 ring-zinc-300',
  gold:     'bg-yellow-50 text-yellow-700 ring-yellow-200',
  platinum: 'bg-purple-50 text-purple-700 ring-purple-200',
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-CA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDateTime(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-CA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()

  const [
    { data: client },
    { data: loyalty },
    { data: visits },
    { data: messages },
  ] = await Promise.all([
    supabase.from('clients').select('id, nombre, telefono, email, no_show_count').eq('id', params.id).eq('tenant_id', tenant.id).single(),
    supabase.from('loyalty_points').select('puntos, nivel').eq('client_id', params.id).eq('tenant_id', tenant.id).single(),
    supabase.from('visits').select('id, fecha, servicio, precio, puntos_ganados').eq('client_id', params.id).eq('tenant_id', tenant.id).order('fecha', { ascending: false }),
    supabase.from('messages').select('id, direccion, contenido, estado, created_at').eq('client_id', params.id).eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(20),
  ])

  if (!client) notFound()

  const level = (loyalty?.nivel ?? 'bronze') as LoyaltyLevel
  const totalRevenue = visits?.reduce((sum, v) => sum + (v.precio ?? 0), 0) ?? 0

  const stats = [
    { label: 'Total visits',   value: visits?.length ?? 0,                  danger: false },
    { label: 'Points',         value: loyalty?.puntos ?? 0,                  danger: false },
    { label: 'Total revenue',  value: `$${totalRevenue.toFixed(2)}`,         danger: false },
    { label: 'No-shows',       value: client.no_show_count,                  danger: client.no_show_count > 0 },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/dashboard/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Clients
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{client.nombre}</h1>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {client.telefono}
              </span>
              {client.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {client.email}
                </span>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${levelStyles[level]}`}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
            <p className="text-xs font-medium text-zinc-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.danger ? 'text-red-500' : 'text-zinc-900'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Visit history */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Visit history</h2>
        {!visits?.length ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center">
            <p className="text-zinc-400 text-sm">No visits recorded.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Service</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Price</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {visits.map(visit => (
                  <tr key={visit.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-zinc-600">{formatDate(visit.fecha)}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900">{visit.servicio}</td>
                    <td className="px-6 py-4 text-zinc-600">
                      {visit.precio != null
                        ? `$${visit.precio.toFixed(2)}`
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-amber-600 font-medium">+{visit.puntos_ganados}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SMS history */}
      {messages && messages.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-3">SMS messages</h2>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.direccion === 'outbound' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`max-w-sm text-sm rounded-xl px-4 py-2.5 ${
                  msg.direccion === 'inbound'
                    ? 'bg-zinc-100 text-zinc-800'
                    : 'bg-amber-400 text-zinc-900'
                }`}>
                  {msg.contenido}
                </div>
                <span className="self-end text-xs text-zinc-400 shrink-0">
                  {formatDateTime(msg.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
