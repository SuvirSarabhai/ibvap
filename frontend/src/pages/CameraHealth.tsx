import { useState } from 'react'
import { Camera, WifiOff, Wifi, Wrench, Search, ChevronDown } from 'lucide-react'
import { CAMERA_FLEET, type CameraFleetEntry } from '../data/mockData'
import StatusBadge from '../components/StatusBadge'

const ZONES = ['All', 'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F', 'Zone G']

function SignalBar({ strength }: { strength: number }) {
  const bars = 4
  const filled = Math.ceil((strength / 100) * bars)
  const color = strength === 0 ? '#CBD5E1' : strength < 50 ? '#D99000' : '#2E7D32'
  return (
    <div className="flex items-end gap-0.5">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            width: 4,
            height: 4 + i * 3,
            background: i < filled ? color : '#E2E8F0',
          }}
        />
      ))}
    </div>
  )
}

export default function CameraHealth() {
  const [zone, setZone] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')

  const online = CAMERA_FLEET.filter((c) => c.status === 'online').length
  const offline = CAMERA_FLEET.filter((c) => c.status === 'offline').length
  const degraded = CAMERA_FLEET.filter((c) => c.status === 'degraded').length
  const maintenance = CAMERA_FLEET.filter((c) => c.status === 'maintenance').length

  const filtered = CAMERA_FLEET.filter((c) => {
    if (zone !== 'All' && c.zone !== zone) return false
    if (statusFilter !== 'All' && c.status !== statusFilter.toLowerCase()) return false
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>Camera Health</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Fleet status — {CAMERA_FLEET.length} cameras across all zones
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Online', value: online, color: '#2E7D32', bg: 'rgba(46,125,50,0.08)', icon: Wifi },
          { label: 'Offline', value: offline, color: '#D64545', bg: 'rgba(214,69,69,0.08)', icon: WifiOff },
          { label: 'Degraded', value: degraded, color: '#D99000', bg: 'rgba(217,144,0,0.08)', icon: Wifi },
          { label: 'Maintenance', value: maintenance, color: '#64748B', bg: 'rgba(100,116,139,0.08)', icon: Wrench },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={17} style={{ color }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                <div className="text-sm" style={{ color: '#64748B' }}>{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="bg-white rounded-xl px-5 py-3.5 mb-5 flex items-center gap-3 flex-wrap"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search camera ID or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#17212B', fontFamily: 'inherit' }}
          />
        </div>

        <div className="relative">
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs border outline-none cursor-pointer"
            style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#17212B', fontFamily: 'inherit' }}
          >
            {ZONES.map((z) => <option key={z} value={z}>{z === 'All' ? 'Zone: All' : z}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94A3B8' }} />
        </div>

        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          {['All', 'Online', 'Offline', 'Degraded', 'Maintenance'].map((s, i, arr) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                background: statusFilter === s ? '#2F6B4F' : '#fff',
                color: statusFilter === s ? '#fff' : '#64748B',
                borderRight: i < arr.length - 1 ? '1px solid #E2E8F0' : 'none',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs" style={{ color: '#94A3B8' }}>{filtered.length} of {CAMERA_FLEET.length}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div
          className="grid px-5 py-3 text-xs font-semibold"
          style={{
            gridTemplateColumns: '80px 1fr 90px 80px 80px 100px 80px 60px',
            color: '#64748B',
            borderBottom: '1px solid #F1F5F9',
            background: '#FAFBFC',
            letterSpacing: '0.04em',
          }}
        >
          <div>ID</div>
          <div>NAME · ZONE</div>
          <div>STATUS</div>
          <div>UPTIME</div>
          <div>SIGNAL</div>
          <div>LAST EVENT</div>
          <div>RES · FPS</div>
          <div>IP</div>
        </div>

        {filtered.map((cam, i) => (
          <CameraRow key={cam.id} cam={cam} last={i === filtered.length - 1} />
        ))}
      </div>
    </div>
  )
}

function CameraRow({ cam, last }: { cam: CameraFleetEntry; last: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="grid items-center px-5 py-3 transition-colors"
      style={{
        gridTemplateColumns: '80px 1fr 90px 80px 80px 100px 80px 60px',
        borderBottom: last ? 'none' : '1px solid #F8FAFC',
        background: hovered ? '#F8FAFD' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ID */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: cam.status === 'offline' ? 'rgba(214,69,69,0.08)' : 'rgba(47,107,79,0.08)' }}
        >
          <Camera size={11} style={{ color: cam.status === 'offline' ? '#D64545' : '#2F6B4F' }} />
        </div>
        <span className="font-mono text-xs font-semibold" style={{ color: '#17212B' }}>{cam.id}</span>
      </div>

      {/* Name / Zone */}
      <div>
        <div className="text-sm" style={{ color: '#17212B' }}>{cam.name}</div>
        <div className="text-xs" style={{ color: '#94A3B8', fontSize: 11 }}>{cam.zone}</div>
      </div>

      {/* Status */}
      <StatusBadge status={cam.status} showDot />

      {/* Uptime */}
      <div>
        <div className="text-sm font-medium" style={{ color: cam.uptimePct < 90 ? '#D64545' : '#17212B' }}>
          {cam.uptimePct > 0 ? `${cam.uptimePct}%` : '—'}
        </div>
        {cam.uptimePct > 0 && (
          <div className="w-16 h-1 rounded-full mt-1 overflow-hidden" style={{ background: '#F1F5F9' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${cam.uptimePct}%`,
                background: cam.uptimePct >= 95 ? '#2E7D32' : cam.uptimePct >= 80 ? '#D99000' : '#D64545',
              }}
            />
          </div>
        )}
      </div>

      {/* Signal */}
      <div className="flex items-center gap-2">
        <SignalBar strength={cam.signalStrength} />
        <span className="font-mono text-xs" style={{ color: '#64748B' }}>
          {cam.signalStrength > 0 ? `${cam.signalStrength}%` : '—'}
        </span>
      </div>

      {/* Last event */}
      <div>
        <div className="text-xs truncate" style={{ color: '#17212B', maxWidth: 100 }}>{cam.lastEvent}</div>
        <div className="font-mono text-xs" style={{ color: '#94A3B8', fontSize: 10 }}>{cam.lastEventTime}</div>
      </div>

      {/* Resolution / FPS */}
      <div>
        <div className="text-xs font-medium" style={{ color: '#17212B' }}>{cam.resolution}</div>
        <div className="text-xs" style={{ color: '#94A3B8' }}>{cam.fps > 0 ? `${cam.fps} fps` : '—'}</div>
      </div>

      {/* IP */}
      <span className="font-mono text-xs" style={{ color: '#94A3B8', fontSize: 10 }}>{cam.ip}</span>
    </div>
  )
}
