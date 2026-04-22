'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { LoyaltyLevel } from '@/lib/loyalty'

type Client = {
  id: string
  nombre: string
  telefono: string
  email: string | null
  no_show_count: number
  ultima_visita: string | null
  loyalty_points: { puntos: number; nivel: LoyaltyLevel }[] | null
}

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

export default function ClientsTable({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? clients.filter(c =>
        c.nombre.toLowerCase().includes(query.toLowerCase()) ||
        c.telefono.includes(query)
      )
    : clients

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center">
          <p className="text-zinc-400 text-sm">
            {query ? 'No clients found.' : 'No clients registered.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Client</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Last visit</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Level</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">No-shows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(client => {
                const level = (client.loyalty_points?.[0]?.nivel ?? 'bronze') as LoyaltyLevel
                return (
                  <tr key={client.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/clientes/${client.id}`} className="group">
                        <p className="font-medium text-zinc-900 group-hover:text-amber-600 transition-colors">
                          {client.nombre}
                        </p>
                        <p className="text-xs text-zinc-400">{client.telefono}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {client.ultima_visita
                        ? formatDate(client.ultima_visita)
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${levelStyles[level]}`}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {client.no_show_count > 0
                        ? <span className="text-red-500 font-medium">{client.no_show_count}</span>
                        : <span className="text-zinc-300">0</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
