'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Camera, Check, X } from 'lucide-react'
import Image from 'next/image'
import { barberPhotoUrl, formatPriceModifier, type Barber } from '@/lib/barbers'

type BarberRow = Omit<Barber, 'hours'> & { hours: unknown }

type BarberDraft = {
  id: string | null // null = unsaved new barber
  name: string
  email: string
  bio: string
  price_modifier: number
  active: boolean
  photo_path: string | null
  isNew?: boolean
  saving?: boolean
  error?: string | null
}

function pctToModifier(pct: number): number {
  return Math.round((1 + pct / 100) * 1000) / 1000
}

function modifierToPct(mod: number): number {
  return Math.round((mod - 1) * 100)
}

export default function BarbersTab({ initialBarbers }: { initialBarbers: BarberRow[] }) {
  const [barbers, setBarbers] = useState<BarberDraft[]>(
    initialBarbers.map(b => ({
      id:             b.id,
      name:           b.name,
      email:          b.email ?? '',
      bio:            b.bio ?? '',
      price_modifier: b.price_modifier,
      active:         b.active,
      photo_path:     b.photo_path,
    }))
  )
  const [globalError, setGlobalError] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function update(idx: number, patch: Partial<BarberDraft>) {
    setBarbers(bs => bs.map((b, i) => i === idx ? { ...b, ...patch } : b))
  }

  function addBarber() {
    setBarbers(bs => [...bs, {
      id: null,
      name: '',
      email: '',
      bio: '',
      price_modifier: 1.0,
      active: true,
      photo_path: null,
      isNew: true,
    }])
  }

  async function saveBarber(idx: number) {
    const b = barbers[idx]
    update(idx, { saving: true, error: null })

    const payload = {
      name:           b.name.trim(),
      email:          b.email.trim() || null,
      bio:            b.bio.trim() || null,
      price_modifier: b.price_modifier,
      active:         b.active,
    }

    try {
      if (b.isNew || !b.id) {
        const res = await fetch('/api/barbers', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const json = await res.json() as { barber?: { id: string }; error?: string }
        if (!res.ok) throw new Error(json.error ?? 'Failed to save')
        update(idx, { id: json.barber!.id, isNew: false, saving: false })
      } else {
        const res = await fetch(`/api/barbers/${b.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const json = await res.json() as { error?: string }
        if (!res.ok) throw new Error(json.error ?? 'Failed to save')
        update(idx, { saving: false })
      }
    } catch (err) {
      update(idx, { saving: false, error: err instanceof Error ? err.message : 'Error' })
    }
  }

  async function deleteBarber(idx: number) {
    const b = barbers[idx]
    if (b.isNew || !b.id) {
      setBarbers(bs => bs.filter((_, i) => i !== idx))
      return
    }
    update(idx, { saving: true, error: null })
    try {
      const res = await fetch(`/api/barbers/${b.id}`, { method: 'DELETE' })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete')
      setBarbers(bs => bs.filter((_, i) => i !== idx))
    } catch (err) {
      update(idx, { saving: false, error: err instanceof Error ? err.message : 'Error' })
    }
  }

  async function moveBarber(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= barbers.length) return
    const bs = [...barbers]
    ;[bs[idx], bs[target]] = [bs[target], bs[idx]]
    setBarbers(bs)

    // Persist display_order = array index for each barber after the swap
    const toUpdate = [
      { barber: bs[idx], order: idx },
      { barber: bs[target], order: target },
    ]
    await Promise.all(
      toUpdate
        .filter(({ barber }) => barber.id !== null)
        .map(({ barber, order }) =>
          fetch(`/api/barbers/${barber.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ display_order: order }),
          })
        )
    ).catch(() => {})
  }

  async function uploadPhoto(idx: number, file: File) {
    const b = barbers[idx]
    if (!b.id) {
      setGlobalError('Save the barber first before uploading a photo.')
      return
    }
    update(idx, { saving: true, error: null })
    const fd = new FormData()
    fd.append('photo', file)
    try {
      const res = await fetch(`/api/barbers/${b.id}/photo`, { method: 'POST', body: fd })
      const json = await res.json() as { photo_path?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      update(idx, { photo_path: json.photo_path ?? null, saving: false })
    } catch (err) {
      update(idx, { saving: false, error: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  return (
    <div className="space-y-4">
      {globalError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{globalError}</p>
      )}

      {barbers.length === 0 && (
        <p className="text-sm text-slate-400 italic text-center py-8">
          No barbers added yet. Add your first barber below.
        </p>
      )}

      {barbers.map((b, idx) => {
        const photoUrl = barberPhotoUrl(b.photo_path)
        const pct = modifierToPct(b.price_modifier)

        return (
          <div
            key={b.id ?? `new-${idx}`}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
          >
            <div className="flex items-start gap-4">
              {/* Avatar + photo upload */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => fileRefs.current[`${idx}`]?.click()}
                  className="relative w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center group border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors"
                  title="Click to upload photo"
                >
                  {photoUrl ? (
                    <Image src={photoUrl} alt={b.name} width={64} height={64} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-lg font-bold text-slate-400">
                      {b.name ? b.name[0].toUpperCase() : '?'}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <input
                  ref={el => { fileRefs.current[`${idx}`] = el }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) uploadPhoto(idx, f)
                    e.target.value = ''
                  }}
                />
              </div>

              {/* Fields */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={b.name}
                    onChange={e => update(idx, { name: e.target.value })}
                    placeholder="Barber name"
                    maxLength={80}
                    className="flex-1 min-w-[140px] text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]"
                  />
                  {/* Active toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={b.active}
                    onClick={() => update(idx, { active: !b.active })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      b.active ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                    title={b.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${b.active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className={`text-xs font-medium ${b.active ? 'text-green-600' : 'text-slate-400'}`}>
                    {b.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="email"
                    value={b.email}
                    onChange={e => update(idx, { email: e.target.value })}
                    placeholder="barber@example.com (booking notifications)"
                    maxLength={200}
                    className="flex-1 min-w-[200px] text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]"
                  />
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Price adjustment</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={pct}
                        min={-80}
                        max={400}
                        step={5}
                        onChange={e => {
                          const v = Number(e.target.value) || 0
                          update(idx, { price_modifier: pctToModifier(v) })
                        }}
                        className="w-20 text-sm border border-slate-300 rounded-lg px-2 py-2 min-h-[40px] text-center"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                    {pct !== 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pct > 0 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {formatPriceModifier(b.price_modifier)} vs service price
                      </span>
                    )}
                  </div>
                </div>

                <textarea
                  value={b.bio}
                  onChange={e => update(idx, { bio: e.target.value.slice(0, 200) })}
                  placeholder="Short bio shown on the booking page (optional, max 200 chars)"
                  maxLength={200}
                  rows={2}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 resize-none"
                />
              </div>

              {/* Order buttons + delete */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveBarber(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveBarber(idx, 1)}
                  disabled={idx === barbers.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteBarber(idx)}
                  className="p-1 text-slate-400 hover:text-red-600 mt-1"
                  title="Delete barber"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Per-row error */}
            {b.error && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
                <X className="w-3.5 h-3.5 shrink-0" />{b.error}
              </p>
            )}

            {/* Save row */}
            <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => saveBarber(idx)}
                disabled={b.saving || b.name.trim().length === 0}
                className="inline-flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
              >
                {b.saving ? 'Saving…' : <><Check className="w-3.5 h-3.5" /> Save</>}
              </button>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addBarber}
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 px-3 py-2 rounded-lg border border-dashed border-indigo-300 hover:border-indigo-400 w-full justify-center min-h-[44px]"
      >
        <Plus className="w-4 h-4" /> Add barber
      </button>
    </div>
  )
}
