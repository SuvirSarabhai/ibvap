import { useEffect, useState } from 'react'
import { FileCheck, User, Car, X, Clock, Archive } from 'lucide-react'
import type { IncidentEntry, IncidentStatus } from '../data/mockData'
import { addIncidentNote, createIncident, getIncidents, incidentToEntry, updateIncident } from '../api/client'
import SeverityBadge from '../components/SeverityBadge'

const STATUS_STYLES: Record<IncidentStatus, { bg: string; text: string }> = {
  open: { bg: 'rgba(214,69,69,0.1)', text: '#D64545' },
  reviewing: { bg: 'rgba(217,144,0,0.1)', text: '#D99000' },
  escalated: { bg: 'rgba(178,34,34,0.12)', text: '#B22222' },
  closed: { bg: 'rgba(46,125,50,0.1)', text: '#2E7D32' },
}

export default function Incidents() {
  const [statusFilter, setStatusFilter] = useState<'All' | IncidentStatus>('All')
  const [selected, setSelected] = useState<IncidentEntry | null>(null)
  const [data, setData] = useState<IncidentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    const incidents = await getIncidents()
    setData(incidents)
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load incidents'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = data.filter((inc) =>
    statusFilter === 'All' ? true : inc.status === statusFilter
  )

  const counts = {
    All: data.length,
    open: data.filter((i) => i.status === 'open').length,
    reviewing: data.filter((i) => i.status === 'reviewing').length,
    escalated: data.filter((i) => i.status === 'escalated').length,
    closed: data.filter((i) => i.status === 'closed').length,
  }

  const updateSelected = async (body: Record<string, unknown>) => {
    if (!selected) return
    try {
      const updated = incidentToEntry(await updateIncident(selected.id, body))
      setSelected(updated)
      setData((previous) => previous.map((item) => item.id === updated.id ? updated : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update incident')
    }
  }

  const createManualIncident = async () => {
    const incidentType = window.prompt('Incident type', 'Manual Review')
    if (!incidentType) return
    const cameraId = window.prompt('Camera ID', 'manual')
    if (!cameraId) return
    try {
      const incident = incidentToEntry(await createIncident({ incident_type: incidentType, camera_id: cameraId, severity: 'normal' }))
      setData((previous) => [incident, ...previous])
      setSelected(incident)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create incident')
    }
  }

  const addNote = async () => {
    if (!selected) return
    const text = window.prompt('Note')
    if (!text) return
    try {
      const updated = incidentToEntry(await addIncidentNote(selected.id, { operator: 'J. Ramirez', text }))
      setSelected(updated)
      setData((previous) => previous.map((item) => item.id === updated.id ? updated : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add note')
    }
  }

  return (
    <div className="p-8 flex gap-6">
      {/* Main panel */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>Confirmed Incidents</h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              Case management — {data.length} incidents today
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2F6B4F' }}
            onClick={createManualIncident}
          >
            <FileCheck size={14} />
            Create Incident
          </button>
        </div>

        {loading && <div className="text-sm mb-4" style={{ color: '#64748B' }}>Loading incidents...</div>}
        {error && <div className="text-sm mb-4" style={{ color: '#D64545' }}>Failed to load incidents: {error}</div>}

        {/* Status filter pills */}
        <div className="flex items-center gap-2 mb-4">
          {(['All', 'open', 'reviewing', 'escalated', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              style={{
                background: statusFilter === s ? '#2F6B4F' : '#fff',
                color: statusFilter === s ? '#fff' : '#64748B',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span
                className="rounded-full px-1.5 text-xs font-bold"
                style={{
                  background: statusFilter === s ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                  color: statusFilter === s ? '#fff' : '#94A3B8',
                  fontSize: 10,
                }}
              >
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {/* Head */}
          <div
            className="grid px-5 py-3 text-xs font-semibold"
            style={{
              gridTemplateColumns: '90px 140px 80px 90px 140px 80px 100px 90px',
              color: '#64748B',
              borderBottom: '1px solid #F1F5F9',
              background: '#FAFBFC',
              letterSpacing: '0.04em',
            }}
          >
            <div>INCIDENT</div>
            <div>TYPE</div>
            <div>ENTITY</div>
            <div>SEVERITY</div>
            <div>CAMERA · ZONE</div>
            <div>OPENED</div>
            <div>ASSIGNED</div>
            <div>STATUS</div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>
              No incidents match this filter
            </div>
          ) : (
            filtered.map((inc) => {
              const ss = STATUS_STYLES[inc.status]
              const isActive = selected?.id === inc.id
              return (
                <div
                  key={inc.id}
                  className="grid items-center px-5 py-3 cursor-pointer transition-colors"
                  style={{
                    gridTemplateColumns: '90px 140px 80px 90px 140px 80px 100px 90px',
                    borderBottom: '1px solid #F8FAFC',
                    background: isActive ? '#F0F7F4' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F8FAFD' }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  onClick={() => setSelected(isActive ? null : inc)}
                >
                  <span className="font-mono text-xs font-semibold" style={{ color: '#2F6B4F' }}>{inc.id}</span>
                  <span className="text-sm truncate" style={{ color: '#17212B' }}>{inc.type}</span>
                  <div className="flex items-center gap-1">
                    {inc.entityType === 'person' ? <User size={11} style={{ color: '#64748B' }} /> : <Car size={11} style={{ color: '#64748B' }} />}
                    <span className="font-mono text-xs" style={{ color: '#17212B' }}>{inc.entityId}</span>
                  </div>
                  <SeverityBadge severity={inc.severity} showDot />
                  <div>
                    <div className="font-mono text-xs font-medium" style={{ color: '#17212B' }}>{inc.camera}</div>
                    <div className="text-xs truncate" style={{ color: '#64748B', fontSize: 11 }}>{inc.zone.split(' · ')[1] ?? inc.zone}</div>
                  </div>
                  <span className="font-mono text-xs" style={{ color: '#64748B' }}>{inc.openedAt.slice(0, 5)}</span>
                  <span className="text-xs truncate" style={{ color: '#64748B' }}>{inc.assignedTo}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: ss.bg, color: ss.text, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}
                  >
                    {inc.status}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div
          className="flex-shrink-0 bg-white rounded-xl overflow-auto"
          style={{ width: 340, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', maxHeight: 'calc(100vh - 80px)', position: 'sticky', top: 0 }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <div className="font-mono text-sm font-bold" style={{ color: '#2F6B4F' }}>{selected.id}</div>
              <div className="text-xs" style={{ color: '#64748B' }}>{selected.type}</div>
            </div>
            <button onClick={() => setSelected(null)}>
              <X size={16} style={{ color: '#94A3B8' }} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Meta */}
            <div className="space-y-2.5">
              {[
                { label: 'Entity', value: selected.entityId, mono: true },
                { label: 'Severity', value: <SeverityBadge severity={selected.severity} showDot /> },
                { label: 'Status', value: <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLES[selected.status].bg, color: STATUS_STYLES[selected.status].text }}>{selected.status}</span> },
                { label: 'Camera', value: selected.camera, mono: true },
                { label: 'Zone', value: selected.zone },
                { label: 'Opened', value: selected.openedAt, mono: true },
                { label: 'Assigned to', value: selected.assignedTo },
                { label: 'Evidence', value: `${selected.evidenceCount} clip${selected.evidenceCount !== 1 ? 's' : ''}` },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#94A3B8' }}>{label}</span>
                  {typeof value === 'string' ? (
                    <span className={`text-sm ${mono ? 'font-mono' : ''}`} style={{ color: '#17212B' }}>{value}</span>
                  ) : value}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
              <button className="w-full py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#D99000' }} onClick={() => updateSelected({ status: 'escalated' })}>
                Escalate Incident
              </button>
              <button className="w-full py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid #E2E8F0', color: '#64748B' }} onClick={addNote}>
                Add Note
              </button>
              {selected.status !== 'closed' && (
                <button className="w-full py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(46,125,50,0.1)', color: '#2E7D32' }} onClick={() => updateSelected({ status: 'closed' })}>
                  Close Incident
                </button>
              )}
            </div>

            {/* Notes timeline */}
            {selected.notes.length > 0 && (
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
                <div className="text-xs font-semibold mb-3" style={{ color: '#64748B', letterSpacing: '0.05em' }}>NOTES</div>
                <div className="space-y-3">
                  {selected.notes.map((n, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ background: n.operator === 'System' ? '#94A3B8' : '#2F6B4F', fontSize: 9 }}
                      >
                        {n.operator === 'System' ? '⚙' : n.operator.split(' ').map((x) => x[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium" style={{ color: '#17212B' }}>{n.operator}</span>
                          <span className="font-mono text-xs flex items-center gap-0.5" style={{ color: '#94A3B8' }}>
                            <Clock size={9} /> {n.time}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: '#64748B' }}>{n.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence */}
            {selected.evidenceCount > 0 && (
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold" style={{ color: '#64748B', letterSpacing: '0.05em' }}>EVIDENCE</div>
                </div>
                {Array.from({ length: selected.evidenceCount }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(47,107,79,0.08)' }}>
                      <Archive size={12} style={{ color: '#2F6B4F' }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold font-mono" style={{ color: '#17212B' }}>Clip {i + 1}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{selected.camera} · MP4/H.264</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
