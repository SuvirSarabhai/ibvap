import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ActivityLog from './pages/ActivityLog'
import EntityDetail from './pages/EntityDetail'
import LiveMonitoring from './pages/LiveMonitoring'
import Threats from './pages/Threats'
import Incidents from './pages/Incidents'
import CameraHealth from './pages/CameraHealth'
import EvidenceLibrary from './pages/EvidenceLibrary'
import Settings from './pages/Settings'
import Personnel from './pages/Personnel'

type Page = 'dashboard' | 'live' | 'activity' | 'threats' | 'incidents' | 'camera-health' | 'evidence' | 'personnel' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)

  const navigate = (p: string) => {
    setPage(p as Page)
    setSelectedEntity(null)
  }

  const selectEntity = (id: string) => {
    setSelectedEntity(id)
  }

  const renderPage = () => {
    if (selectedEntity) {
      return <EntityDetail entityId={selectedEntity} onBack={() => setSelectedEntity(null)} />
    }
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />
      case 'activity': return <ActivityLog onSelectEntity={selectEntity} />
      case 'live': return <LiveMonitoring />
      case 'threats': return <Threats />
      case 'incidents': return <Incidents />
      case 'camera-health': return <CameraHealth />
      case 'evidence': return <EvidenceLibrary />
      case 'personnel': return <Personnel />
      case 'settings': return <Settings />
      default: return <Dashboard onNavigate={navigate} />
    }
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#F4F7F5' }}>
      <Sidebar activePage={selectedEntity ? 'activity' : page} onNavigate={navigate} />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  )
}
