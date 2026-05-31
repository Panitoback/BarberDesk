'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import MarkMessagesRead from '@/components/dashboard/MarkMessagesRead'

type Message = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  status: string
  created_at: string
}

function formatDateTime(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function SmsThread({
  clientId,
  initialMessages,
  hasPhone,
}: {
  clientId: string
  initialMessages: Message[]
  hasPhone: boolean
}) {
  // Server returns newest-first; reverse for chat display (oldest at top)
  const [messages, setMessages] = useState(() => [...initialMessages].reverse())
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const body = text.trim()
    if (!body || sending) return

    setSending(true)
    setError(null)

    const optimistic: Message = {
      id:         `opt-${Date.now()}`,
      direction:  'outbound',
      body,
      status:     'queued',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setText('')

    try {
      const res = await fetch(`/api/clients/${clientId}/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: body }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setText(body)
        setError((data as { error?: string }).error ?? 'Failed to send')
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setText(body)
      setError('Network error — check your connection')
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div>
      {/* Mark inbound messages read when this section mounts */}
      <MarkMessagesRead clientId={clientId} />

      <h2 className="text-base font-semibold text-slate-900 mb-3">SMS messages</h2>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Message thread */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No messages yet.</p>
          ) : (
            messages.map(msg => (
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
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compose box */}
        {hasPhone ? (
          <div className="border-t border-slate-100 p-3">
            {error && (
              <p className="text-xs text-red-500 mb-2">{error}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => { setText(e.target.value); setError(null) }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                rows={2}
                className="flex-1 resize-none text-sm text-slate-900 placeholder:text-slate-300 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-300">Ctrl + Enter to send</p>
          </div>
        ) : (
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">No phone number — SMS unavailable for this client.</p>
          </div>
        )}
      </div>
    </div>
  )
}
