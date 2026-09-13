import type { ActivityRow, IncidentEntry, ThreatEntry, Severity, EntityType, IncidentStatus } from '../data/mockData'

type Filters = Record<string, string | number | undefined>

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

function query(filters: Filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'All') params.set(key, String(value))
  })
  const value = params.toString()
  return value ? `?${value}` : ''
}

const severity = (value: string | undefined): Severity =>
  (value === 'low' || value === 'normal' || !value) ? 'normal' : (value as Severity)

// Resolve entity type — uses the explicit backend field, falls back to 'person'
const entityType = (value: string | undefined): EntityType =>
  value === 'vehicle' ? 'vehicle' : 'person'

// Format track_id as P-XXXX or V-XXXX using last 4 chars
const entityId = (trackId: string | undefined, plate: string | undefined, type: EntityType): string => {
  if (!trackId && !plate) return '—'
  if (plate) return `V-${plate.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase()}`
  const raw = String(trackId || '')
  if (/^[PV]-/i.test(raw)) return raw.toUpperCase()
  const suffix = raw.slice(-4).padStart(4, '0')
  return `${type === 'vehicle' ? 'V' : 'P'}-${suffix}`
}
const label = (value: string | undefined) => value || 'Event'
const displayTime = (value: string | undefined) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
const displayDate = (value: string | undefined) => value ? new Date(value).toLocaleDateString() : ''

export function evidenceUrl(value: string | null | undefined): string | null {
  if (!value) return null
  // Stored paths are repository-relative, while older rows may contain
  // Windows separators or an absolute repository path. The evidence API
  // accepts only the basename, so normalize both forms here.
  const filename = value.split(/[\\/]/).pop()
  return filename ? `${API_BASE_URL}/api/evidence/${encodeURIComponent(filename)}` : null
}

export async function getEvents(filters: Filters = {}): Promise<ActivityRow[]> {
  const rows = await request<any[]>(`/api/events${query(filters)}`)
  return rows.map((row) => {
    const eType = entityType(row.entity_type)
    return {
      id: row.event_id,
      time: displayTime(row.timestamp),
      date: displayDate(row.timestamp),
      event: row.event_description || row.event_type_label || label(row.event_type),
      eventType: row.event_type_label || label(row.event_type),
      entityId: entityId(row.track_id, row.metadata?.plate, eType),
      entityType: eType,
      camera: row.camera_id,
      zone: row.zone_id || 'Unassigned',
      plate: row.metadata?.plate || null,
      plateConfidence: row.metadata?.plate_confidence ?? null,
      confidence: Math.round((row.confidence ?? 0) <= 1 ? (row.confidence ?? 0) * 100 : row.confidence),
      threatScore: row.threat_score ?? 0,
      severity: severity(row.severity),
      status: row.status || 'open',
      evidencePath: evidenceUrl(row.evidence_path),
    }
  })
}

export function updateEventStatus(eventId: string, status: string) {
  return request(`/api/events/${eventId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

const toFrontendStatus = (status: string): ThreatEntry['status'] => ({ new: 'active', acknowledged: 'acknowledged', escalated: 'escalated', resolved: 'dismissed', false_positive: 'dismissed' }[status] || 'active')
const toBackendStatus = (status: string): string => ({ active: 'new', acknowledged: 'acknowledged', escalated: 'escalated', dismissed: 'resolved' }[status] || status)

export function alertToThreat(row: any): ThreatEntry {
  const eType = entityType(row.entity_type)
  return {
    id: row.alert_id,
    entityId: entityId(row.entity_id || row.track_id, row.metadata?.plate, eType),
    entityType: eType,
    event: row.event_description || row.event_type_label || row.alert_type,
    severity: severity(row.severity),
    threatScore: row.threat_score ?? 0,
    camera: row.camera_id,
    zone: row.zone_id || 'Unassigned',
    openedAt: displayTime(row.timestamp),
    status: toFrontendStatus(row.status),
    assignedTo: row.assigned_to || row.operator_id || null,
  }
}

export async function getAlerts(filters: Filters = {}): Promise<ThreatEntry[]> {
  const rows = await request<any[]>(`/api/alerts${query(filters)}`)
  return rows.map(alertToThreat)
}

export function updateAlert(alertId: string, body: Record<string, unknown>) {
  const payload = { ...body }
  if (typeof payload.status === 'string') payload.status = toBackendStatus(payload.status)
  return request(`/api/alerts/${alertId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function incidentToEntry(row: any): IncidentEntry {
  return {
    id: row.incident_id,
    type: row.incident_type,
    entityId: entityId(row.entity_id || row.event_id, entityType(row.entity_type)),
    entityType: entityType(row.entity_type),
    severity: severity(row.severity),
    camera: row.camera_id,
    zone: row.zone_id || 'Unassigned',
    openedAt: displayTime(row.opened_at),
    assignedTo: row.assigned_to || 'Unassigned',
    status: row.status as IncidentStatus,
    evidenceCount: row.evidence_count || 0,
    notes: (row.notes || []).map((note: any) => ({ time: displayTime(note.time), operator: note.operator, text: note.text })),
  }
}

export async function getIncidents(filters: Filters = {}): Promise<IncidentEntry[]> {
  const rows = await request<any[]>(`/api/incidents${query(filters)}`)
  return rows.map(incidentToEntry)
}

export function createIncident(body: Record<string, unknown>) { return request('/api/incidents', { method: 'POST', body: JSON.stringify(body) }) }
export function updateIncident(incidentId: string, body: Record<string, unknown>) { return request(`/api/incidents/${incidentId}`, { method: 'PATCH', body: JSON.stringify(body) }) }
export function addIncidentNote(incidentId: string, body: Record<string, unknown>) { return request(`/api/incidents/${incidentId}/notes`, { method: 'POST', body: JSON.stringify(body) }) }
export function getCameras() { return request<any[]>('/api/cameras') }

export type PersonnelRecord = {
  person_id: string
  display_name: string
  active: boolean
  allowed_zones: string[]
  active_embedding_count: number
  active_embeddings: Array<{ embedding_id: string; enrolled_at?: string; model_name?: string }>
}

export function getPersonnel() { return request<PersonnelRecord[]>('/api/personnel') }
export function createPersonnel(body: { display_name: string; allowed_zones: string[] }) {
  return request<PersonnelRecord>('/api/personnel', { method: 'POST', body: JSON.stringify(body) })
}
export function enrollPersonnel(personId: string, file: File) {
  const body = new FormData()
  body.append('image', file)
  return request(`/api/personnel/${personId}/enroll`, { method: 'POST', body })
}
export function deactivateEmbedding(personId: string, embeddingId: string) {
  return request(`/api/personnel/${personId}/embeddings/${embeddingId}`, { method: 'DELETE' })
}

export function getSummary() { return request<{ cameras_total: number; cameras_online: number; cameras_offline: number; active_threats_high: number; active_threats_medium: number; incidents_today: number; incidents_confirmed: number; incidents_pending: number; system_health_pct: number }>('/api/summary') }
export { API_BASE_URL }
