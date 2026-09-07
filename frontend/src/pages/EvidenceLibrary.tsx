import { useState } from 'react'
import { Search, Download, ChevronDown, Hash, ShieldCheck, ShieldAlert, X, Archive } from 'lucide-react'
import { EVIDENCE_LIBRARY, type EvidenceEntry } from '../data/mockData'

const CAMERAS = ['All', ...Array.from(new Set(EVIDENCE_LIBRARY.map((e) => e.camera))).sort()]
const ENTITIES = ['All', ...Array.from(new Set(EVIDENCE_LIBRARY.map((e) => e.entityId))).sort()]

export default function EvidenceLibrary() {
  const [search, setSearch] = useState('')
  const [camFilter, setCamFilter] = useState('All')
  const [entityFilter, setEntityFilter] = useState('All')
  const [selected, setSelected] = useState<EvidenceEntry | null>(null)

  const filtered = EVIDENCE_LIBRARY.filter((ev) => {
    if (search && !ev.id.toLowerCase().includes(search.toLowerCase()) && !ev.entityId.toLowerCase().includes(search.toLowerCase()) && !ev.camera.toLowerCase().includes(search.toLowerCase())) return false
    if (camFilter !== 'All' && ev.camera !== camFilter) return false
    if (entityFilter !== 'All' && ev.entityId !== entityFilter) return false
    return true
  })

  const totalSize = EVIDENCE_LIBRARY.reduce((acc, ev) => acc + parseFloat(ev.size), 0).toFixed(1)

  return (
    <div className="p-8 flex gap-6">
      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>Evidence Library</h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              {EVIDENCE_LIBRARY.length} clips · {totalSize} MB · SHA-256 chain of custody
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ border: '1px solid #E2E8F0', color: '#64748B', background: '#fff' }}
          >
            <Download size={13} /> Export All
          </button>
        </div>

        {/* Filters */}
        <div
          className="bg-white rounded-xl px-5 py-3.5 mb-4 flex items-center gap-3 flex-wrap"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search by ID, entity, or camera…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#17212B', fontFamily: 'inherit' }}
            />
          </div>

          <FilterSelect value={camFilter} options={CAMERAS} onChange={setCamFilter} label="Camera" />
          <FilterSelect value={entityFilter} options={ENTITIES} onChange={setEntityFilter} label="Entity" />

          <span className="ml-auto text-xs" style={{ color: '#94A3B8' }}>{filtered.length} of {EVIDENCE_LIBRARY.length} clips</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div
            className="grid px-5 py-3 text-xs font-semibold"
            style={{
              gridTemplateColumns: '90px 70px 90px 100px 70px 60px 80px 1fr 80px',
              color: '#64748B',
              borderBottom: '1px solid #F1F5F9',
              background: '#FAFBFC',
              letterSpacing: '0.04em',
            }}
          >
            <div>EVIDENCE ID</div>
            <div>ENTITY</div>
            <div>INCIDENT</div>
            <div>CAMERA · ZONE</div>
            <div>TIME</div>
            <div>DUR.</div>
            <div>SIZE</div>
            <div>HASH</div>
            <div>INTEGRITY</div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>
              No evidence matches the current filters
            </div>
          ) : (
            filtered.map((ev, i) => {
              const isActive = selected?.id === ev.id
              return (
                <div
                  key={ev.id}
                  className="grid items-center px-5 py-3 cursor-pointer transition-colors"
                  style={{
                    gridTemplateColumns: '90px 70px 90px 100px 70px 60px 80px 1fr 80px',
                    borderBottom: i < filtered.length - 1 ? '1px solid #F8FAFC' : 'none',
                    background: isActive ? '#F0F7F4' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F8FAFD' }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  onClick={() => setSelected(isActive ? null : ev)}
                >
                  <span className="font-mono text-xs font-semibold" style={{ color: '#2F6B4F' }}>{ev.id}</span>
                  <span className="font-mono text-xs" style={{ color: '#17212B' }}>{ev.entityId}</span>
                  <span className="font-mono text-xs" style={{ color: ev.incidentId ? '#2F6B4F' : '#94A3B8' }}>
                    {ev.incidentId ?? '—'}
                  </span>
                  <div>
                    <div className="font-mono text-xs font-medium" style={{ color: '#17212B' }}>{ev.camera}</div>
                    <div className="text-xs truncate" style={{ color: '#94A3B8', fontSize: 10 }}>{ev.zone.split(' · ')[1] ?? ev.zone}</div>
                  </div>
                  <span className="font-mono text-xs" style={{ color: '#64748B' }}>{ev.timestamp}</span>
                  <span className="font-mono text-xs" style={{ color: '#64748B' }}>{ev.duration}</span>
                  <span className="text-xs" style={{ color: '#64748B' }}>{ev.size}</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <Hash size={10} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                    <span className="font-mono text-xs truncate" style={{ color: '#94A3B8', fontSize: 10 }}>
                      {ev.hash.replace('sha256:', '').slice(0, 16)}…
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {ev.verified
                      ? <><ShieldCheck size={13} style={{ color: '#2E7D32' }} /><span className="text-xs font-semibold" style={{ color: '#2E7D32' }}>Verified</span></>
                      : <><ShieldAlert size={13} style={{ color: '#D99000' }} /><span className="text-xs font-semibold" style={{ color: '#D99000' }}>Pending</span></>}
                  </div>
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
          style={{ width: 320, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', maxHeight: 'calc(100vh - 80px)', position: 'sticky', top: 0 }}
        >
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <div className="font-mono text-sm font-bold" style={{ color: '#2F6B4F' }}>{selected.id}</div>
              <div className="text-xs" style={{ color: '#64748B' }}>Evidence detail</div>
            </div>
            <button onClick={() => setSelected(null)}>
              <X size={16} style={{ color: '#94A3B8' }} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Integrity banner */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{
                background: selected.verified ? 'rgba(46,125,50,0.08)' : 'rgba(217,144,0,0.08)',
                border: `1px solid ${selected.verified ? 'rgba(46,125,50,0.2)' : 'rgba(217,144,0,0.25)'}`,
              }}
            >
              {selected.verified
                ? <ShieldCheck size={15} style={{ color: '#2E7D32' }} />
                : <ShieldAlert size={15} style={{ color: '#D99000' }} />}
              <div>
                <div className="text-xs font-semibold" style={{ color: selected.verified ? '#2E7D32' : '#D99000' }}>
                  {selected.verified ? 'SHA-256 Verified' : 'Verification Pending'}
                </div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Chain of custody intact</div>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2.5">
              {[
                { label: 'Entity ID', value: selected.entityId, mono: true },
                { label: 'Incident', value: selected.incidentId ?? 'Not linked', mono: !!selected.incidentId },
                { label: 'Camera', value: selected.camera, mono: true },
                { label: 'Zone', value: selected.zone },
                { label: 'Timestamp', value: selected.timestamp, mono: true },
                { label: 'Duration', value: selected.duration, mono: true },
                { label: 'Format', value: selected.format },
                { label: 'File Size', value: selected.size },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#94A3B8' }}>{label}</span>
                  <span className={`text-sm ${mono ? 'font-mono' : ''}`} style={{ color: '#17212B' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Full hash */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
              <div className="text-xs font-semibold mb-2" style={{ color: '#64748B', letterSpacing: '0.05em' }}>FULL HASH</div>
              <div
                className="p-2.5 rounded-lg font-mono text-xs break-all"
                style={{ background: '#F8FAFC', color: '#64748B', fontSize: 10, lineHeight: '16px' }}
              >
                {selected.hash}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button className="w-full py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2" style={{ background: '#2F6B4F' }}>
                <Download size={13} /> Download Clip
              </button>
              <button className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2" style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
                <Archive size={13} /> Export with Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterSelect({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs border outline-none cursor-pointer"
        style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#17212B', fontFamily: 'inherit' }}
      >
        {options.map((o) => <option key={o} value={o}>{o === 'All' ? `${label}: All` : o}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94A3B8' }} />
    </div>
  )
}
