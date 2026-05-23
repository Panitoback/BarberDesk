'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle, ExternalLink } from 'lucide-react'

type Plan = 'trial' | 'active' | 'suspended'

type Tenant = {
  id: string
  name: string
  subdomain: string
  twilio_number: string | null
  plan: Plan
  created_at: string
  owner_id: string
  owner_email: string
  stats: { clients: number; appointments: number; sms_sent: number }
}

const planStyles: Record<Plan, string> = {
  trial:     'bg-indigo-50 text-indigo-700 ring-indigo-200',
  active:    'bg-green-50 text-green-700 ring-green-200',
  suspended: 'bg-red-50 text-red-700 ring-red-200',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function TenantsTable({ tenants }: { tenants: Tenant[] }) {
  if (tenants.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <p className="text-slate-400 text-sm">No shops registered yet. The first signup will show up here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tenants.map(t => <TenantCard key={t.id} tenant={t} />)}
    </div>
  )
}

function TenantCard({ tenant }: { tenant: Tenant }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [twilio, setTwilio]   = useState(tenant.twilio_number ?? '')
  const [plan, setPlan]       = useState<Plan>(tenant.plan)
  const [twilioSaving, setTwilioSaving] = useState(false)
  const [planSaving, setPlanSaving]     = useState(false)
  const [twilioStatus, setTwilioStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [planStatus, setPlanStatus]     = useState<'idle' | 'saved' | 'error'>('idle')
  const [twilioError, setTwilioError]   = useState<string | null>(null)

  const dirty = twilio !== (tenant.twilio_number ?? '')

  async function saveTwilio() {
    setTwilioSaving(true)
    setTwilioStatus('idle')
    setTwilioError(null)

    const value = twilio.trim()

    const res = await fetch(`/api/admin/tenants/${tenant.id}/twilio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twilio_number: value === '' ? null : value }),
    })

    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      setTwilioStatus('saved')
      startTransition(() => router.refresh())
    } else {
      setTwilioStatus('error')
      setTwilioError(data.error ?? 'Could not save.')
    }
    setTwilioSaving(false)
  }

  async function changePlan(next: Plan) {
    const previous = plan
    setPlan(next)
    setPlanSaving(true)
    setPlanStatus('idle')

    const res = await fetch(`/api/admin/tenants/${tenant.id}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: next }),
    })

    if (res.ok) {
      setPlanStatus('saved')
      startTransition(() => router.refresh())
    } else {
      setPlan(previous)
      setPlanStatus('error')
    }
    setPlanSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-slate-900 truncate">{tenant.name}</h2>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${planStyles[plan]}`}>
              {plan}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-sm">
            <a
              href={`https://${tenant.subdomain}.barberqueue.pro`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-500 font-mono"
            >
              {tenant.subdomain}.barberqueue.pro
            </a>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {tenant.owner_email} · joined {formatDate(tenant.created_at)}
          </p>
        </div>

        <div className="flex gap-2">
          <Stat label="Clients" value={tenant.stats.clients} />
          <Stat label="Appts"   value={tenant.stats.appointments} />
          <Stat label="SMS"     value={tenant.stats.sms_sent} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
        {/* Twilio number */}
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">
            Twilio number
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={twilio}
              onChange={e => { setTwilio(e.target.value); setTwilioStatus('idle') }}
              placeholder="+12494211641"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
            <button
              onClick={saveTwilio}
              disabled={!dirty || twilioSaving}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {twilioSaving ? '…' : 'Save'}
            </button>
          </div>
          {twilioStatus === 'saved' && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1.5">
              <Check className="w-3 h-3" /> Saved
            </p>
          )}
          {twilioStatus === 'error' && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3 h-3" />
              {twilioError ?? 'Save failed.'}
            </p>
          )}
          {!tenant.twilio_number && twilioStatus === 'idle' && (
            <p className="text-xs text-amber-600 mt-1.5">
              ⚠ No number set — inbound SMS to this shop will be dropped.
            </p>
          )}
        </div>

        {/* Plan */}
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">
            Plan
          </label>
          <select
            value={plan}
            onChange={e => changePlan(e.target.value as Plan)}
            disabled={planSaving}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-60"
          >
            <option value="trial">trial</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
          {planStatus === 'saved' && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1.5">
              <Check className="w-3 h-3" /> Saved
            </p>
          )}
          {planStatus === 'error' && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3 h-3" /> Save failed.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-slate-900 tabular-nums">{value}</p>
    </div>
  )
}
