/**
 * EventDetailPanel — slide-over panel showing real backend event details.
 * Shows when a row is clicked in ActivityLog.
 */
import { useEffect, useState } from 'react'
import {
  X, Camera, MapPin, Clock, Car, User, Shield, AlertTriangle,
  Hash, ImageIcon, Tag, Cpu
} from 'lucide-react'
import SeverityBadge from './SeverityBadge'
import { evidenceUrl } from '../api/client'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

interface EventDetail {
  event_id: string
  track_id: string
  camera_id: string
  event_type: string
  event_type_label: string | null
  event_description: string | null
  entity_type: string | null
  confidence: number | null
  threat_score: number
  severity: string
  status: string
  zone_id: string | null
  timestamp: string
  evidence_path: string | null
  metadata: Record<string, unknown>
}

interface Props {
  eventId: string | null
  onClose: () => void
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs mb-0.5" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`} style={{ color: '#17212B', wordBreak: 'break-all' }}>
        {value ?? <span style={{ color: '#CBD5E1' }}>—</span>}
      </div>
    </div>
  )
}

export default function EventDetailPanel({ eventId, onClose }: Props) {
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) { setEvent(null); return }
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/events/${eventId}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then((row: EventDetail) => setEvent(row))
      .catch(() => setError('Could not load event details'))
      .finally(() => setLoading(false))
  }, [eventId])

  const isVehicle = event?.entity_type === 'vehicle'
  const plate = event?.metadata?.plate as string | undefined
  const bbox = event?.metadata?.bbox as number[] | undefined
  const evidenceImageUrl = evidenceUrl(event?.evidence_path)

  const conf = event?.confidence != null
    ? Math.round(event.confidence <= 1 ? event.confidence * 100 : event.confidence)
    : null

  const ts = event?.timestamp ? new Date(event.timestamp) : null
  const timeStr = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
  const dateStr = ts ? ts.toLocaleDateString() : '—'

  const sevColor = event?.severity === 'high' ? '#D64545' : event?.severity === 'medium' ? '#D99000' : '#2E7D32'

  if (!eventId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 420,
          background: '#fff',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.2s ease',
        }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-2">
            {isVehicle
              ? <Car size={16} style={{ color: '#2F6B4F' }} />
              : <User size={16} style={{ color: '#64748B' }} />}
            <span className="font-semibold text-sm" style={{ color: '#17212B' }}>
              {isVehicle ? 'Vehicle Event' : 'Person Event'}
            </span>
            {event && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${sevColor}18`, color: sevColor }}
              >
                {event.severity.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: '#F8FAFC' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F8FAFC')}
          >
            <X size={14} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#94A3B8' }}>
              Loading…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#D64545' }}>
              {error}
            </div>
          )}

          {event && (
            <>
              {/* Evidence snapshot */}
              {evidenceImageUrl && (
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
                    EVIDENCE SNAPSHOT
                  </div>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid #E2E8F0', background: '#0f1923' }}
                  >
                    <img
                      src={evidenceImageUrl}
                      alt="Event evidence snapshot"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                      style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                    />
                    <div
                      className="px-3 py-2 flex items-center gap-2"
                      style={{ borderTop: '1px solid #E2E8F0', background: '#FAFBFC' }}
                    >
                      <ImageIcon size={11} style={{ color: '#2F6B4F' }} />
                      <span className="text-xs font-mono" style={{ color: '#64748B' }}>
                        {event.evidence_path}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Plate number — most important for vehicles */}
              {isVehicle && (
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
                    LICENCE PLATE
                  </div>
                  {plate ? (
                    <div
                      className="flex items-center justify-center rounded-xl py-4"
                      style={{
                        background: 'linear-gradient(135deg, #17212B 0%, #1e2d3d 100%)',
                        border: '2px solid #2F6B4F',
                      }}
                    >
                      <span
                        className="font-mono font-bold tracking-widest"
                        style={{ color: '#fff', fontSize: 28, letterSpacing: '0.2em' }}
                      >
                        {plate}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-xl py-4"
                      style={{ background: '#F8FAFC', border: '1px dashed #E2E8F0' }}
                    >
                      <span className="text-sm" style={{ color: '#94A3B8' }}>
                        Plate not yet read — vehicle tracked by ID
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Event info */}
              <div>
                <div className="text-xs font-semibold mb-3" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
                  EVENT DETAILS
                </div>
                <div className="rounded-xl space-y-0" style={{ border: '1px solid #F1F5F9' }}>
                  {[
                    { icon: <Tag size={12} />, label: 'Description', value: event.event_description || event.event_type },
                    { icon: <Cpu size={12} />, label: 'Event Type', value: event.event_type_label || event.event_type },
                    { icon: <Clock size={12} />, label: 'Time', value: `${timeStr} · ${dateStr}` },
                    { icon: <Camera size={12} />, label: 'Camera', value: event.camera_id, mono: true },
                    { icon: <MapPin size={12} />, label: 'Zone', value: event.zone_id || 'Unassigned' },
                    { icon: <Shield size={12} />, label: 'Track ID', value: event.track_id, mono: true },
                  ].map(({ icon, label, value, mono }, i, arr) => (
                    <div
                      key={label}
                      className="flex items-start gap-3 px-4 py-3"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                    >
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#94A3B8' }}>{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>{label}</div>
                        <div className={`text-sm ${mono ? 'font-mono' : ''} truncate`} style={{ color: '#17212B' }}>
                          {value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Confidence',
                    value: conf != null ? `${conf}%` : '—',
                    color: conf != null && conf > 90 ? '#2E7D32' : conf != null && conf > 75 ? '#D99000' : '#94A3B8',
                  },
                  {
                    label: 'Threat Score',
                    value: event.threat_score > 0 ? `${event.threat_score}/100` : '—',
                    color: event.threat_score >= 70 ? '#D64545' : event.threat_score >= 40 ? '#D99000' : '#64748B',
                  },
                  {
                    label: 'Status',
                    value: event.status.toUpperCase(),
                    color: event.status === 'open' ? '#D64545' : event.status === 'closed' ? '#2E7D32' : '#D99000',
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-xl px-3 py-3 text-center"
                    style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}
                  >
                    <div className="text-xs mb-1" style={{ color: '#94A3B8' }}>{label}</div>
                    <div className="font-mono font-bold text-sm" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Raw metadata */}
              {Object.keys(event.metadata).length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
                    DETECTION METADATA
                  </div>
                  <div
                    className="rounded-xl px-4 py-3 font-mono text-xs"
                    style={{ background: '#0f1923', color: '#94A3B8', lineHeight: 1.8 }}
                  >
                    {Object.entries(event.metadata).map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: '#2F6B4F' }}>{k}</span>
                        <span style={{ color: '#64748B' }}>{': '}</span>
                        <span style={{ color: '#E2E8F0' }}>
                          {k === 'bbox' && Array.isArray(v)
                            ? `[${(v as number[]).map(n => Math.round(n)).join(', ')}]`
                            : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alert badge */}
              {event.severity === 'high' && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(214,69,69,0.06)', border: '1px solid rgba(214,69,69,0.2)' }}
                >
                  <AlertTriangle size={14} style={{ color: '#D64545' }} />
                  <span className="text-sm font-medium" style={{ color: '#D64545' }}>
                    This event has a high severity rating. Check Alerts panel.
                  </span>
                </div>
              )}

              {/* Event ID */}
              <div className="flex items-center gap-2 pt-2 pb-1">
                <Hash size={10} style={{ color: '#CBD5E1' }} />
                <span className="font-mono text-xs" style={{ color: '#CBD5E1' }}>{event.event_id}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
