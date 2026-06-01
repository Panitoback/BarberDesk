export type RevenueBucket = { label: string; revenue: number; visits: number }

export default function RevenueChart({ data }: { data: RevenueBucket[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1)
  const hasAny = data.some(d => d.revenue > 0)

  if (!hasAny) {
    return (
      <p className="text-sm text-slate-400 py-10 text-center">
        No completed visits in this period.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-2 h-28 overflow-visible">
        {data.map((d, i) => {
          const pct = Math.max((d.revenue / max) * 100, 4)
          return (
            <div
              key={i}
              className="flex-1 min-w-0 h-full flex flex-col justify-end relative group"
            >
              {d.revenue > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                  ${d.revenue.toFixed(2)} · {d.visits} visit{d.visits !== 1 ? 's' : ''}
                </div>
              )}
              <div
                className={`w-full rounded-t cursor-default ${d.revenue > 0 ? 'bg-indigo-500' : 'bg-slate-200'}`}
                style={d.revenue > 0 ? { height: `${pct}%` } : { height: '3px' }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 sm:gap-2 mt-2 border-t border-slate-100 pt-2">
        {data.map((d, i) => (
          <p
            key={i}
            className="flex-1 text-center text-slate-400 truncate leading-none"
            style={{ fontSize: '0.625rem' }}
          >
            {d.label}
          </p>
        ))}
      </div>
    </div>
  )
}
