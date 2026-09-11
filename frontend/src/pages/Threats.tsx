import { useEffect, useState } from 'react'
import { AlertTriangle, User, Car, ChevronDown, Shield, Check, ArrowUpRight, Clock } from 'lucide-react'
import type { ThreatEntry, ThreatStatus } from '../data/mockData'
import { alertToThreat, getAlerts, updateAlert } from '../api/client'
import useAlertSocket from '../hooks/useAlertSocket'
import SeverityBadge from '../components/SeverityBadge'

const STATUS_STYLES: Record<ThreatStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(214,69,69,0.1)', text: '#D64545', label: 'Active' },
  acknowledged: { bg: 'rgba(217,144,0,0.1)', text: '#D99000', label: 'Acknowledged' },
  escalated: { bg: 'rgba(214,69,69,0.15)', text: '#B22222', label: 'Escalated' },
  dismissed: { bg: 'rgba(100,116,139,0.1)', text: '#64748B', label: 'Dismissed' },
}

export default function Threats() {
  const [data, setData] = useState<ThreatEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'escalated'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getAlerts()
      .then((alerts) => { if (mounted) setData(alerts) })
      .catch((err) => { if (mounted) setError(err instanceof Error ? err.message : 'Unable to load alerts') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  useAlertSocket((alert) => {
    const next = alertToThreat(alert)
    setData((previous) => [next, ...previous.filter((item) => item.id !== next.id)])
  })

  const activeHigh = data.filter((t) => t.status !== 'dismissed' && t.severity === 'high').length
  const activeMed = data.filter((t) => t.status !== 'dismissed' && t.severity === 'medium').length
  const escalated = data.filter((t) => t.status === 'escalated').length

  const open = data.filter((t) => {
    if (t.status === 'dismissed') return false
    if (filter === 'all') return true
    return t.status === filter
  })
  const resolved = data.filter((t) => t.status === 'dismissed')

  const [showResolved, setShowResolved] = useState(false)

  const updateStatus = async (id: string, status: ThreatStatus) => {
    try {
      const alert = await updateAlert(id, { status, assigned_to: status === 'acknowledged' ? 'J. Ramirez' : undefined })
      const next = alertToThreat(alert)
      setData((previous) => previous.map((item) => item.id === id ? next : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update alert')
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>Threats &amp; Alerts</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Live threat board — active alerts requiring operator review
          </p>
        </div>
        {activeHigh > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: '#D64545', color: '#fff' }}>
            <AlertTriangle size={12} />
            {activeHigh} HIGH THREAT{activeHigh > 1 ? 'S' : ''} ACTIVE
          </span>
        )}
      </div>

      {loading && <div className="text-sm mb-4" style={{ color: '#64748B' }}>Loading alerts...</div>}
      {error && <div className="text-sm mb-4" style={{ color: '#D64545' }}>Failed to load alerts: {error}</div>}

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active High Threats', value: activeHigh, color: '#D64545', bg: 'rgba(214,69,69,0.08)', icon: AlertTriangle },
          { label: 'Active Medium Threats', value: activeMed, color: '#D99000', bg: 'rgba(217,144,0,0.08)', icon: Shield },
          { label: 'Escalated', value: escalated, color: '#B22222', bg: 'rgba(178,34,34,0.08)', icon: ArrowUpRight },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={17} style={{ color }} />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</div>
                <div className="text-sm" style={{ color: '#64748B' }}>{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'active', 'acknowledged', 'escalated'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === f ? '#2F6B4F' : '#fff',
              color: filter === f ? '#fff' : '#64748B',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && ` (${open.length + (filter === 'all' ? 0 : 0)})`}
          </button>
        ))}
      </div>

      {/* Active threats */}
      {open.length === 0 ? (
        <div className="bg-white rounded-xl py-16 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <Shield size={32} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
          <div className="text-sm font-medium" style={{ color: '#64748B' }}>No active threats in this view</div>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {open.map((threat) => (
            <ThreatCard key={threat.id} threat={threat} onAction={updateStatus} />
          ))}
        </div>
      )}

      {/* Resolved section */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: showResolved ? '1px solid #F1F5F9' : 'none' }}
          onClick={() => setShowResolved(!showResolved)}
        >
          <span className="text-sm font-semibold" style={{ color: '#64748B' }}>
            Resolved Today ({resolved.length})
          </span>
          <ChevronDown
            size={14}
            style={{ color: '#94A3B8', transform: showResolved ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
        {showResolved && (
          <div className="divide-y" style={{ borderColor: '#F8FAFC' }}>
            {resolved.map((threat) => (
              <div key={threat.id} className="flex items-center gap-4 px-5 py-3" style={{ opacity: 0.6 }}>
                <span className="font-mono text-xs w-20 flex-shrink-0" style={{ color: '#64748B' }}>{threat.id}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {threat.entityType === 'person' ? <User size={11} style={{ color: '#94A3B8' }} /> : <Car size={11} style={{ color: '#94A3B8' }} />}
                  <span className="font-mono text-xs" style={{ color: '#64748B' }}>{threat.entityId}</span>
                </div>
                <span className="flex-1 text-sm truncate" style={{ color: '#64748B' }}>{threat.event}</span>
                <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{threat.camera}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748B' }}>
                  Dismissed
                </span>
                <span className="text-xs" style={{ color: '#94A3B8' }}>{threat.assignedTo ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ThreatCard({ threat, onAction }: { threat: ThreatEntry; onAction: (id: string, s: ThreatStatus) => void }) {
  const statusCfg = STATUS_STYLES[threat.status]
  const scoreColor = threat.threatScore >= 70 ? '#D64545' : threat.threatScore >= 40 ? '#D99000' : '#2E7D32'

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        borderLeft: `3px solid ${threat.severity === 'high' ? '#D64545' : threat.severity === 'medium' ? '#D99000' : '#2E7D32'}`,
      }}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: entity + event */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: threat.severity === 'high' ? 'rgba(214,69,69,0.08)' : 'rgba(217,144,0,0.08)' }}
            >
              {threat.entityType === 'person'
                ? <User size={18} style={{ color: threat.severity === 'high' ? '#D64545' : '#D99000' }} />
                : <Car size={18} style={{ color: threat.severity === 'high' ? '#D64545' : '#D99000' }} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold" style={{ color: '#17212B' }}>{threat.entityId}</span>
                <SeverityBadge severity={threat.severity} showDot />
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: statusCfg.bg, color: statusCfg.text }}>
                  {statusCfg.label}
                </span>
              </div>
              <div className="text-sm font-medium mb-2" style={{ color: '#17212B' }}>{threat.event}</div>
              <div className="flex items-center gap-4 text-xs" style={{ color: '#64748B' }}>
                <span className="font-mono">{threat.camera}</span>
                <span>·</span>
                <span>{threat.zone}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {threat.openedAt}
                </span>
                {threat.assignedTo && (
                  <>
                    <span>·</span>
                    <span>Assigned: <strong>{threat.assignedTo}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: score + actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Threat score bar */}
            <div className="text-right">
              <div className="font-mono text-lg font-bold" style={{ color: scoreColor }}>{threat.threatScore}</div>
              <div className="text-xs" style={{ color: '#94A3B8' }}>/ 100</div>
              <div className="w-20 h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: '#F1F5F9' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${threat.threatScore}%`, background: scoreColor, transition: 'width 0.5s' }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1.5">
              {threat.status === 'active' && (
                <>
                  <button
                    onClick={() => onAction(threat.id, 'acknowledged')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'rgba(47,107,79,0.1)', color: '#2F6B4F' }}
                  >
                    <Check size={11} /> Acknowledge
                  </button>
                  <button
                    onClick={() => onAction(threat.id, 'escalated')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'rgba(217,144,0,0.1)', color: '#D99000' }}
                  >
                    <ArrowUpRight size={11} /> Escalate
                  </button>
                  <button
                    onClick={() => onAction(threat.id, 'dismissed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: '#F8FAFC', color: '#94A3B8' }}
                  >
                    Dismiss
                  </button>
                </>
              )}
              {threat.status === 'acknowledged' && (
                <>
                  <button
                    onClick={() => onAction(threat.id, 'escalated')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(214,69,69,0.1)', color: '#D64545' }}
                  >
                    <ArrowUpRight size={11} /> Escalate
                  </button>
                  <button
                    onClick={() => onAction(threat.id, 'dismissed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: '#F8FAFC', color: '#94A3B8' }}
                  >
                    Dismiss
                  </button>
                </>
              )}
              {threat.status === 'escalated' && (
                <button
                  onClick={() => onAction(threat.id, 'dismissed')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: '#F8FAFC', color: '#94A3B8' }}
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
