import { useState } from 'react'
import { Search, Filter, ChevronDown, ArrowUpRight, Clock, User, Car } from 'lucide-react'
import { ACTIVITY_DATA, type ActivityRow } from '../data/mockData'
import SeverityBadge from '../components/SeverityBadge'

const EVENT_TYPES = [
  'All', 'Detections', 'Zone Entry', 'Loitering', 'ANPR', 'Suspicious', 'Camera Events', 'Operator Actions',
]
const CAMERAS = ['All', 'CAM-01', 'CAM-02', 'CAM-04', 'CAM-05', 'CAM-07', 'CAM-08', 'CAM-09', 'CAM-11', 'CAM-14', 'CAM-17']
const SEVERITIES = ['All', 'high', 'medium', 'normal']

function Select({
  value, options, onChange, label,
}: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs border outline-none cursor-pointer"
        style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          color: '#17212B',
          fontFamily: 'inherit',
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'All' ? `${label}: All` : o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: '#94A3B8' }}
      />
    </div>
  )
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  open: { bg: 'rgba(214,69,69,0.1)', text: '#D64545' },
  reviewing: { bg: 'rgba(217,144,0,0.1)', text: '#D99000' },
  escalated: { bg: 'rgba(214,69,69,0.15)', text: '#D64545' },
  closed: { bg: 'rgba(46,125,50,0.1)', text: '#2E7D32' },
}

interface Props {
  onSelectEntity: (id: string) => void
}

export default function ActivityLog({ onSelectEntity }: Props) {
  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState('All')
  const [camera, setCamera] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [entityFilter, setEntityFilter] = useState('All')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const filtered = ACTIVITY_DATA.filter((row) => {
    if (search && !row.event.toLowerCase().includes(search.toLowerCase()) &&
        !row.entityId.toLowerCase().includes(search.toLowerCase())) return false
    if (eventType !== 'All' && row.eventType !== eventType) return false
    if (camera !== 'All' && row.camera !== camera) return false
    if (severity !== 'All' && row.severity !== severity) return false
    if (entityFilter === 'People' && row.entityType !== 'person') return false
    if (entityFilter === 'Vehicles' && row.entityType !== 'vehicle') return false
    return true
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>
          Activity Log
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Unified event stream — people, vehicles, system events · {ACTIVITY_DATA.length} records today
        </p>
      </div>

      {/* Filters bar */}
      <div
        className="bg-white rounded-xl px-5 py-3.5 mb-4 flex items-center gap-3 flex-wrap"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search events or entity IDs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#17212B',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Entity type toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
            {['All', 'People', 'Vehicles'].map((t) => (
              <button
                key={t}
                onClick={() => setEntityFilter(t)}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{
                  background: entityFilter === t ? '#2F6B4F' : '#fff',
                  color: entityFilter === t ? '#fff' : '#64748B',
                  fontWeight: entityFilter === t ? 500 : 400,
                  borderRight: t !== 'Vehicles' ? '1px solid #E2E8F0' : 'none',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <Select value={eventType} options={EVENT_TYPES} onChange={setEventType} label="Type" />
          <Select value={camera} options={CAMERAS} onChange={setCamera} label="Camera" />
          <Select value={severity} options={SEVERITIES} onChange={setSeverity} label="Severity" />
        </div>

        <div className="ml-auto text-xs" style={{ color: '#94A3B8' }}>
          {filtered.length} of {ACTIVITY_DATA.length} events
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {/* Table head */}
        <div
          className="grid text-xs font-semibold px-5 py-3"
          style={{
            gridTemplateColumns: '100px 1fr 80px 180px 80px 90px 80px 90px',
            color: '#64748B',
            borderBottom: '1px solid #F1F5F9',
            letterSpacing: '0.04em',
            background: '#FAFBFC',
          }}
        >
          <div>TIME</div>
          <div>EVENT</div>
          <div>ENTITY</div>
          <div>CAMERA · ZONE</div>
          <div>CONF.</div>
          <div>THREAT</div>
          <div>SEVERITY</div>
          <div>STATUS</div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>
            No events match the current filters
          </div>
        ) : (
          filtered.map((row) => (
            <ActivityRow
              key={row.id}
              row={row}
              hovered={hoveredRow === row.id}
              onHover={setHoveredRow}
              onSelect={onSelectEntity}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ActivityRow({
  row, hovered, onHover, onSelect,
}: {
  row: ActivityRow
  hovered: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}) {
  const statusStyle = STATUS_STYLES[row.status] ?? STATUS_STYLES.closed
  const canClick = row.entityId !== '—'

  return (
    <div
      className="grid items-center px-5 py-3 transition-colors"
      style={{
        gridTemplateColumns: '100px 1fr 80px 180px 80px 90px 80px 90px',
        borderBottom: '1px solid #F8FAFC',
        background: hovered ? '#F8FAFD' : 'transparent',
        cursor: canClick ? 'pointer' : 'default',
      }}
      onMouseEnter={() => onHover(row.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => canClick && onSelect(row.entityId)}
    >
      {/* Time */}
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs font-medium" style={{ color: '#17212B' }}>
          {row.time}
        </span>
        <span className="font-mono text-xs" style={{ color: '#94A3B8', fontSize: 10 }}>
          {row.date}
        </span>
      </div>

      {/* Event */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm truncate" style={{ color: '#17212B' }}>
          {row.event}
        </span>
        {hovered && canClick && (
          <ArrowUpRight size={13} style={{ color: '#167D7F', flexShrink: 0 }} />
        )}
      </div>

      {/* Entity ID */}
      <div>
        {row.entityId !== '—' ? (
          <div className="flex items-center gap-1">
            {row.entityType === 'person' ? (
              <User size={11} style={{ color: '#64748B' }} />
            ) : (
              <Car size={11} style={{ color: '#64748B' }} />
            )}
            <span className="font-mono text-xs font-medium" style={{ color: '#17212B' }}>
              {row.entityId}
            </span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: '#94A3B8' }}>—</span>
        )}
      </div>

      {/* Camera · Zone */}
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs font-medium" style={{ color: '#17212B' }}>
          {row.camera}
        </span>
        <span className="text-xs" style={{ color: '#64748B', fontSize: 11 }}>
          {row.zone}
        </span>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#F1F5F9', maxWidth: 36 }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${row.confidence}%`,
              background: row.confidence > 90 ? '#2E7D32' : row.confidence > 75 ? '#D99000' : '#94A3B8',
            }}
          />
        </div>
        <span className="font-mono text-xs" style={{ color: '#64748B' }}>
          {row.confidence}%
        </span>
      </div>

      {/* Threat Score */}
      <div>
        {row.threatScore > 0 ? (
          <span
            className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              background:
                row.threatScore >= 70
                  ? 'rgba(214,69,69,0.1)'
                  : row.threatScore >= 40
                    ? 'rgba(217,144,0,0.1)'
                    : 'rgba(100,116,139,0.08)',
              color:
                row.threatScore >= 70
                  ? '#D64545'
                  : row.threatScore >= 40
                    ? '#D99000'
                    : '#64748B',
            }}
          >
            {row.threatScore}/100
          </span>
        ) : (
          <span className="text-xs" style={{ color: '#94A3B8' }}>—</span>
        )}
      </div>

      {/* Severity */}
      <SeverityBadge severity={row.severity} showDot />

      {/* Status */}
      <div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: statusStyle.bg,
            color: statusStyle.text,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: 10,
          }}
        >
          {row.status}
        </span>
      </div>
    </div>
  )
}
