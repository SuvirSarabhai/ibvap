type Status = 'online' | 'offline' | 'degraded' | 'maintenance' | string

const CONFIG: Record<string, { label: string; text: string; bg: string; pulse?: boolean }> = {
  online: { label: 'Online', text: '#2E7D32', bg: 'rgba(46,125,50,0.1)' },
  offline: { label: 'Offline', text: '#D64545', bg: 'rgba(214,69,69,0.1)', pulse: true },
  degraded: { label: 'Degraded', text: '#D99000', bg: 'rgba(217,144,0,0.1)' },
  maintenance: { label: 'Maintenance', text: '#64748B', bg: 'rgba(100,116,139,0.1)' },
}

interface Props {
  status: Status
  showDot?: boolean
}

export default function StatusBadge({ status, showDot = true }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.offline
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text, letterSpacing: '0.03em' }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: cfg.text,
            boxShadow: cfg.pulse ? `0 0 4px ${cfg.text}` : 'none',
          }}
        />
      )}
      {cfg.label}
    </span>
  )
}
