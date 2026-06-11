import React from 'react'

const COLORS: Record<string, string> = {
  completed: 'bg-emerald-500',
  no_show:   'bg-red-400',
  cancelled: 'bg-slate-300',
}

function accentStyle(key: string): React.CSSProperties {
  if (key === 'pending') return { backgroundColor: 'var(--theme-accent, #6366f1)' }
  return {}
}

export type StatusBucket = {
  key:   string
  label: string
  count: number
  pct:   number
}

export default function StatusChart({ data, total }: { data: StatusBucket[]; total: number }) {
  if (total === 0) {
    return (
      <p className="text-sm text-slate-400 py-6 text-center">
        No appointments in this period.
      </p>
    )
  }

  return (
    <div>
      {/* Stacked bar */}
      <div className="h-6 rounded-full overflow-hidden flex bg-slate-100">
        {data.map(s =>
          s.pct > 0 ? (
            <div
              key={s.key}
              className={COLORS[s.key] ?? 'bg-slate-200'}
              style={{ width: `${s.pct}%`, ...accentStyle(s.key) }}
            />
          ) : null
        )}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        {data.map(s => (
          <div key={s.key} className="flex items-start gap-2.5">
            <div
              className={`w-3 h-3 rounded-full mt-1 shrink-0 ${COLORS[s.key] ?? 'bg-slate-200'}`}
              style={accentStyle(s.key)}
            />
            <div>
              <p className="text-xl font-bold text-slate-900 leading-none">{s.count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              <p className="text-xs text-slate-400">{s.pct}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
