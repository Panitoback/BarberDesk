'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type UnreadMessage = {
  id: string
  client_id: string
  body: string
  created_at: string
  clients: { name: string } | null
}

type ClientGroup = {
  client_id: string
  client_name: string
  last_message: string
  last_at: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

// Module-level singleton: NotificationBell is rendered twice (mobile header +
// desktop sidebar) but only one of the two is visible at a time via CSS. To
// avoid duplicate Realtime channels + duplicate fetches, all instances share a
// single subscription refcounted by mount/unmount.
type Subscriber = (groups: ClientGroup[]) => void
const subscribers = new Set<Subscriber>()
let cachedGroups: ClientGroup[] = []
let activeChannel: RealtimeChannel | null = null
let inflightFetch: Promise<void> | null = null

async function fetchUnreadShared(): Promise<void> {
  if (inflightFetch) return inflightFetch
  inflightFetch = (async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, client_id, body, created_at, clients(name)')
      .eq('direction', 'inbound')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data) { inflightFetch = null; return }

    const seen = new Set<string>()
    const grouped: ClientGroup[] = []
    for (const msg of data as UnreadMessage[]) {
      if (seen.has(msg.client_id)) continue
      seen.add(msg.client_id)
      grouped.push({
        client_id:    msg.client_id,
        client_name:  msg.clients?.name ?? 'Unknown',
        last_message: msg.body,
        last_at:      msg.created_at,
      })
    }
    cachedGroups = grouped
    subscribers.forEach(cb => cb(grouped))
    inflightFetch = null
  })()
  return inflightFetch
}

function subscribe(cb: Subscriber): () => void {
  subscribers.add(cb)
  cb(cachedGroups)

  if (subscribers.size === 1) {
    const supabase = createClient()
    activeChannel = supabase
      .channel('inbound-messages-shared')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'direction=eq.inbound' },
        () => { fetchUnreadShared() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'direction=eq.inbound' },
        () => { fetchUnreadShared() }
      )
      .subscribe()
    fetchUnreadShared()
  }

  return () => {
    subscribers.delete(cb)
    if (subscribers.size === 0 && activeChannel) {
      const supabase = createClient()
      supabase.removeChannel(activeChannel)
      activeChannel = null
    }
  }
}

export default function NotificationBell() {
  const router = useRouter()
  const [groups, setGroups] = useState<ClientGroup[]>(cachedGroups)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => subscribe(setGroups), [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleClientClick(clientId: string) {
    setOpen(false)
    router.push(`/clients/${clientId}`)
  }

  const count = groups.length

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label={`${count} unread messages`}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-16px)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">
              {count > 0 ? `${count} unread message${count > 1 ? 's' : ''}` : 'No unread messages'}
            </span>
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              All caught up!
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {groups.map(g => (
                <li key={g.client_id}>
                  <button
                    onClick={() => handleClientClick(g.client_id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-900 truncate">{g.client_name}</span>
                      <span className="text-xs text-slate-400 shrink-0">{timeAgo(g.last_at)}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{g.last_message}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
