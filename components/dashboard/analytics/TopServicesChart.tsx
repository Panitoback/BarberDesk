export type ServiceBucket = { name: string; count: number; revenue: number }

export default function TopServicesChart({ data }: { data: ServiceBucket[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-10 text-center">
        No visits in this period.
      </p>
    )
  }

  const max = Math.max(...data.map(d => d.revenue), 1)

  return (
    <div className="space-y-3">
      {data.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <p className="text-sm text-slate-700 w-28 shrink-0 truncate" title={s.name}>
            {s.name}
          </p>
          <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${(s.revenue / max) * 100}%` }}
            />
          </div>
          <div className="text-right shrink-0 w-20">
            <span className="text-sm font-semibold text-slate-800">${s.revenue.toFixed(0)}</span>
            <span className="text-xs text-slate-400 ml-1">×{s.count}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
