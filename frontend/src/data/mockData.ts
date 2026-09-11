export type Severity = 'high' | 'medium' | 'normal'
export type EntityType = 'person' | 'vehicle'

export interface ActivityRow {
  id: string
  time: string
  date: string
  event: string
  eventType: string
  entityId: string
  entityType: EntityType
  camera: string
  zone: string
  confidence: number
  threatScore: number
  severity: Severity
  status: 'open' | 'reviewing' | 'closed' | 'escalated'
  evidencePath?: string | null
}

export const ACTIVITY_DATA: ActivityRow[] = [
  {
    id: 'EVT-0091',
    time: '14:47:32',
    date: '2026-09-07',
    event: 'Zone breach — Restricted Access',
    eventType: 'Zone Entry',
    entityId: 'P-2847',
    entityType: 'person',
    camera: 'CAM-14',
    zone: 'Zone D · Restricted',
    confidence: 97,
    threatScore: 78,
    severity: 'high',
    status: 'open',
  },
  {
    id: 'EVT-0090',
    time: '14:38:11',
    date: '2026-09-07',
    event: 'Loitering detected >12 min',
    eventType: 'Loitering',
    entityId: 'P-2847',
    entityType: 'person',
    camera: 'CAM-11',
    zone: 'Zone B · Entry',
    confidence: 91,
    threatScore: 63,
    severity: 'medium',
    status: 'reviewing',
  },
  {
    id: 'EVT-0089',
    time: '14:31:04',
    date: '2026-09-07',
    event: 'Vehicle — unregistered entry',
    eventType: 'ANPR',
    entityId: 'V-1205',
    entityType: 'vehicle',
    camera: 'CAM-04',
    zone: 'Zone B · East Gate',
    confidence: 88,
    threatScore: 45,
    severity: 'medium',
    status: 'open',
  },
  {
    id: 'EVT-0088',
    time: '14:22:47',
    date: '2026-09-07',
    event: 'ANPR — flagged plate HGF-482',
    eventType: 'ANPR',
    entityId: 'V-0934',
    entityType: 'vehicle',
    camera: 'CAM-02',
    zone: 'Zone A · South Gate',
    confidence: 99,
    threatScore: 82,
    severity: 'high',
    status: 'escalated',
  },
  {
    id: 'EVT-0087',
    time: '14:18:01',
    date: '2026-09-07',
    event: 'Camera offline — signal lost',
    eventType: 'Camera Events',
    entityId: '—',
    entityType: 'person',
    camera: 'CAM-17',
    zone: 'Zone F · Service Road',
    confidence: 100,
    threatScore: 0,
    severity: 'normal',
    status: 'reviewing',
  },
  {
    id: 'EVT-0086',
    time: '14:09:22',
    date: '2026-09-07',
    event: 'Person — zone entry South Checkpoint',
    eventType: 'Zone Entry',
    entityId: 'P-3110',
    entityType: 'person',
    camera: 'CAM-07',
    zone: 'Zone C · South',
    confidence: 84,
    threatScore: 12,
    severity: 'normal',
    status: 'closed',
  },
  {
    id: 'EVT-0085',
    time: '13:55:39',
    date: '2026-09-07',
    event: 'Perimeter sensor triggered',
    eventType: 'Suspicious',
    entityId: 'P-2991',
    entityType: 'person',
    camera: 'CAM-08',
    zone: 'Zone C · West Fence',
    confidence: 76,
    threatScore: 38,
    severity: 'medium',
    status: 'reviewing',
  },
  {
    id: 'EVT-0084',
    time: '13:41:18',
    date: '2026-09-07',
    event: 'Vehicle — speed threshold exceeded',
    eventType: 'Suspicious',
    entityId: 'V-2044',
    entityType: 'vehicle',
    camera: 'CAM-09',
    zone: 'Zone F · Service Road',
    confidence: 82,
    threatScore: 31,
    severity: 'medium',
    status: 'closed',
  },
  {
    id: 'EVT-0083',
    time: '13:27:05',
    date: '2026-09-07',
    event: 'Person detected — restricted perimeter',
    eventType: 'Detections',
    entityId: 'P-1832',
    entityType: 'person',
    camera: 'CAM-14',
    zone: 'Zone D · Restricted',
    confidence: 93,
    threatScore: 55,
    severity: 'medium',
    status: 'closed',
  },
  {
    id: 'EVT-0082',
    time: '13:14:51',
    date: '2026-09-07',
    event: 'Operator — manual flag applied',
    eventType: 'Operator Actions',
    entityId: 'P-2847',
    entityType: 'person',
    camera: 'CAM-11',
    zone: 'Zone B · Entry',
    confidence: 100,
    threatScore: 63,
    severity: 'normal',
    status: 'closed',
  },
  {
    id: 'EVT-0081',
    time: '12:58:33',
    date: '2026-09-07',
    event: 'Vehicle registered — cleared',
    eventType: 'ANPR',
    entityId: 'V-0811',
    entityType: 'vehicle',
    camera: 'CAM-01',
    zone: 'Zone A · North Gate',
    confidence: 99,
    threatScore: 5,
    severity: 'normal',
    status: 'closed',
  },
  {
    id: 'EVT-0080',
    time: '12:45:07',
    date: '2026-09-07',
    event: 'Person loitering — east fence line',
    eventType: 'Loitering',
    entityId: 'P-4402',
    entityType: 'person',
    camera: 'CAM-05',
    zone: 'Zone B · East',
    confidence: 79,
    threatScore: 29,
    severity: 'normal',
    status: 'closed',
  },
]

export const ENTITY_P2847 = {
  id: 'P-2847',
  type: 'person' as EntityType,
  label: 'Unknown Male',
  status: 'HIGH RISK',
  statusSeverity: 'high' as Severity,
  description: 'Adult male, estimated 30-40 yrs, dark jacket, backpack',
  firstSeen: '14:23:11',
  lastSeen: '14:47:32',
  durationActive: '24 min 21 sec',
  currentCamera: 'CAM-14',
  currentZone: 'Zone D · Restricted',
  threatScore: 78,
  height: '~1.78 m',
  build: 'Medium',
  clothing: 'Dark jacket, light trousers, grey backpack',
  distinctiveFeatures: 'Cap, possible beard',
  trajectory: [
    {
      camera: 'CAM-04',
      name: 'North Gate',
      zone: 'Zone A',
      arrival: '14:23:11',
      departure: '14:27:44',
      dwell: '4 min 33 sec',
      threat: 22,
      alert: false,
    },
    {
      camera: 'CAM-07',
      name: 'East Perimeter',
      zone: 'Zone B',
      arrival: '14:31:02',
      departure: '14:36:18',
      dwell: '5 min 16 sec',
      threat: 38,
      alert: false,
    },
    {
      camera: 'CAM-11',
      name: 'Zone B Entry',
      zone: 'Zone B · Interior',
      arrival: '14:38:11',
      departure: '14:45:09',
      dwell: '6 min 58 sec',
      threat: 63,
      alert: true,
    },
    {
      camera: 'CAM-14',
      name: 'Restricted Access',
      zone: 'Zone D · Restricted',
      arrival: '14:47:32',
      departure: null,
      dwell: 'Ongoing',
      threat: 78,
      alert: true,
    },
  ],
  activityHistory: [
    { time: '14:47:32', event: 'Zone breach — Restricted Access', camera: 'CAM-14', severity: 'high' as Severity },
    { time: '14:38:11', event: 'Loitering detected >12 min', camera: 'CAM-11', severity: 'medium' as Severity },
    { time: '14:31:02', event: 'Person detected — east perimeter', camera: 'CAM-07', severity: 'normal' as Severity },
    { time: '14:23:11', event: 'Person detected — north gate', camera: 'CAM-04', severity: 'normal' as Severity },
    { time: '13:14:51', event: 'Operator manual flag applied', camera: 'CAM-11', severity: 'normal' as Severity },
  ],
  riskFactors: [
    { label: 'Restricted Zone Entry', score: 25, description: 'Subject entered Zone D without authorisation' },
    { label: 'Unknown Identity', score: 18, description: 'No match in registered personnel database' },
    { label: 'Loitering >10 min', score: 15, description: 'Stationary >12 min in Zone B perimeter area' },
    { label: 'Unusual Hour Pattern', score: 12, description: 'Activity outside routine operational hours' },
    { label: 'Multi-camera Tracking', score: 8, description: 'Traversed 4 camera zones in 24 minutes' },
  ],
  incidents: [
    { id: 'INC-0047', type: 'Zone Breach', severity: 'high' as Severity, status: 'Open', time: '14:47:32' },
    { id: 'INC-0044', type: 'Loitering', severity: 'medium' as Severity, status: 'Reviewing', time: '14:38:11' },
  ],
  evidence: [
    {
      id: 'EV-00831',
      camera: 'CAM-14',
      time: '14:47:32',
      duration: '0:42',
      format: 'MP4/H.264',
      size: '18.4 MB',
      hash: 'sha256:a3f9c7b1d2e84f560c9a1b3d7e2f4a8c6b0d9e1f2a3c5b7d9e1f3a5b7c9d1e3f5',
    },
    {
      id: 'EV-00828',
      camera: 'CAM-11',
      time: '14:38:11',
      duration: '7:03',
      format: 'MP4/H.264',
      size: '94.1 MB',
      hash: 'sha256:b7e2f4a8c6b0d9e1f2a3c5b7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7',
    },
    {
      id: 'EV-00822',
      camera: 'CAM-07',
      time: '14:31:02',
      duration: '5:17',
      format: 'MP4/H.264',
      size: '61.8 MB',
      hash: 'sha256:c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1',
    },
    {
      id: 'EV-00819',
      camera: 'CAM-04',
      time: '14:23:11',
      duration: '4:33',
      format: 'MP4/H.264',
      size: '54.2 MB',
      hash: 'sha256:d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3',
    },
  ],
  auditTrail: [
    { time: '14:48:04', operator: 'J. Ramirez', action: 'Entity flagged as High Risk', role: 'Senior Analyst' },
    { time: '14:47:55', operator: 'System', action: 'Auto-escalation triggered — threat score >75', role: 'Automated' },
    { time: '14:39:00', operator: 'M. Chen', action: 'Loitering alert reviewed — monitoring continued', role: 'Analyst' },
    { time: '13:14:51', operator: 'J. Ramirez', action: 'Manual flag applied — suspicious movement pattern', role: 'Senior Analyst' },
  ],
  relatedCameras: ['CAM-04', 'CAM-07', 'CAM-11', 'CAM-14', 'CAM-13', 'CAM-15'],
  behaviourPatterns: [
    { metric: 'Movement Speed', value: '2.3×', baseline: '1.0× avg', status: 'anomalous', note: 'Exit velocity significantly exceeds zone baseline' },
    { metric: 'Dwell Time Zone B', value: '12 min', baseline: '~2 min avg', status: 'anomalous', note: 'Dwell 6× above expected for transit area' },
    { metric: 'Camera Traversal Rate', value: '4 zones/24 min', baseline: '1-2 zones typical', status: 'elevated', note: 'Consistent inward trajectory toward restricted area' },
    { metric: 'Time of Activity', value: '14:23–14:47', baseline: 'Auth hours: 07:00–16:00', status: 'within hours', note: 'Within authorised hours, but pattern inconsistent with staff routines' },
  { metric: 'Re-entry Pattern', value: 'Single visit', baseline: 'No prior record', status: 'no baseline', note: 'No previous appearances in system' },
  ],
}

// ─── Camera Fleet (24 cameras) ──────────────────────────────────────────────

export type CameraStatus = 'online' | 'offline' | 'degraded' | 'maintenance'

export interface CameraFleetEntry {
  id: string
  name: string
  zone: string
  status: CameraStatus
  uptimePct: number
  lastEvent: string
  lastEventTime: string
  severity: Severity
  signalStrength: number
  resolution: string
  fps: number
  ip: string
}

export const CAMERA_FLEET: CameraFleetEntry[] = [
  { id: 'CAM-01', name: 'North Gate — Primary', zone: 'Zone A', status: 'online', uptimePct: 99.8, lastEvent: 'Vehicle registered', lastEventTime: '12:58', severity: 'normal', signalStrength: 98, resolution: '4K', fps: 30, ip: '10.0.1.1' },
  { id: 'CAM-02', name: 'North Gate — Secondary', zone: 'Zone A', status: 'online', uptimePct: 99.5, lastEvent: 'ANPR — flagged plate HGF-482', lastEventTime: '14:22', severity: 'high', signalStrength: 95, resolution: '4K', fps: 30, ip: '10.0.1.2' },
  { id: 'CAM-03', name: 'South Gate — Primary', zone: 'Zone A', status: 'online', uptimePct: 98.2, lastEvent: 'No events', lastEventTime: '13:40', severity: 'normal', signalStrength: 91, resolution: '1080p', fps: 25, ip: '10.0.1.3' },
  { id: 'CAM-04', name: 'East Perimeter — Gate', zone: 'Zone B', status: 'online', uptimePct: 97.9, lastEvent: 'Vehicle unregistered entry', lastEventTime: '14:31', severity: 'medium', signalStrength: 88, resolution: '4K', fps: 30, ip: '10.0.2.1' },
  { id: 'CAM-05', name: 'East Perimeter — Fence', zone: 'Zone B', status: 'online', uptimePct: 99.1, lastEvent: 'Person loitering — east fence', lastEventTime: '12:45', severity: 'normal', signalStrength: 82, resolution: '1080p', fps: 25, ip: '10.0.2.2' },
  { id: 'CAM-06', name: 'East Perimeter — Far', zone: 'Zone B', status: 'degraded', uptimePct: 87.3, lastEvent: 'Frame drops detected', lastEventTime: '14:10', severity: 'normal', signalStrength: 44, resolution: '1080p', fps: 12, ip: '10.0.2.3' },
  { id: 'CAM-07', name: 'South Checkpoint', zone: 'Zone C', status: 'online', uptimePct: 99.9, lastEvent: 'Person detected — South CP', lastEventTime: '14:09', severity: 'normal', signalStrength: 99, resolution: '4K', fps: 30, ip: '10.0.3.1' },
  { id: 'CAM-08', name: 'West Fence Line — North', zone: 'Zone C', status: 'online', uptimePct: 96.4, lastEvent: 'Perimeter sensor triggered', lastEventTime: '13:55', severity: 'medium', signalStrength: 79, resolution: '1080p', fps: 25, ip: '10.0.3.2' },
  { id: 'CAM-09', name: 'West Fence Line — South', zone: 'Zone C', status: 'online', uptimePct: 98.8, lastEvent: 'Vehicle speed threshold exceeded', lastEventTime: '13:41', severity: 'medium', signalStrength: 87, resolution: '1080p', fps: 25, ip: '10.0.3.3' },
  { id: 'CAM-10', name: 'Restricted Zone — Entry', zone: 'Zone D', status: 'online', uptimePct: 99.7, lastEvent: 'Access card verified', lastEventTime: '14:05', severity: 'normal', signalStrength: 96, resolution: '4K', fps: 30, ip: '10.0.4.1' },
  { id: 'CAM-11', name: 'Restricted Zone — Interior A', zone: 'Zone D', status: 'online', uptimePct: 99.4, lastEvent: 'Loitering detected >12 min', lastEventTime: '14:38', severity: 'medium', signalStrength: 94, resolution: '4K', fps: 30, ip: '10.0.4.2' },
  { id: 'CAM-12', name: 'Restricted Zone — Interior B', zone: 'Zone D', status: 'online', uptimePct: 99.2, lastEvent: 'No events', lastEventTime: '14:15', severity: 'normal', signalStrength: 92, resolution: '4K', fps: 30, ip: '10.0.4.3' },
  { id: 'CAM-13', name: 'Restricted Zone — Rear', zone: 'Zone D', status: 'online', uptimePct: 98.6, lastEvent: 'No events', lastEventTime: '13:30', severity: 'normal', signalStrength: 90, resolution: '1080p', fps: 25, ip: '10.0.4.4' },
  { id: 'CAM-14', name: 'Restricted Access — Main', zone: 'Zone D', status: 'online', uptimePct: 99.6, lastEvent: 'Zone breach — Restricted Access', lastEventTime: '14:47', severity: 'high', signalStrength: 97, resolution: '4K', fps: 30, ip: '10.0.4.5' },
  { id: 'CAM-15', name: 'Zone D — Perimeter NE', zone: 'Zone D', status: 'online', uptimePct: 97.1, lastEvent: 'No events', lastEventTime: '13:00', severity: 'normal', signalStrength: 83, resolution: '1080p', fps: 25, ip: '10.0.4.6' },
  { id: 'CAM-16', name: 'Admin Block — Front', zone: 'Zone E', status: 'online', uptimePct: 99.0, lastEvent: 'No events', lastEventTime: '14:20', severity: 'normal', signalStrength: 95, resolution: '1080p', fps: 25, ip: '10.0.5.1' },
  { id: 'CAM-17', name: 'Service Road — Entry', zone: 'Zone F', status: 'offline', uptimePct: 61.2, lastEvent: 'Camera offline — signal lost', lastEventTime: '11:04', severity: 'normal', signalStrength: 0, resolution: '1080p', fps: 0, ip: '10.0.6.1' },
  { id: 'CAM-18', name: 'Service Road — Mid', zone: 'Zone F', status: 'maintenance', uptimePct: 0, lastEvent: 'Scheduled maintenance', lastEventTime: '08:00', severity: 'normal', signalStrength: 0, resolution: '1080p', fps: 0, ip: '10.0.6.2' },
  { id: 'CAM-19', name: 'Loading Bay — North', zone: 'Zone F', status: 'online', uptimePct: 98.3, lastEvent: 'Vehicle registered', lastEventTime: '13:10', severity: 'normal', signalStrength: 86, resolution: '1080p', fps: 25, ip: '10.0.6.3' },
  { id: 'CAM-20', name: 'Loading Bay — South', zone: 'Zone F', status: 'online', uptimePct: 97.8, lastEvent: 'No events', lastEventTime: '12:30', severity: 'normal', signalStrength: 81, resolution: '1080p', fps: 25, ip: '10.0.6.4' },
  { id: 'CAM-21', name: 'Car Park — Level 1', zone: 'Zone G', status: 'online', uptimePct: 98.9, lastEvent: 'No events', lastEventTime: '14:12', severity: 'normal', signalStrength: 93, resolution: '1080p', fps: 25, ip: '10.0.7.1' },
  { id: 'CAM-22', name: 'Car Park — Level 2', zone: 'Zone G', status: 'degraded', uptimePct: 91.4, lastEvent: 'Image quality degraded', lastEventTime: '13:50', severity: 'normal', signalStrength: 52, resolution: '720p', fps: 15, ip: '10.0.7.2' },
  { id: 'CAM-23', name: 'Main Reception', zone: 'Zone A', status: 'online', uptimePct: 99.9, lastEvent: 'No events', lastEventTime: '14:35', severity: 'normal', signalStrength: 99, resolution: '4K', fps: 30, ip: '10.0.1.4' },
  { id: 'CAM-24', name: 'Server Room', zone: 'Zone D', status: 'online', uptimePct: 100, lastEvent: 'No events', lastEventTime: '14:00', severity: 'normal', signalStrength: 100, resolution: '4K', fps: 30, ip: '10.0.4.7' },
]

// ─── Threats Data ─────────────────────────────────────────────────────────────

export type ThreatStatus = 'active' | 'acknowledged' | 'escalated' | 'dismissed'

export interface ThreatEntry {
  id: string
  entityId: string
  entityType: EntityType
  event: string
  severity: Severity
  threatScore: number
  camera: string
  zone: string
  openedAt: string
  status: ThreatStatus
  assignedTo: string | null
}

export const THREATS_DATA: ThreatEntry[] = [
  { id: 'THR-001', entityId: 'P-2847', entityType: 'person', event: 'Zone breach — Restricted Access', severity: 'high', threatScore: 78, camera: 'CAM-14', zone: 'Zone D · Restricted', openedAt: '14:47:32', status: 'active', assignedTo: null },
  { id: 'THR-002', entityId: 'V-0934', entityType: 'vehicle', event: 'ANPR — flagged plate HGF-482', severity: 'high', threatScore: 82, camera: 'CAM-02', zone: 'Zone A · South Gate', openedAt: '14:22:47', status: 'escalated', assignedTo: 'J. Ramirez' },
  { id: 'THR-003', entityId: 'P-2847', entityType: 'person', event: 'Loitering detected >12 min', severity: 'medium', threatScore: 63, camera: 'CAM-11', zone: 'Zone B · Entry', openedAt: '14:38:11', status: 'acknowledged', assignedTo: 'M. Chen' },
  { id: 'THR-004', entityId: 'V-1205', entityType: 'vehicle', event: 'Unregistered vehicle entry', severity: 'medium', threatScore: 45, camera: 'CAM-04', zone: 'Zone B · East Gate', openedAt: '14:31:04', status: 'active', assignedTo: null },
  { id: 'THR-005', entityId: 'P-2991', entityType: 'person', event: 'Perimeter sensor triggered', severity: 'medium', threatScore: 38, camera: 'CAM-08', zone: 'Zone C · West Fence', openedAt: '13:55:39', status: 'active', assignedTo: null },
  { id: 'THR-006', entityId: 'V-2044', entityType: 'vehicle', event: 'Vehicle speed threshold exceeded', severity: 'medium', threatScore: 31, camera: 'CAM-09', zone: 'Zone F · Service Road', openedAt: '13:41:18', status: 'dismissed', assignedTo: 'M. Chen' },
  { id: 'THR-007', entityId: 'P-3110', entityType: 'person', event: 'Zone entry — South Checkpoint', severity: 'normal', threatScore: 12, camera: 'CAM-07', zone: 'Zone C · South', openedAt: '14:09:22', status: 'dismissed', assignedTo: 'J. Ramirez' },
]

// ─── Incidents Data ───────────────────────────────────────────────────────────

export type IncidentStatus = 'open' | 'reviewing' | 'escalated' | 'closed'

export interface IncidentEntry {
  id: string
  type: string
  entityId: string
  entityType: EntityType
  severity: Severity
  camera: string
  zone: string
  openedAt: string
  assignedTo: string
  status: IncidentStatus
  evidenceCount: number
  notes: { time: string; operator: string; text: string }[]
}

export const INCIDENTS_DATA: IncidentEntry[] = [
  {
    id: 'INC-0047', type: 'Zone Breach', entityId: 'P-2847', entityType: 'person', severity: 'high',
    camera: 'CAM-14', zone: 'Zone D · Restricted', openedAt: '14:47:32', assignedTo: 'J. Ramirez',
    status: 'open', evidenceCount: 1,
    notes: [
      { time: '14:48:04', operator: 'J. Ramirez', text: 'Subject confirmed in restricted zone. Dispatch notified.' },
      { time: '14:47:55', operator: 'System', text: 'Auto-escalation triggered — threat score >75' },
    ],
  },
  {
    id: 'INC-0046', type: 'ANPR Match', entityId: 'V-0934', entityType: 'vehicle', severity: 'high',
    camera: 'CAM-02', zone: 'Zone A · South Gate', openedAt: '14:22:47', assignedTo: 'J. Ramirez',
    status: 'escalated', evidenceCount: 2,
    notes: [{ time: '14:25:00', operator: 'J. Ramirez', text: 'Plate confirmed flagged by national registry. Escalated to supervisor.' }],
  },
  {
    id: 'INC-0045', type: 'Loitering', entityId: 'P-2847', entityType: 'person', severity: 'medium',
    camera: 'CAM-11', zone: 'Zone B · Entry', openedAt: '14:38:11', assignedTo: 'M. Chen',
    status: 'reviewing', evidenceCount: 1,
    notes: [{ time: '14:39:00', operator: 'M. Chen', text: 'Loitering alert reviewed — monitoring continued.' }],
  },
  {
    id: 'INC-0044', type: 'Unregistered Vehicle', entityId: 'V-1205', entityType: 'vehicle', severity: 'medium',
    camera: 'CAM-04', zone: 'Zone B · East Gate', openedAt: '14:31:04', assignedTo: 'M. Chen',
    status: 'reviewing', evidenceCount: 1, notes: [],
  },
  {
    id: 'INC-0043', type: 'Perimeter Breach', entityId: 'P-2991', entityType: 'person', severity: 'medium',
    camera: 'CAM-08', zone: 'Zone C · West Fence', openedAt: '13:55:39', assignedTo: 'J. Ramirez',
    status: 'closed', evidenceCount: 2,
    notes: [{ time: '14:05:00', operator: 'J. Ramirez', text: 'Subject identified as contractor. Access verified. Incident closed.' }],
  },
  {
    id: 'INC-0042', type: 'Speed Violation', entityId: 'V-2044', entityType: 'vehicle', severity: 'medium',
    camera: 'CAM-09', zone: 'Zone F · Service Road', openedAt: '13:41:18', assignedTo: 'M. Chen',
    status: 'closed', evidenceCount: 1,
    notes: [{ time: '13:50:00', operator: 'M. Chen', text: 'Vehicle identified and driver warned. No further action.' }],
  },
  {
    id: 'INC-0041', type: 'Zone Entry', entityId: 'P-3110', entityType: 'person', severity: 'normal',
    camera: 'CAM-07', zone: 'Zone C · South', openedAt: '14:09:22', assignedTo: 'M. Chen',
    status: 'closed', evidenceCount: 0,
    notes: [{ time: '14:12:00', operator: 'M. Chen', text: 'Routine entry. Identity verified. Closed.' }],
  },
]

// ─── Evidence Library ─────────────────────────────────────────────────────────

export interface EvidenceEntry {
  id: string
  entityId: string
  incidentId: string | null
  camera: string
  zone: string
  timestamp: string
  duration: string
  format: string
  size: string
  hash: string
  verified: boolean
}

export const EVIDENCE_LIBRARY: EvidenceEntry[] = [
  { id: 'EV-00831', entityId: 'P-2847', incidentId: 'INC-0047', camera: 'CAM-14', zone: 'Zone D · Restricted', timestamp: '14:47:32', duration: '0:42', format: 'MP4/H.264', size: '18.4 MB', hash: 'sha256:a3f9c7b1d2e84f560c9a1b3d7e2f4a8c6b0d9e1f2a3c5b7d9e1f3a5b7c9d1e3f5', verified: true },
  { id: 'EV-00830', entityId: 'V-0934', incidentId: 'INC-0046', camera: 'CAM-02', zone: 'Zone A · South Gate', timestamp: '14:22:47', duration: '1:15', format: 'MP4/H.264', size: '22.8 MB', hash: 'sha256:b2c4d6e8f0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3', verified: true },
  { id: 'EV-00829', entityId: 'V-0934', incidentId: 'INC-0046', camera: 'CAM-01', zone: 'Zone A · North Gate', timestamp: '14:20:11', duration: '2:33', format: 'MP4/H.264', size: '41.2 MB', hash: 'sha256:c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5', verified: true },
  { id: 'EV-00828', entityId: 'P-2847', incidentId: 'INC-0045', camera: 'CAM-11', zone: 'Zone B · Entry', timestamp: '14:38:11', duration: '7:03', format: 'MP4/H.264', size: '94.1 MB', hash: 'sha256:b7e2f4a8c6b0d9e1f2a3c5b7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7', verified: true },
  { id: 'EV-00827', entityId: 'V-1205', incidentId: 'INC-0044', camera: 'CAM-04', zone: 'Zone B · East Gate', timestamp: '14:31:04', duration: '1:48', format: 'MP4/H.264', size: '28.6 MB', hash: 'sha256:d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6', verified: true },
  { id: 'EV-00826', entityId: 'P-2991', incidentId: 'INC-0043', camera: 'CAM-08', zone: 'Zone C · West Fence', timestamp: '13:55:39', duration: '3:20', format: 'MP4/H.264', size: '48.9 MB', hash: 'sha256:e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7', verified: true },
  { id: 'EV-00825', entityId: 'P-2991', incidentId: 'INC-0043', camera: 'CAM-09', zone: 'Zone C · West Fence', timestamp: '13:52:00', duration: '5:10', format: 'MP4/H.264', size: '72.1 MB', hash: 'sha256:f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8', verified: false },
  { id: 'EV-00824', entityId: 'V-2044', incidentId: 'INC-0042', camera: 'CAM-09', zone: 'Zone F · Service Road', timestamp: '13:41:18', duration: '0:58', format: 'MP4/H.264', size: '14.7 MB', hash: 'sha256:a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9', verified: true },
  { id: 'EV-00822', entityId: 'P-2847', incidentId: null, camera: 'CAM-07', zone: 'Zone B · East Perimeter', timestamp: '14:31:02', duration: '5:17', format: 'MP4/H.264', size: '61.8 MB', hash: 'sha256:c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1', verified: true },
  { id: 'EV-00819', entityId: 'P-2847', incidentId: null, camera: 'CAM-04', zone: 'Zone A · North Gate', timestamp: '14:23:11', duration: '4:33', format: 'MP4/H.264', size: '54.2 MB', hash: 'sha256:d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3', verified: true },
]
