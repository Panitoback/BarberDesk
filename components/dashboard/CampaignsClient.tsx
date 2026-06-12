'use client'

import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Send, ChevronDown, Clock, Users } from 'lucide-react'

type Segment = 'all' | 'active_30' | 'inactive_60' | 'vip'

const SEGMENT_OPTIONS: { value: Segment; label: string; description: string }[] = [
  { value: 'all',         label: 'All clients',              description: 'Everyone with an email address' },
  { value: 'active_30',   label: 'Active (last 30 days)',    description: 'Visited in the past month' },
  { value: 'inactive_60', label: 'Inactive (60+ days)',      description: 'Haven\'t visited in 2+ months' },
  { value: 'vip',         label: 'VIP (Gold & Platinum)',    description: 'Your top loyalty clients' },
]

type Campaign = {
  id:              string
  subject:         string
  segment:         string
  channel:         string
  recipient_count: number
  sent_at:         string
}

const SEGMENT_LABELS: Record<string, string> = {
  all:          'All clients',
  active_30:    'Active (last 30 days)',
  inactive_60:  'Inactive (60+ days)',
  vip:          'VIP (Gold & Platinum)',
}

export default function CampaignsClient() {
  const [campaigns,    setCampaigns]    = useState<Campaign[]>([])
  const [loading,      setLoading]      = useState(true)
  const [composing,    setComposing]    = useState(false)
  const [subject,      setSubject]      = useState('')
  const [body,         setBody]         = useState('')
  const [segment,      setSegment]      = useState<Segment>('all')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [sending,      setSending]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState<string | null>(null)
  const [confirm,      setConfirm]      = useState(false)

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/campaigns')
    const json = await res.json() as { campaigns?: Campaign[] }
    setCampaigns(json.campaigns ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void loadCampaigns() }, [loadCampaigns])

  useEffect(() => {
    if (!composing) return
    setPreviewCount(null)
    void fetch(`/api/campaigns?preview=${segment}`)
      .then(r => r.json() as Promise<{ count: number }>)
      .then(j => setPreviewCount(j.count))
  }, [segment, composing])

  function resetForm() {
    setSubject('')
    setBody('')
    setSegment('all')
    setPreviewCount(null)
    setError(null)
    setConfirm(false)
    setComposing(false)
  }

  async function handleSend() {
    setSending(true)
    setError(null)
    try {
      const res  = await fetch('/api/campaigns', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject, body, segment }),
      })
      const json = await res.json() as { sent?: number; segmentLabel?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')
      const count = json.sent ?? 0
      setSuccess(`Sent to ${count} client${count === 1 ? '' : 's'}.`)
      resetForm()
      void loadCampaigns()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setConfirm(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Campaigns</h1>
            <p className="text-sm text-slate-500">Send one-time emails to your clients</p>
          </div>
        </div>
        {!composing && (
          <button
            onClick={() => { setComposing(true); setSuccess(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            New Campaign
          </button>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          {success}
        </div>
      )}

      {/* Compose form */}
      {composing && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-900">New Campaign</h2>

          {/* Segment */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Audience</label>
            <div className="relative">
              <select
                value={segment}
                onChange={e => setSegment(e.target.value as Segment)}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {SEGMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label} — {o.description}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {previewCount !== null && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {previewCount === 0
                  ? 'No clients match this segment'
                  : `${previewCount} client${previewCount === 1 ? '' : 's'} will receive this`}
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. We have openings this Saturday!"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Hey! We have a few spots open this week. Book at your usual link or reply to this email."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-400">An unsubscribe link is added automatically (required by CASL).</p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Confirm step */}
          {confirm ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
              <p className="text-sm font-medium text-amber-800">
                Send to {previewCount ?? '…'} client{previewCount === 1 ? '' : 's'}? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Yes, send now'}
                </button>
                <button
                  onClick={() => setConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  if (!subject.trim() || !body.trim()) {
                    setError('Subject and message are required.')
                    return
                  }
                  if (previewCount === 0) {
                    setError('No clients match this segment.')
                    return
                  }
                  setError(null)
                  setConfirm(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Campaign
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Past campaigns */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Sent campaigns</h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Megaphone className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No campaigns sent yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {campaigns.map(c => (
              <li key={c.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {SEGMENT_LABELS[c.segment] ?? c.segment} · {c.recipient_count} sent
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(c.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
