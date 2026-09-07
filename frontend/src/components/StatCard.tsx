import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  color: string
  bg: string
  trend?: { value: string; positive: boolean }
}

export default function StatCard({ label, value, sub, icon: Icon, color, bg, trend }: Props) {
  return (
    <div
      className="bg-white rounded-xl p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <Icon size={17} style={{ color }} />
        </div>
        {trend && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: trend.positive ? 'rgba(46,125,50,0.1)' : 'rgba(214,69,69,0.1)',
              color: trend.positive ? '#2E7D32' : '#D64545',
            }}
          >
            {trend.value}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: '#17212B' }}>
        {value}
      </div>
      <div className="text-sm font-medium mt-0.5" style={{ color: '#17212B' }}>
        {label}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: '#64748B' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
