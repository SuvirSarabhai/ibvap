import { useEffect, useMemo, useState } from 'react'
import { WifiOff, Wifi, AlertTriangle, ChevronDown, Wrench, Maximize2 } from 'lucide-react'
import { getCameras, API_BASE_URL } from '../api/client'
import VideoLightbox from '../components/VideoLightbox'

interface CameraView {
  id: string
  name: string
  zone: string
  status: 'online' | 'offline' | 'degraded' | 'maintenance'
  uptimePct: number
  lastEvent: string
  lastEventTime: string
  severity: 'high' | 'medium' | 'normal'
  signalStrength: number
  resolution: string
  fps: number
  source: string | null
}

interface BackendCamera {
  camera_id: string
  name?: string
  source?: string | null
  zones?: string[]
  status?: string
}

const GRID_SIZES = [
  { label: '2×3', cols: 3 },
  { label: '3×4', cols: 4 },
  { label: '4×6', cols: 6 },
] as const

const normalizeStatus = (status: string | undefined): CameraView['status'] =>
  status === 'online' || status === 'degraded' || status === 'maintenance' ? status : 'offline'

const cameraName = (id: string) =>
  id.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase())

const streamUrl = (source: string | null | undefined) => {
  if (!source) return null
  const filename = source.replaceAll('\\', '/').split('/').pop()
  return filename ? `${API_BASE_URL}/api/stream/${encodeURIComponent(filename)}` : null
}

const toCameraView = (camera: BackendCamera): CameraView => ({
  id: camera.camera_id,
  name: camera.name || cameraName(camera.camera_id),
  zone: camera.zones?.join(', ') || 'Unassigned',
  status: normalizeStatus(camera.status),
  uptimePct: 0,
  lastEvent: 'No events',
  lastEventTime: '--:--',
  severity: 'normal',
  signalStrength: 0,
  resolution: 'Unknown',
  fps: 0,
  source: camera.source || null,
})

const sevDot = (sev: string) => {
  if (sev === 'high') return '#D64545'
  if (sev === 'medium') return '#D99000'
  return '#2E7D32'
}

export default function LiveMonitoring() {
  const [cameras, setCameras] = useState<CameraView[]>([])
  const [zone, setZone] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [gridIdx, setGridIdx] = useState(0)
  const [hoveredCam, setHoveredCam] = useState<string | null>(null)
  const [selectedCam, setSelectedCam] = useState<{ cam: CameraView; src: string | null } | null>(null)

  useEffect(() => {
    let active = true
    getCameras()
      .then(rows => {
        if (active) setCameras((rows as BackendCamera[]).map(toCameraView))
      })
      .catch(() => {
        if (active) setCameras([])
      })
    return () => { active = false }
  }, [])

  const cols = GRID_SIZES[gridIdx].cols
  const zones = useMemo(() => ['All', ...Array.from(new Set(cameras.flatMap(camera => camera.zone.split(', ')).filter(Boolean)))], [cameras])
  const filtered = cameras.filter((camera) => {
    if (zone !== 'All' && camera.zone !== zone) return false
    if (statusFilter !== 'All' && camera.status !== statusFilter.toLowerCase()) return false
    return true
  })

  const online = cameras.filter(camera => camera.status === 'online').length
  const offline = cameras.filter(camera => camera.status === 'offline').length
  const degraded = cameras.filter(camera => camera.status === 'degraded').length
  const maintenance = cameras.filter(camera => camera.status === 'maintenance').length

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
            Zone Alpha Sector · {cameras.length} cameras · Real-time feeds
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
            {zones.map((item) => <option key={item} value={item}>{item === 'All' ? 'Zone: All' : item}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94A3B8' }} />
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          {['All', 'Online', 'Offline', 'Degraded', 'Maintenance'].map((status, i, arr) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                background: statusFilter === status ? '#2F6B4F' : '#fff',
                color: statusFilter === status ? '#fff' : '#64748B',
                fontWeight: statusFilter === status ? 500 : 400,
                borderRight: i < arr.length - 1 ? '1px solid #E2E8F0' : 'none',
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Grid size toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          {GRID_SIZES.map((grid, i) => (
            <button
              key={grid.label}
              onClick={() => setGridIdx(i)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                background: gridIdx === i ? '#2F6B4F' : '#fff',
                color: gridIdx === i ? '#fff' : '#64748B',
                borderRight: i < GRID_SIZES.length - 1 ? '1px solid #E2E8F0' : 'none',
              }}
            >
              {grid.label}
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
        {filtered.map((camera) => {
          const videoSrc = streamUrl(camera.source)
          const isOffline = camera.status === 'offline' || camera.status === 'maintenance'
          const hovered = hoveredCam === camera.id
          return (
            <div
              key={camera.id}
              className="relative overflow-hidden rounded-xl cursor-pointer group"
              style={{
                aspectRatio: '16/9',
                background: '#0f1923',
                border: camera.status === 'offline'
                  ? '1.5px solid rgba(214,69,69,0.4)'
                  : camera.status === 'degraded'
                  ? '1.5px solid rgba(217,144,0,0.4)'
                  : '1.5px solid transparent',
                boxShadow: hovered ? '0 0 0 2px #2F6B4F' : 'none',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={() => setHoveredCam(camera.id)}
              onMouseLeave={() => setHoveredCam(null)}
              onClick={() => setSelectedCam({ cam: camera, src: videoSrc })}
            >
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
                  {camera.status === 'maintenance'
                    ? <Wrench size={20} style={{ color: '#64748B' }} />
                    : <WifiOff size={20} style={{ color: '#64748B' }} />}
                  <span className="text-xs mt-1.5 font-medium" style={{ color: '#64748B' }}>
                    {camera.status === 'maintenance' ? 'Maintenance' : 'No Signal'}
                  </span>
                </div>
              ) : videoSrc ? (
                <video
                  key={videoSrc}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ filter: camera.status === 'degraded' ? 'brightness(0.7) saturate(0.5)' : 'none' }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: '#0f1923' }}>
                  <WifiOff size={20} style={{ color: '#64748B' }} />
                  <span className="text-xs mt-1.5 font-medium" style={{ color: '#64748B' }}>No Stream</span>
                </div>
              )}

              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />

              <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                {camera.status === 'online' && (
                  <span className="text-white font-semibold rounded px-1" style={{ background: '#D64545', fontSize: 9, letterSpacing: '0.05em' }}>LIVE</span>
                )}
                {camera.status === 'degraded' && (
                  <span className="font-semibold rounded px-1" style={{ background: 'rgba(217,144,0,0.9)', color: '#fff', fontSize: 9 }}>DEGRADED</span>
                )}
                {(camera.status === 'offline' || camera.status === 'maintenance') && <span />}
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: sevDot(camera.severity), boxShadow: camera.severity === 'high' ? `0 0 5px ${sevDot(camera.severity)}` : 'none' }}
                />
              </div>

              {hovered && camera.severity === 'high' && (
                <div className="absolute top-7 left-2 flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(214,69,69,0.85)' }}>
                  <AlertTriangle size={10} className="text-white" />
                  <span className="text-white text-xs font-semibold" style={{ fontSize: 10 }}>Active Alert</span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                <div className="font-mono text-xs font-semibold" style={{ color: '#fff', fontSize: 10, lineHeight: '14px' }}>{camera.id}</div>
                <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>{camera.name}</div>
                {hovered && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>
                    {camera.lastEvent} · {camera.lastEventTime}
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
