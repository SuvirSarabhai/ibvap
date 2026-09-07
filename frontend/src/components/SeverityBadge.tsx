type Severity = 'high' | 'medium' | 'normal'

const CONFIG: Record<Severity, { label: string; text: string; bg: string }> = {
  high: { label: 'HIGH', text: '#D64545', bg: 'rgba(214,69,69,0.1)' },
  medium: { label: 'MEDIUM', text: '#D99000', bg: 'rgba(217,144,0,0.1)' },
  normal: { label: 'NORMAL', text: '#2E7D32', bg: 'rgba(46,125,50,0.1)' },
}

interface Props {
  severity: Severity | string
  showDot?: boolean
}

export default function SeverityBadge({ severity, showDot = false }: Props) {
  const cfg = CONFIG[severity as Severity] ?? CONFIG.normal
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text, letterSpacing: '0.03em' }}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.text }} />
      )}
      {cfg.label}
    </span>
  )
}
