import { ArrowLeft, Camera, MapPin, Clock, AlertTriangle, Shield, Download, User, Eye, Lock, Hash, ChevronRight } from 'lucide-react'
import { ENTITY_P2847 } from '../data/mockData'
import SeverityBadge from '../components/SeverityBadge'

interface Props {
  entityId: string
  onBack: () => void
}

const entity = ENTITY_P2847

function ThreatGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#D64545' : score >= 40 ? '#D99000' : '#2E7D32'
  const r = 48
  const circ = 2 * Math.PI * r
  const arc = (score / 100) * circ * 0.75
  const gap = circ - arc
  const offset = circ * 0.125 // start from bottom-left

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 128, height: 128 }}>
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Track */}
          <circle
            cx="64" cy="64" r={r}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(135 64 64)"
          />
          {/* Fill */}
          <circle
            cx="64" cy="64" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${arc} ${circ - arc}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(135 64 64)"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-2xl" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
            {score}
          </span>
          <span className="text-xs" style={{ color: '#94A3B8' }}>/ 100</span>
        </div>
      </div>
      <div
        className="text-sm font-semibold mt-1"
        style={{ color }}
      >
        {score >= 70 ? 'HIGH RISK' : score >= 40 ? 'ELEVATED' : 'LOW RISK'}
      </div>
    </div>
  )
}

function TrajectoryTimeline() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f1f1a 0%, #1a2f28 100%)',
        padding: '32px',
      }}
    >
      <div className="overflow-x-auto">
        <div className="flex items-start gap-0" style={{ minWidth: 'max-content' }}>
          {entity.trajectory.map((step, i) => {
            const isLast = i === entity.trajectory.length - 1
            const isAlert = step.alert
            const nodeColor = isAlert ? '#D64545' : step.threat > 40 ? '#D99000' : '#2E7D32'
            const nodeBg = isAlert
              ? 'rgba(214,69,69,0.15)'
              : step.threat > 40
                ? 'rgba(217,144,0,0.12)'
                : 'rgba(46,125,50,0.12)'

            return (
              <div key={i} className="flex items-start">
                {/* Node */}
                <div className="flex flex-col items-center" style={{ width: 160 }}>
                  {/* Timestamp chip */}
                  <div
                    className="font-mono text-xs px-2.5 py-1 rounded-md mb-4 font-medium"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                  >
                    {step.arrival}
                  </div>

                  {/* Camera node circle */}
                  <div
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                      width: 72,
                      height: 72,
                      background: nodeBg,
                      border: `2px solid ${nodeColor}`,
                      boxShadow: isAlert ? `0 0 20px ${nodeColor}44` : 'none',
                    }}
                  >
                    <Camera size={24} style={{ color: nodeColor }} />
                    {isAlert && (
                      <div
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#D64545' }}
                      >
                        <AlertTriangle size={10} className="text-white" />
                      </div>
                    )}
                    {/* Threat score on node */}
                    <div
                      className="absolute -bottom-2.5 font-mono text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: nodeColor, color: '#fff', fontSize: 9 }}
                    >
                      {step.threat}/100
                    </div>
                  </div>

                  {/* Camera ID */}
                  <div
                    className="font-mono text-sm font-semibold mt-5"
                    style={{ color: '#fff' }}
                  >
                    {step.camera}
                  </div>
                  {/* Camera name */}
                  <div
                    className="text-xs text-center mt-0.5"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {step.name}
                  </div>
                  {/* Zone */}
                  <div
                    className="flex items-center gap-1 mt-1"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    <MapPin size={10} />
                    <span className="text-xs">{step.zone}</span>
                  </div>

                  {/* Dwell time */}
                  <div
                    className="flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    <Clock size={10} />
                    <span className="font-mono text-xs">{step.dwell}</span>
                  </div>

                  {/* Departure */}
                  {step.departure && (
                    <div
                      className="font-mono text-xs mt-1.5"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      ↗ {step.departure}
                    </div>
                  )}
                  {!step.departure && (
                    <div
                      className="text-xs mt-1.5 font-semibold"
                      style={{ color: '#D64545' }}
                    >
                      CURRENT
                    </div>
                  )}
                </div>

                {/* Connector */}
                {!isLast && (
                  <div className="flex flex-col items-center justify-start mt-8 flex-shrink-0" style={{ width: 72 }}>
                    <div className="relative w-full flex items-center">
                      <svg width="72" height="24" viewBox="0 0 72 24" style={{ overflow: 'visible' }}>
                        <defs>
                          <marker
                            id={`arrowhead-${i}`}
                            markerWidth="6"
                            markerHeight="6"
                            refX="5"
                            refY="3"
                            orient="auto"
                          >
                            <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.25)" />
                          </marker>
                        </defs>
                        <line
                          x1="4"
                          y1="12"
                          x2="64"
                          y2="12"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="1.5"
                          strokeDasharray="5,3"
                          markerEnd={`url(#arrowhead-${i})`}
                        />
                      </svg>
                    </div>
                    <div
                      className="font-mono text-center mt-1"
                      style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                    >
                      transit
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { color: '#2E7D32', label: 'Normal' },
          { color: '#D99000', label: 'Elevated' },
          { color: '#D64545', label: 'High risk' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.2)', borderTop: '1.5px dashed rgba(255,255,255,0.2)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Camera transition</span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-xl"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 20 }}
    >
      <div
        className="px-5 py-3.5 flex items-center gap-2"
        style={{ borderBottom: '1px solid #F1F5F9' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: '#17212B' }}>
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function EntityDetail({ entityId, onBack }: Props) {
  const totalRisk = entity.riskFactors.reduce((sum, f) => sum + f.score, 0)

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm mb-5 transition-colors"
        style={{ color: '#64748B' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#2F6B4F')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#64748B')}
      >
        <ArrowLeft size={14} />
        Activity Log
        <ChevronRight size={12} style={{ color: '#CBD5E1' }} />
        <span style={{ color: '#17212B' }}>Entity {entityId}</span>
      </button>

      {/* Header card */}
      <div
        className="bg-white rounded-xl p-5 mb-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(214,69,69,0.08)', border: '1.5px solid rgba(214,69,69,0.2)' }}
            >
              <User size={24} style={{ color: '#D64545' }} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono text-xl font-bold" style={{ color: '#17212B' }}>
                  {entity.id}
                </span>
                <SeverityBadge severity="high" showDot />
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(214,69,69,0.1)', color: '#D64545', letterSpacing: '0.04em' }}
                >
                  ACTIVE THREAT
                </span>
              </div>
              <div className="text-sm" style={{ color: '#64748B' }}>
                {entity.label} · {entity.description}
              </div>
              <div className="flex items-center gap-5 mt-2.5 text-xs" style={{ color: '#64748B' }}>
                <span className="flex items-center gap-1">
                  <Camera size={12} />
                  {entity.currentCamera}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {entity.currentZone}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  First seen {entity.firstSeen} · Last seen {entity.lastSeen}
                </span>
                <span className="flex items-center gap-1">
                  <Shield size={12} />
                  Active {entity.durationActive}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
              style={{ border: '1px solid #E2E8F0', color: '#64748B', background: '#fff' }}
            >
              Add Note
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#D99000' }}
            >
              Escalate
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#D64545' }}
            >
              Confirm Incident
            </button>
          </div>
        </div>
      </div>

      {/* Trajectory — most polished section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#17212B' }}>
            Trajectory
          </h2>
          <span className="text-xs" style={{ color: '#64748B' }}>
            {entity.trajectory.length} camera zones · {entity.durationActive}
          </span>
        </div>
        <TrajectoryTimeline />
      </div>

      {/* Two-column layout: Threats + Behaviour | Info + Activity */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* LEFT col */}
        <div>
          {/* Threat Score */}
          <div
            className="bg-white rounded-xl mb-5"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <div
              className="px-5 py-3.5 flex items-center gap-2"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <AlertTriangle size={14} style={{ color: '#D64545' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#17212B' }}>
                Threat Assessment
              </h2>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-6">
                <ThreatGauge score={entity.threatScore} />
                <div className="flex-1">
                  <div className="text-xs font-semibold mb-3" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
                    RISK FACTOR BREAKDOWN
                  </div>
                  {entity.riskFactors.map((f) => (
                    <div key={f.label} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm" style={{ color: '#17212B' }}>
                          {f.label}
                        </span>
                        <span
                          className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(214,69,69,0.08)', color: '#D64545' }}
                        >
                          +{f.score}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(f.score / 30) * 100}%`,
                            background:
                              f.score >= 20
                                ? '#D64545'
                                : f.score >= 12
                                  ? '#D99000'
                                  : '#2F6B4F',
                          }}
                        />
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#94A3B8', fontSize: 11 }}>
                        {f.description}
                      </div>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between pt-3 mt-2"
                    style={{ borderTop: '1px solid #F1F5F9' }}
                  >
                    <span className="text-sm font-semibold" style={{ color: '#17212B' }}>
                      Total Score
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: '#D64545', fontSize: 18 }}
                    >
                      {entity.threatScore}/100
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Behaviour */}
          <Section title="Behaviour & Intelligence Patterns">
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: '#F8FAFC', color: '#64748B' }}>
              Patterns compared to sector baseline. Anomalies do not constitute guilt — they indicate deviation from expected norms requiring further assessment.
            </div>
            <div className="space-y-3">
              {entity.behaviourPatterns.map((b) => (
                <div
                  key={b.metric}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ background: '#F8FAFC' }}
                >
                  <div
                    className="w-1.5 flex-shrink-0 self-stretch rounded-full mt-1"
                    style={{
                      background:
                        b.status === 'anomalous'
                          ? '#D64545'
                          : b.status === 'elevated'
                            ? '#D99000'
                            : '#94A3B8',
                      minHeight: 8,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium" style={{ color: '#17212B' }}>
                        {b.metric}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-xs font-semibold" style={{ color: '#17212B' }}>
                          {b.value}
                        </span>
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          vs {b.baseline}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748B', fontSize: 11 }}>
                      {b.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* RIGHT col */}
        <div>
          {/* Current Info */}
          <Section title="Entity Information">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: 'Entity ID', value: entity.id, mono: true },
                { label: 'Type', value: entity.label },
                { label: 'First Seen', value: entity.firstSeen, mono: true },
                { label: 'Last Seen', value: entity.lastSeen, mono: true },
                { label: 'Duration Active', value: entity.durationActive },
                { label: 'Height (est.)', value: entity.height },
                { label: 'Build', value: entity.build },
                { label: 'Clothing', value: entity.clothing },
                { label: 'Features', value: entity.distinctiveFeatures },
                { label: 'Current Location', value: `${entity.currentCamera} · ${entity.currentZone}` },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <div className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>{label}</div>
                  <div
                    className={`text-sm ${mono ? 'font-mono' : ''}`}
                    style={{ color: '#17212B' }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Activity History */}
          <Section title="Activity History">
            <div className="space-y-0">
              {entity.activityHistory.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2.5"
                  style={{ borderBottom: i < entity.activityHistory.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      background:
                        a.severity === 'high'
                          ? '#D64545'
                          : a.severity === 'medium'
                            ? '#D99000'
                            : '#2E7D32',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm" style={{ color: '#17212B' }}>{a.event}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{a.time}</span>
                      <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>·</span>
                      <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{a.camera}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Incidents */}
          <Section title="Incidents">
            <div className="space-y-2">
              {entity.incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: '#F8FAFC' }}
                >
                  <span
                    className="font-mono text-xs font-semibold"
                    style={{ color: '#2F6B4F' }}
                  >
                    {inc.id}
                  </span>
                  <span className="text-sm flex-1" style={{ color: '#17212B' }}>{inc.type}</span>
                  <SeverityBadge severity={inc.severity} showDot />
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: inc.status === 'Open' ? 'rgba(214,69,69,0.1)' : 'rgba(217,144,0,0.1)',
                      color: inc.status === 'Open' ? '#D64545' : '#D99000',
                    }}
                  >
                    {inc.status}
                  </span>
                  <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{inc.time}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Evidence — full width */}
      <div
        className="bg-white rounded-xl mb-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-2">
            <Lock size={14} style={{ color: '#2F6B4F' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#17212B' }}>
              Evidence
            </h2>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: '#F1F5F9', color: '#64748B' }}
            >
              SHA-256 verified
            </span>
          </div>
          <button className="flex items-center gap-1.5 text-xs" style={{ color: '#167D7F' }}>
            <Download size={12} /> Export all
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: '#F8FAFC' }}>
          {entity.evidence.map((ev) => (
            <div key={ev.id} className="px-5 py-3.5 flex items-center gap-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(47,107,79,0.08)' }}
              >
                <Eye size={14} style={{ color: '#2F6B4F' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-sm font-semibold" style={{ color: '#17212B' }}>
                    {ev.id}
                  </span>
                  <span className="text-xs" style={{ color: '#64748B' }}>
                    {ev.camera} · {ev.time} · {ev.duration} · {ev.format} · {ev.size}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 font-mono text-xs"
                  style={{ color: '#94A3B8' }}
                >
                  <Hash size={10} />
                  <span className="truncate" style={{ fontSize: 11 }}>{ev.hash}</span>
                </div>
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}
              >
                <Download size={11} /> Download
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Related Cameras */}
      <Section title="Related Cameras">
        <div className="flex flex-wrap gap-2">
          {entity.relatedCameras.map((cam) => (
            <span
              key={cam}
              className="font-mono text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'rgba(47,107,79,0.08)', color: '#2F6B4F', border: '1px solid rgba(47,107,79,0.15)' }}
            >
              {cam}
            </span>
          ))}
        </div>
      </Section>

      {/* Audit Trail */}
      <Section title="Operator Audit Trail">
        <div className="space-y-0">
          {entity.auditTrail.map((entry, i) => (
            <div
              key={i}
              className="flex items-start gap-4 py-2.5"
              style={{ borderBottom: i < entity.auditTrail.length - 1 ? '1px solid #F8FAFC' : 'none' }}
            >
              <span className="font-mono text-xs w-16 flex-shrink-0 mt-0.5" style={{ color: '#94A3B8' }}>
                {entry.time}
              </span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ background: entry.operator === 'System' ? '#94A3B8' : '#2F6B4F' }}
              >
                {entry.operator === 'System' ? '⚙' : entry.operator.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="text-sm" style={{ color: '#17212B' }}>{entry.action}</div>
                <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  {entry.operator} · {entry.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
