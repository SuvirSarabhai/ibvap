import {
  LayoutDashboard,
  Monitor,
  ScrollText,
  AlertTriangle,
  FileCheck,
  Camera,
  Archive,
  Settings,
  UsersRound,
  Shield,
} from 'lucide-react'

type Page = string

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'live', label: 'Live Monitoring', icon: Monitor },
  { id: 'activity', label: 'Activity Log', icon: ScrollText },
  { id: 'threats', label: 'Threats & Alerts', icon: AlertTriangle, badge: 3 },
  { id: 'incidents', label: 'Confirmed Incidents', icon: FileCheck },
  { id: 'camera-health', label: 'Camera Health', icon: Camera },
  { id: 'evidence', label: 'Evidence', icon: Archive },
  { id: 'personnel', label: 'Personnel', icon: UsersRound },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface Props {
  activePage: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ activePage, onNavigate }: Props) {
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-full"
      style={{ width: 232, background: '#2F6B4F' }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm tracking-wider">IBVAP</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Command Centre
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
          style={{ background: 'rgba(0,0,0,0.12)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: '#4ade80', boxShadow: '0 0 4px #4ade80' }}
          />
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
            LIVE · {now}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-auto">
        <div className="text-xs font-semibold tracking-widest mb-2 px-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          NAVIGATION
        </div>
        {NAV.map(({ id, label, icon: Icon, badge }) => {
          const active = activePage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-all duration-150 text-left"
              style={{
                background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'
              }}
            >
              <Icon size={15} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span
                  className="text-xs rounded-full px-1.5 py-0.5 font-semibold"
                  style={{ background: '#D64545', color: '#fff', fontSize: 10, lineHeight: '14px' }}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Operator */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
            style={{ background: '#167D7F' }}
          >
            JR
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">N. Gupta</div>
            <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Senior Analyst
            </div>
          </div>
        </div>
        <div className="mt-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          v2.4.1 · Zone Alpha Sector
        </div>
      </div>
    </aside>
  )
}
