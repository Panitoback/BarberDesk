export type HourBucket = { hour: number; count: number }

function hourLabel(h: number) {
  if (h === 12) return '12p'
  if (h > 12)   return `${h - 12}p`
  return `${h}a`
}

export default function HoursChart({ data }: { data: HourBucket[] }) {
  const max  = Math.max(...data.map(d => d.count), 1)
  const hasAny = data.some(d => d.count > 0)
  const peak = hasAny ? data.reduce((a, b) => (a.count >= b.count ? a : b)) : null

  if (!hasAny) {
    return (
      <p className="text-sm text-slate-400 py-10 text-center">
        No appointments in the last 30 days.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-end gap-0.5 h-24">
        {data.map((d, i) => {
          const pct     = d.count > 0 ? Math.max((d.count / max) * 100, 5) : 1
          const isPeak  = d.count > 0 && d.count === peak?.count
          return (
            <div
              key={i}
              className="flex-1 min-w-0 h-full flex flex-col justify-end relative group"
            >
              {d.count > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                  {d.count} appt{d.count !== 1 ? 's' : ''} · {hourLabel(d.hour)}
                </div>
              )}
              <div
                className={`w-full rounded-t cursor-default ${isPeak ? 'bg-indigo-600' : 'bg-indigo-400'}`}
                style={{ height: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-0.5 mt-2 border-t border-slate-100 pt-2">
        {data.map((d, i) => (
          <p key={i} className="flex-1 text-center text-slate-400 leading-none text-[9px]">
            {i % 2 === 0 ? hourLabel(d.hour) : ''}
          </p>
        ))}
      </div>
    </div>
  )
}
