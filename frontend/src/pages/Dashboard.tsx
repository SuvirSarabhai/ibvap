import { useEffect, useState } from 'react'
import { Camera, AlertTriangle, FileText, Activity, ArrowRight, WifiOff, Clock } from 'lucide-react'
import { getSummary } from '../api/client'
import useAlertSocket from '../hooks/useAlertSocket'

const CAMERAS = [
  {
    id: 'CAM-01', name: 'North Gate', zone: 'Zone A', status: 'active', severity: 'high',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=240&fit=crop&auto=format',
    event: 'Unidentified individual · 14:47',
  },
  {
    id: 'CAM-04', name: 'East Perimeter', zone: 'Zone B', status: 'active', severity: 'medium',
    img: 'https://images.unsplash.com/photo-1544986581-efac024faf62?w=400&h=240&fit=crop&auto=format',
    event: 'Vehicle entry detected · 14:31',
  },
  {
    id: 'CAM-07', name: 'South Checkpoint', zone: 'Zone C', status: 'active', severity: 'normal',
    img: 'https://images.unsplash.com/photo-1473445730015-841f29a9490b?w=400&h=240&fit=crop&auto=format',
    event: 'No events · 14:18',
  },
  {
    id: 'CAM-11', name: 'Restricted Access', zone: 'Zone D', status: 'active', severity: 'high',
    img: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=240&fit=crop&auto=format',
    event: 'Zone breach alert · 14:47',
  },
  {
    id: 'CAM-14', name: 'West Fence Line', zone: 'Zone E', status: 'active', severity: 'normal',
    img: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&h=240&fit=crop&auto=format',
    event: 'Perimeter clear · 14:22',
  },
  {
    id: 'CAM-17', name: 'Service Road', zone: 'Zone F', status: 'offline', severity: 'normal',
    img: '',
    event: 'Signal lost · 11:04',
  },
]

const STATS = [
  {
    label: 'Total Cameras',
    value: '24',
    sub: '22 online · 2 offline',
    icon: Camera,
    color: '#2F6B4F',
    bg: '#2F6B4F14',
  },
  {
    label: 'Active Threats',
    value: '3',
    sub: '1 high · 2 medium',
    icon: AlertTriangle,
    color: '#D64545',
    bg: '#D6454514',
  },
  {
    label: 'Incidents Today',
    value: '7',
    sub: '3 confirmed · 4 pending',
    icon: FileText,
    color: '#D99000',
    bg: '#D9900014',
  },
  {
    label: 'System Health',
    value: '98%',
    sub: 'All services nominal',
    icon: Activity,
    color: '#167D7F',
    bg: '#167D7F14',
  },
]

const RECENT = [
  { time: '14:47', event: 'Zone breach — Restricted Access', entity: 'P-2847', severity: 'high', camera: 'CAM-14' },
  { time: '14:38', event: 'Loitering detected >12 min', entity: 'P-2847', severity: 'medium', camera: 'CAM-11' },
  { time: '14:31', event: 'Vehicle unregistered entry', entity: 'V-1205', severity: 'medium', camera: 'CAM-04' },
  { time: '14:22', event: 'ANPR match — flagged plate', entity: 'V-0934', severity: 'high', camera: 'CAM-02' },
  { time: '14:18', event: 'Camera offline', entity: '—', severity: 'normal', camera: 'CAM-17' },
  { time: '14:09', event: 'Zone entry — South Checkpoint', entity: 'P-3110', severity: 'normal', camera: 'CAM-07' },
  { time: '13:55', event: 'Perimeter sensor triggered', entity: '—', severity: 'medium', camera: 'CAM-08' },
]

interface Props {
  onNavigate: (page: string) => void
}

export default function Dashboard({ onNavigate }: Props) {
  const [summary, setSummary] = useState<{ cameras_total: number; cameras_online: number; cameras_offline: number; active_threats_high: number; active_threats_medium: number; incidents_today: number; incidents_confirmed: number; incidents_pending: number; system_health_pct: number } | null>(null)

  const refreshSummary = () => getSummary().then(setSummary).catch(() => undefined)

  useEffect(() => { void refreshSummary() }, [])
  useAlertSocket(() => { void refreshSummary() })

  const stats = summary ? [
    { ...STATS[0], value: summary.cameras_total, sub: `${summary.cameras_online} online · ${summary.cameras_offline} offline` },
    { ...STATS[1], value: summary.active_threats_high + summary.active_threats_medium, sub: `${summary.active_threats_high} high · ${summary.active_threats_medium} medium` },
    { ...STATS[2], value: summary.incidents_today, sub: `${summary.incidents_confirmed} confirmed · ${summary.incidents_pending} pending` },
    { ...STATS[3], value: `${summary.system_health_pct}%` },
  ] : STATS

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>
            Operational Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Zone Alpha Sector · Monday 7 September 2026 · 14:47 UTC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: '#D64545', color: '#fff' }}
          >
            <AlertTriangle size={12} />
            {summary?.active_threats_high ?? 1} HIGH THREAT ACTIVE
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: bg }}
              >
                <Icon size={17} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: '#17212B' }}>
              {value}
            </div>
            <div className="text-sm font-medium mt-0.5" style={{ color: '#17212B' }}>
              {label}
            </div>
            <div className="text-xs mt-1" style={{ color: '#64748B' }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Camera Thumbnails */}
      <div
        className="bg-white rounded-xl mb-6"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="font-semibold text-sm" style={{ color: '#17212B' }}>
            Live Camera Feeds
          </div>
          <button
            className="text-xs font-medium flex items-center gap-1 transition-colors"
            style={{ color: '#167D7F' }}
            onClick={() => onNavigate('live')}
          >
            View all cameras <ArrowRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-6 gap-0">
          {CAMERAS.map((cam, i) => (
            <div
              key={cam.id}
              className="relative overflow-hidden"
              style={{
                borderRight: i < CAMERAS.length - 1 ? '1px solid #F1F5F9' : 'none',
                aspectRatio: '4/3',
              }}
            >
              {cam.status === 'offline' ? (
                <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: '#1a1a2e' }}>
                  <WifiOff size={20} style={{ color: '#64748B' }} />
                  <span className="text-xs mt-1.5" style={{ color: '#64748B' }}>
                    No Signal
                  </span>
                </div>
              ) : (
                <img
                  src={cam.img}
                  alt={cam.name}
                  className="w-full h-full object-cover"
                  style={{ background: '#1e293b' }}
                />
              )}
              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}
              />
              {/* Severity indicator */}
              <div className="absolute top-1.5 right-1.5">
                <span
                  className="w-2 h-2 rounded-full block"
                  style={{
                    background:
                      cam.severity === 'high'
                        ? '#D64545'
                        : cam.severity === 'medium'
                          ? '#D99000'
                          : '#2E7D32',
                    boxShadow: cam.severity === 'high' ? '0 0 4px #D64545' : 'none',
                  }}
                />
              </div>
              {/* Camera info */}
              <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5">
                <div className="font-mono text-xs font-semibold" style={{ color: '#fff', fontSize: 10 }}>
                  {cam.id}
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>
                  {cam.name}
                </div>
              </div>
              {/* Live badge */}
              {cam.status === 'active' && (
                <div className="absolute top-1.5 left-1.5">
                  <span
                    className="text-white font-semibold rounded px-1"
                    style={{ background: '#D64545', fontSize: 9, letterSpacing: '0.05em' }}
                  >
                    LIVE
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div
        className="bg-white rounded-xl"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="font-semibold text-sm" style={{ color: '#17212B' }}>
            Recent Activity
          </div>
          <button
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: '#167D7F' }}
            onClick={() => onNavigate('activity')}
          >
            View full log <ArrowRight size={12} />
          </button>
        </div>
        <div>
          {RECENT.map((row, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3 transition-colors cursor-pointer"
              style={{
                borderBottom: i < RECENT.length - 1 ? '1px solid #F8FAFC' : 'none',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#FAFBFF')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              onClick={() => onNavigate('activity')}
            >
              <div className="font-mono text-xs w-10 flex-shrink-0" style={{ color: '#64748B' }}>
                {row.time}
              </div>
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background:
                    row.severity === 'high'
                      ? '#D64545'
                      : row.severity === 'medium'
                        ? '#D99000'
                        : '#2E7D32',
                }}
              />
              <div className="flex-1 text-sm" style={{ color: '#17212B' }}>
                {row.event}
              </div>
              {row.entity !== '—' && (
                <div
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ background: '#F1F5F9', color: '#64748B' }}
                >
                  {row.entity}
                </div>
              )}
              <div className="font-mono text-xs" style={{ color: '#64748B' }}>
                {row.camera}
              </div>
              <div className="flex items-center gap-1" style={{ color: '#94A3B8' }}>
                <Clock size={11} />
                <span className="text-xs">now</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
