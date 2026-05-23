'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { LoyaltyLevel } from '@/lib/loyalty'

type Client = {
  id: string
  name: string
  phone: string
  email: string | null
  no_show_count: number
  last_visit: string | null
  loyalty_points: { points: number; level: LoyaltyLevel }[] | null
}

const levelStyles: Record<LoyaltyLevel, string> = {
  bronze:   'bg-indigo-50 text-amber-700 ring-amber-200',
  silver:   'bg-slate-100 text-slate-600 ring-slate-300',
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
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone.includes(query)
      )
    : clients

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-slate-400 text-sm">
            {query ? 'No clients found.' : 'No clients registered.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile — card list */}
          <div className="space-y-3 md:hidden">
            {filtered.map(client => {
              const level = (client.loyalty_points?.[0]?.level ?? 'bronze') as LoyaltyLevel
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{client.name}</p>
                      <p className="text-xs text-slate-400">{client.phone}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${levelStyles[level]}`}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-3 text-xs">
                    <span className="text-slate-400">
                      Last visit:{' '}
                      <span className="text-slate-600">
                        {client.last_visit ? formatDate(client.last_visit) : '—'}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      No-shows:{' '}
                      {client.no_show_count > 0
                        ? <span className="text-red-500 font-medium">{client.no_show_count}</span>
                        : <span className="text-slate-600">0</span>}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Desktop — table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Client</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Last visit</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Level</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">No-shows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(client => {
                  const level = (client.loyalty_points?.[0]?.level ?? 'bronze') as LoyaltyLevel
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/clients/${client.id}`} className="group">
                          <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {client.name}
                          </p>
                          <p className="text-xs text-slate-400">{client.phone}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {client.last_visit
                          ? formatDate(client.last_visit)
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${levelStyles[level]}`}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {client.no_show_count > 0
                          ? <span className="text-red-500 font-medium">{client.no_show_count}</span>
                          : <span className="text-slate-300">0</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
