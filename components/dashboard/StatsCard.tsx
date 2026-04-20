import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
}

export default function StatsCard({ label, value, icon: Icon, description }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-zinc-500">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-amber-500" />
        </div>
      </div>
      <p className="text-3xl font-bold text-zinc-900">{value}</p>
      {description && (
        <p className="text-xs text-zinc-400 mt-1">{description}</p>
      )}
    </div>
  )
}
