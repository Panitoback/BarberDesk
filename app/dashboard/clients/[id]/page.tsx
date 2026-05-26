import { redirect, notFound } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail } from 'lucide-react'
import type { LoyaltyLevel } from '@/lib/loyalty'
import MarkMessagesRead from '@/components/dashboard/MarkMessagesRead'

const levelStyles: Record<LoyaltyLevel, string> = {
  bronze:   'bg-indigo-50 text-amber-700 ring-amber-200',
  silver:   'bg-slate-100 text-slate-600 ring-slate-300',
  gold:     'bg-yellow-50 text-yellow-700 ring-yellow-200',
  platinum: 'bg-purple-50 text-purple-700 ring-purple-200',
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDateTime(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()

  const [
    { data: client },
    { data: loyalty },
    { data: visits },
    { data: messages },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, phone, email, no_show_count').eq('id', id).eq('tenant_id', tenant.id).single(),
    supabase.from('loyalty_points').select('points, level').eq('client_id', id).eq('tenant_id', tenant.id).single(),
    supabase.from('visits').select('id, date, service, price, points_earned').eq('client_id', id).eq('tenant_id', tenant.id).order('date', { ascending: false }),
    supabase.from('messages').select('id, direction, body, status, created_at').eq('client_id', id).eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(20),
  ])

  if (!client) notFound()

  const level = (loyalty?.level ?? 'bronze') as LoyaltyLevel
  const totalRevenue = visits?.reduce((sum, v) => sum + (v.price ?? 0), 0) ?? 0

  const stats = [
    { label: 'Total visits',   value: visits?.length ?? 0,                  danger: false },
    { label: 'Points',         value: loyalty?.points ?? 0,                  danger: false },
    { label: 'Total revenue',  value: `$${totalRevenue.toFixed(2)} CAD`,     danger: false },
    { label: 'No-shows',       value: client.no_show_count,                  danger: client.no_show_count > 0 },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Clients
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{client.name}</h1>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 mt-1.5 text-sm text-slate-400">
              <span className="flex items-center gap-1.5 min-w-0">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {client.phone}
              </span>
              {client.email && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </span>
              )}
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${levelStyles[level]}`}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.danger ? 'text-red-500' : 'text-slate-900'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Visit history */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Visit history</h2>
        {!visits?.length ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <p className="text-slate-400 text-sm">No visits recorded.</p>
          </div>
        ) : (
          <>
            {/* Mobile — card list */}
            <div className="space-y-3 md:hidden">
              {visits.map(visit => (
                <div key={visit.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">{formatDate(visit.date)}</span>
                    <span className="text-indigo-600 font-medium text-sm">+{visit.points_earned}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <span className="font-medium text-slate-900">{visit.service}</span>
                    <span className="text-slate-600 text-sm">
                      {visit.price != null
                        ? `$${visit.price.toFixed(2)}`
                        : <span className="text-slate-300">—</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop — table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Service</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Price</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visits.map(visit => (
                    <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{formatDate(visit.date)}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{visit.service}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {visit.price != null
                          ? `$${visit.price.toFixed(2)}`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-indigo-600 font-medium">+{visit.points_earned}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Mark all inbound messages from this client as read */}
      <MarkMessagesRead clientId={id} />

      {/* SMS history */}
      {messages && messages.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3">SMS messages</h2>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.direction === 'outbound' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`max-w-[75%] sm:max-w-sm text-sm rounded-xl px-4 py-2.5 break-words ${
                  msg.direction === 'inbound'
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-indigo-600 text-white'
                }`}>
                  {msg.body}
                </div>
                <span className="self-end text-xs text-slate-400 shrink-0">
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
