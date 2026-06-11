export type BarberBucket = { name: string; revenue: number; count: number }

export default function BarberRevenueChart({ data }: { data: BarberBucket[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-10 text-center">
        No completed appointments with an assigned barber in this period.
      </p>
    )
  }

  const max = Math.max(...data.map(d => d.revenue), 1)

  return (
    <div className="space-y-3">
      {data.map((b, i) => (
        <div key={i} className="flex items-center gap-3">
          <p className="text-sm text-slate-700 w-28 shrink-0 truncate" title={b.name}>
            {b.name}
          </p>
          <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(b.revenue / max) * 100}%`, backgroundColor: 'var(--theme-accent, #6366f1)' }}
            />
          </div>
          <div className="text-right shrink-0 w-24">
            <span className="text-sm font-semibold text-slate-800">${b.revenue.toFixed(0)}</span>
            <span className="text-xs text-slate-400 ml-1">{b.count} job{b.count !== 1 ? 's' : ''}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
