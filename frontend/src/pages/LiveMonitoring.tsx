import { useState } from 'react'
import { WifiOff, Wifi, AlertTriangle, ChevronDown, Wrench, Maximize2 } from 'lucide-react'
import { CAMERA_FLEET } from '../data/mockData'
import VideoLightbox from '../components/VideoLightbox'

const ZONES = ['All', 'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F', 'Zone G']
const GRID_SIZES = [
  { label: '2×3', cols: 3 },
  { label: '3×4', cols: 4 },
  { label: '4×6', cols: 6 },
] as const

// Real video files from test_videos/ — served by FastAPI /api/stream/:filename
const API_BASE = 'http://localhost:8000'
const VIDEO_SOURCES = [
  `${API_BASE}/api/stream/zone.mp4`,
  `${API_BASE}/api/stream/sample.mp4`,
  `${API_BASE}/api/stream/car.mp4`,
]

const sevDot = (sev: string) => {
  if (sev === 'high') return '#D64545'
  if (sev === 'medium') return '#D99000'
  return '#2E7D32'
}

export default function LiveMonitoring() {
  const [zone, setZone] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [gridIdx, setGridIdx] = useState(0)
  const [hoveredCam, setHoveredCam] = useState<string | null>(null)
  const [selectedCam, setSelectedCam] = useState<{ cam: typeof CAMERA_FLEET[0]; src: string } | null>(null)

  const cols = GRID_SIZES[gridIdx].cols

  const filtered = CAMERA_FLEET.filter((c) => {
    if (zone !== 'All' && c.zone !== zone) return false
    if (statusFilter !== 'All' && c.status !== statusFilter.toLowerCase()) return false
    return true
  })

  const online = CAMERA_FLEET.filter((c) => c.status === 'online').length
  const offline = CAMERA_FLEET.filter((c) => c.status === 'offline').length
  const degraded = CAMERA_FLEET.filter((c) => c.status === 'degraded').length
  const maintenance = CAMERA_FLEET.filter((c) => c.status === 'maintenance').length

  return (
    <div className="p-8">
      <VideoLightbox
        camera={selectedCam?.cam ?? null}
        videoSrc={selectedCam?.src ?? null}
        onClose={() => setSelectedCam(null)}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>
            Live Monitoring
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Zone Alpha Sector · {CAMERA_FLEET.length} cameras · Real-time feeds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(46,125,50,0.1)', color: '#2E7D32' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2E7D32', boxShadow: '0 0 4px #2E7D32' }} />
            {online} ONLINE
          </span>
          {offline > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(214,69,69,0.1)', color: '#D64545' }}>
              <WifiOff size={11} /> {offline} OFFLINE
            </span>
          )}
          {degraded > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(217,144,0,0.1)', color: '#D99000' }}>
              <Wifi size={11} /> {degraded} DEGRADED
            </span>
          )}
          {maintenance > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748B' }}>
              <Wrench size={11} /> {maintenance} MAINTENANCE
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="bg-white rounded-xl px-5 py-3.5 mb-5 flex items-center gap-4 flex-wrap"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {/* Zone filter */}
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

        {/* Status filter */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          {['All', 'Online', 'Offline', 'Degraded', 'Maintenance'].map((s, i, arr) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                background: statusFilter === s ? '#2F6B4F' : '#fff',
                color: statusFilter === s ? '#fff' : '#64748B',
                fontWeight: statusFilter === s ? 500 : 400,
                borderRight: i < arr.length - 1 ? '1px solid #E2E8F0' : 'none',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Grid size toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          {GRID_SIZES.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setGridIdx(i)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                background: gridIdx === i ? '#2F6B4F' : '#fff',
                color: gridIdx === i ? '#fff' : '#64748B',
                borderRight: i < GRID_SIZES.length - 1 ? '1px solid #E2E8F0' : 'none',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        <span className="text-xs" style={{ color: '#94A3B8' }}>{filtered.length} feeds</span>
      </div>

      {/* Camera grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {filtered.map((cam, idx) => {
          const videoSrc = VIDEO_SOURCES[idx % VIDEO_SOURCES.length]
          const isOffline = cam.status === 'offline' || cam.status === 'maintenance'
          const hovered = hoveredCam === cam.id
          return (
            <div
              key={cam.id}
              className="relative overflow-hidden rounded-xl cursor-pointer group"
              style={{
                aspectRatio: '16/9',
                background: '#0f1923',
                border: cam.status === 'offline'
                  ? '1.5px solid rgba(214,69,69,0.4)'
                  : cam.status === 'degraded'
                  ? '1.5px solid rgba(217,144,0,0.4)'
                  : '1.5px solid transparent',
                boxShadow: hovered ? '0 0 0 2px #2F6B4F' : 'none',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={() => setHoveredCam(cam.id)}
              onMouseLeave={() => setHoveredCam(null)}
              onClick={() => setSelectedCam({ cam, src: videoSrc })}
            >
              {/* Expand hint on hover */}
              {hovered && (
                <div
                  className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-1 rounded-md"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                >
                  <Maximize2 size={10} style={{ color: 'rgba(255,255,255,0.8)' }} />
                  <span className="text-white" style={{ fontSize: 9, letterSpacing: '0.04em' }}>EXPAND</span>
                </div>
              )}
              {isOffline ? (
                <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: '#0f1923' }}>
                  {cam.status === 'maintenance'
                    ? <Wrench size={20} style={{ color: '#64748B' }} />
                    : <WifiOff size={20} style={{ color: '#64748B' }} />}
                  <span className="text-xs mt-1.5 font-medium" style={{ color: '#64748B' }}>
                    {cam.status === 'maintenance' ? 'Maintenance' : 'No Signal'}
                  </span>
                </div>
              ) : (
                <video
                  key={videoSrc}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{
                    filter: cam.status === 'degraded' ? 'brightness(0.7) saturate(0.5)' : 'none',
                  }}
                />
              )}

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }}
              />

              {/* Top indicators */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                {cam.status === 'online' && (
                  <span
                    className="text-white font-semibold rounded px-1"
                    style={{ background: '#D64545', fontSize: 9, letterSpacing: '0.05em' }}
                  >
                    LIVE
                  </span>
                )}
                {cam.status === 'degraded' && (
                  <span
                    className="font-semibold rounded px-1"
                    style={{ background: 'rgba(217,144,0,0.9)', color: '#fff', fontSize: 9 }}
                  >
                    DEGRADED
                  </span>
                )}
                {(cam.status === 'offline' || cam.status === 'maintenance') && <span />}

                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: sevDot(cam.severity),
                    boxShadow: cam.severity === 'high' ? `0 0 5px ${sevDot(cam.severity)}` : 'none',
                  }}
                />
              </div>

              {/* Alert overlay on hover */}
              {hovered && cam.severity === 'high' && (
                <div
                  className="absolute top-7 left-2 flex items-center gap-1 px-2 py-1 rounded-md"
                  style={{ background: 'rgba(214,69,69,0.85)' }}
                >
                  <AlertTriangle size={10} className="text-white" />
                  <span className="text-white text-xs font-semibold" style={{ fontSize: 10 }}>Active Alert</span>
                </div>
              )}

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                <div className="font-mono text-xs font-semibold" style={{ color: '#fff', fontSize: 10, lineHeight: '14px' }}>
                  {cam.id}
                </div>
                <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>
                  {cam.name}
                </div>
                {hovered && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>
                    {cam.lastEvent} · {cam.lastEventTime}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
