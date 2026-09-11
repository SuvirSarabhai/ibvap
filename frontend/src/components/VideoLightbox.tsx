/**
 * VideoLightbox — full-screen video preview modal for Live Monitoring.
 * Click any camera tile to open this. ESC or clicking outside closes it.
 */
import { useEffect } from 'react'
import { X, WifiOff, Wrench, Maximize2 } from 'lucide-react'

interface Camera {
  id: string
  name: string
  zone: string
  status: string
  severity: string
  lastEvent: string
  lastEventTime: string
}

interface Props {
  camera: Camera | null
  videoSrc: string | null
  onClose: () => void
}

const SEV_COLOR: Record<string, string> = {
  high: '#D64545',
  medium: '#D99000',
  normal: '#2E7D32',
}

export default function VideoLightbox({ camera, videoSrc, onClose }: Props) {
  // Close on ESC
  useEffect(() => {
    if (!camera) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [camera, onClose])

  if (!camera) return null

  const isOffline = camera.status === 'offline' || camera.status === 'maintenance'
  const sevColor = SEV_COLOR[camera.severity] ?? '#2E7D32'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="relative flex flex-col"
          style={{
            width: '100%',
            maxWidth: 960,
            maxHeight: '90vh',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#0f1923',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            animation: 'lbIn 0.18s ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`@keyframes lbIn { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }`}</style>

          {/* Header bar */}
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-3">
              {/* Live pulse */}
              {camera.status === 'online' && (
                <span
                  className="text-white font-bold px-2 py-0.5 rounded flex items-center gap-1.5"
                  style={{ background: '#D64545', fontSize: 10, letterSpacing: '0.06em' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#fff',
                      animation: 'pulse 1.2s ease-in-out infinite',
                      display: 'inline-block',
                    }}
                  />
                  LIVE
                </span>
              )}
              <div>
                <span className="font-mono font-bold text-sm" style={{ color: '#fff' }}>
                  {camera.id}
                </span>
                <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {camera.name} · {camera.zone}
                </span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${sevColor}22`, color: sevColor, border: `1px solid ${sevColor}44` }}
              >
                {camera.severity.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {camera.lastEvent} · {camera.lastEventTime}
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                <X size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
              </button>
            </div>
          </div>

          {/* Video */}
          <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 400, background: '#070d12' }}>
            {isOffline ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                {camera.status === 'maintenance'
                  ? <Wrench size={40} style={{ color: '#475569' }} />
                  : <WifiOff size={40} style={{ color: '#475569' }} />}
                <span className="text-sm font-medium" style={{ color: '#475569' }}>
                  {camera.status === 'maintenance' ? 'Camera under maintenance' : 'No signal — camera offline'}
                </span>
              </div>
            ) : videoSrc ? (
              <>
                <video
                  key={videoSrc}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  style={{
                    width: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
                {/* Degraded filter overlay */}
                {camera.status === 'degraded' && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'rgba(217,144,0,0.06)', mixBlendMode: 'overlay' }}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-20">
                <Maximize2 size={32} style={{ color: '#334155' }} />
                <span className="text-sm" style={{ color: '#475569' }}>No stream available</span>
              </div>
            )}

            {/* Corner overlay — camera ID watermark */}
            <div
              className="absolute top-3 right-3 font-mono text-xs px-2 py-1 rounded pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}
            >
              {camera.id}
            </div>
          </div>

          {/* Footer bar */}
          <div
            className="flex items-center gap-6 px-5 py-3 flex-shrink-0 text-xs"
            style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
          >
            <span>Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4, color: 'rgba(255,255,255,0.6)' }}>ESC</kbd> to close</span>
            <span>Click outside to dismiss</span>
            <span className="ml-auto">{camera.status.toUpperCase()}</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </>
  )
}
