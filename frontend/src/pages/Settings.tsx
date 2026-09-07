import { useState } from 'react'
import { User, Bell, Camera, Shield, Server, ScrollText, Check, ChevronRight } from 'lucide-react'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'cameras', label: 'Camera Config', icon: Camera },
  { id: 'system', label: 'System', icon: Server },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
]

const AUDIT_ENTRIES = [
  { time: '14:48:04', action: 'Entity P-2847 flagged as High Risk', operator: 'J. Ramirez', ip: '10.0.0.4' },
  { time: '14:39:00', action: 'Alert THR-003 acknowledged', operator: 'M. Chen', ip: '10.0.0.6' },
  { time: '14:25:00', action: 'Incident INC-0046 escalated', operator: 'J. Ramirez', ip: '10.0.0.4' },
  { time: '13:14:51', action: 'Manual flag applied on P-2847', operator: 'J. Ramirez', ip: '10.0.0.4' },
  { time: '12:05:10', action: 'User session started', operator: 'M. Chen', ip: '10.0.0.6' },
  { time: '11:47:33', action: 'Alert THR-007 dismissed', operator: 'J. Ramirez', ip: '10.0.0.4' },
  { time: '11:04:02', action: 'Camera CAM-17 offline alert acknowledged', operator: 'System', ip: '127.0.0.1' },
  { time: '09:00:00', action: 'Shift started — operator login', operator: 'J. Ramirez', ip: '10.0.0.4' },
]

const NOTIF_SETTINGS = [
  { id: 'zone_breach', label: 'Zone Breach Alerts', desc: 'Notify when entity enters a restricted zone', enabled: true },
  { id: 'anpr', label: 'ANPR Matches', desc: 'Flagged license plate detections', enabled: true },
  { id: 'loitering', label: 'Loitering Detections', desc: 'Threshold: >10 minutes in monitored area', enabled: true },
  { id: 'camera_offline', label: 'Camera Offline', desc: 'Alert when any camera loses signal', enabled: true },
  { id: 'score_threshold', label: 'Threat Score Threshold', desc: 'Alert when threat score exceeds 70', enabled: true },
  { id: 'unregistered', label: 'Unregistered Vehicles', desc: 'ANPR detects vehicles not in registry', enabled: false },
  { id: 'system_health', label: 'System Health Warnings', desc: 'Degraded performance or service errors', enabled: false },
]

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{ width: 36, height: 20, background: enabled ? '#2F6B4F' : '#CBD5E1' }}
    >
      <span
        className="absolute top-1 rounded-full transition-all"
        style={{
          width: 12,
          height: 12,
          background: '#fff',
          left: enabled ? 20 : 4,
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: '#64748B' }}>{label}</label>
      {children}
    </div>
  )
}

const INPUT_STYLE = {
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  color: '#17212B',
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  width: '100%',
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [notifs, setNotifs] = useState(NOTIF_SETTINGS)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleNotif = (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)))
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Operator preferences and system configuration
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="flex-shrink-0" style={{ width: 200 }}>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{
                    background: active ? 'rgba(47,107,79,0.07)' : 'transparent',
                    color: active ? '#2F6B4F' : '#64748B',
                    fontWeight: active ? 600 : 400,
                    borderLeft: `3px solid ${active ? '#2F6B4F' : 'transparent'}`,
                    textAlign: 'left',
                  }}
                >
                  <Icon size={14} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={12} style={{ color: '#2F6B4F' }} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 className="text-base font-semibold mb-5" style={{ color: '#17212B' }}>Operator Profile</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-7 pb-6" style={{ borderBottom: '1px solid #F1F5F9' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0" style={{ background: '#2F6B4F' }}>
                  JR
                </div>
                <div>
                  <div className="font-semibold text-base" style={{ color: '#17212B' }}>J. Ramirez</div>
                  <div className="text-sm" style={{ color: '#64748B' }}>Senior Analyst · Zone Alpha Sector</div>
                  <div className="text-xs mt-1 font-mono" style={{ color: '#94A3B8' }}>Session started 09:00 · v2.4.1</div>
                </div>
                <button
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ border: '1px solid #E2E8F0', color: '#64748B' }}
                >
                  Change Avatar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <FormRow label="First Name">
                  <input defaultValue="J." style={INPUT_STYLE} />
                </FormRow>
                <FormRow label="Last Name">
                  <input defaultValue="Ramirez" style={INPUT_STYLE} />
                </FormRow>
                <FormRow label="Role">
                  <input defaultValue="Senior Analyst" style={INPUT_STYLE} />
                </FormRow>
                <FormRow label="Badge ID">
                  <input defaultValue="OP-0042" style={INPUT_STYLE} className="font-mono" />
                </FormRow>
                <FormRow label="Sector">
                  <input defaultValue="Zone Alpha Sector" style={INPUT_STYLE} />
                </FormRow>
                <FormRow label="Email">
                  <input defaultValue="j.ramirez@ibvap.sec" style={INPUT_STYLE} />
                </FormRow>
              </div>

              <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #F1F5F9' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#17212B' }}>Change Password</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormRow label="Current Password">
                    <input type="password" placeholder="••••••••" style={INPUT_STYLE} />
                  </FormRow>
                  <FormRow label="New Password">
                    <input type="password" placeholder="••••••••" style={INPUT_STYLE} />
                  </FormRow>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{ background: saved ? '#2E7D32' : '#2F6B4F' }}
                >
                  {saved && <Check size={13} />}
                  {saved ? 'Saved!' : 'Save Changes'}
                </button>
                <button className="px-5 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 className="text-base font-semibold mb-1" style={{ color: '#17212B' }}>Notification Settings</h2>
              <p className="text-sm mb-5" style={{ color: '#64748B' }}>Configure which alerts trigger operator notifications.</p>

              <div className="space-y-0">
                {notifs.map((n, i) => (
                  <div
                    key={n.id}
                    className="flex items-center gap-4 py-4"
                    style={{ borderBottom: i < notifs.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: '#17212B' }}>{n.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{n.desc}</div>
                    </div>
                    <Toggle enabled={n.enabled} onChange={() => toggleNotif(n.id)} />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #F1F5F9' }}>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: saved ? '#2E7D32' : '#2F6B4F' }}
                >
                  {saved && <Check size={13} />}
                  {saved ? 'Saved!' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* Camera Config */}
          {activeTab === 'cameras' && (
            <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 className="text-base font-semibold mb-1" style={{ color: '#17212B' }}>Camera Configuration</h2>
              <p className="text-sm mb-5" style={{ color: '#64748B' }}>Alert sensitivity and zone assignment per camera.</p>

              <div className="space-y-0">
                {[
                  { id: 'CAM-01', name: 'North Gate — Primary', zone: 'Zone A', sensitivity: 75 },
                  { id: 'CAM-02', name: 'North Gate — Secondary', zone: 'Zone A', sensitivity: 80 },
                  { id: 'CAM-04', name: 'East Perimeter — Gate', zone: 'Zone B', sensitivity: 70 },
                  { id: 'CAM-07', name: 'South Checkpoint', zone: 'Zone C', sensitivity: 65 },
                  { id: 'CAM-11', name: 'Restricted Zone — Interior A', zone: 'Zone D', sensitivity: 90 },
                  { id: 'CAM-14', name: 'Restricted Access — Main', zone: 'Zone D', sensitivity: 95 },
                  { id: 'CAM-17', name: 'Service Road — Entry', zone: 'Zone F', sensitivity: 60 },
                ].map((cam, i, arr) => (
                  <div
                    key={cam.id}
                    className="flex items-center gap-4 py-4"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  >
                    <div className="font-mono text-xs font-semibold w-16 flex-shrink-0" style={{ color: '#2F6B4F' }}>{cam.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ color: '#17212B' }}>{cam.name}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{cam.zone}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs" style={{ color: '#64748B' }}>Alert sensitivity</span>
                      <div className="relative" style={{ width: 100 }}>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          defaultValue={cam.sensitivity}
                          className="w-full"
                          style={{ accentColor: '#2F6B4F' }}
                        />
                      </div>
                      <span className="font-mono text-xs w-8 text-right" style={{ color: '#64748B' }}>{cam.sensitivity}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h2 className="text-base font-semibold mb-4" style={{ color: '#17212B' }}>System Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Platform', value: 'IBVAP Command Centre v2.4.1' },
                    { label: 'Build', value: '20260907.1' },
                    { label: 'API Status', value: 'Nominal' },
                    { label: 'AI Engine', value: 'v3.1.2 · GPU Active' },
                    { label: 'Database', value: 'PostgreSQL 16 · Connected' },
                    { label: 'Stream Latency', value: '<250 ms avg' },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-4 py-3 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <div className="text-xs mb-1" style={{ color: '#94A3B8' }}>{label}</div>
                      <div className="text-sm font-medium" style={{ color: '#17212B' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h2 className="text-base font-semibold mb-4" style={{ color: '#17212B' }}>Data Retention</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Video Footage', value: '30 days' },
                    { label: 'Event Logs', value: '90 days' },
                    { label: 'Evidence Files', value: 'Indefinite (manual review)' },
                    { label: 'Audit Trail', value: '12 months' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <span className="text-sm" style={{ color: '#17212B' }}>{label}</span>
                      <span className="text-sm font-medium font-mono" style={{ color: '#64748B' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h2 className="text-base font-semibold mb-1" style={{ color: '#17212B' }}>Service Health</h2>
                <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>Live status of all backend services</p>
                <div className="space-y-2">
                  {[
                    { name: 'Video Ingestion Service', status: 'Operational', ok: true },
                    { name: 'AI Inference Engine', status: 'Operational', ok: true },
                    { name: 'ANPR Service', status: 'Operational', ok: true },
                    { name: 'Alert Dispatcher', status: 'Operational', ok: true },
                    { name: 'Evidence Storage', status: 'Operational', ok: true },
                    { name: 'Audit Logger', status: 'Operational', ok: true },
                  ].map(({ name, status, ok }) => (
                    <div key={name} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <span className="text-sm" style={{ color: '#17212B' }}>{name}</span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: ok ? '#2E7D32' : '#D64545' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? '#2E7D32' : '#D64545' }} />
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audit Log */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F1F5F9' }}>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: '#17212B' }}>Operator Audit Log</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>All operator and system actions for today</p>
                </div>
                <button className="flex items-center gap-1.5 text-xs" style={{ color: '#167D7F' }}>
                  <Shield size={12} /> Export log
                </button>
              </div>
              <div>
                {AUDIT_ENTRIES.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 px-5 py-3.5"
                    style={{ borderBottom: i < AUDIT_ENTRIES.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                  >
                    <span className="font-mono text-xs w-16 flex-shrink-0 mt-0.5" style={{ color: '#94A3B8' }}>{entry.time}</span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ background: entry.operator === 'System' ? '#94A3B8' : '#2F6B4F', fontSize: 9 }}
                    >
                      {entry.operator === 'System' ? '⚙' : entry.operator.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm" style={{ color: '#17212B' }}>{entry.action}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: '#94A3B8' }}>
                        <span>{entry.operator}</span>
                        <span>·</span>
                        <span className="font-mono">{entry.ip}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
