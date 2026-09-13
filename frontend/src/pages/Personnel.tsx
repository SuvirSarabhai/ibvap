import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, Trash2, Upload, UserRound } from 'lucide-react'
import { createPersonnel, deactivateEmbedding, enrollPersonnel, getCameras, getPersonnel } from '../api/client'

type Embedding = { embedding_id: string; enrolled_at?: string; model_name?: string }
type Person = {
  person_id: string
  display_name: string
  active: boolean
  allowed_zones: string[]
  active_embedding_count: number
  active_embeddings: Embedding[]
}

const INPUT_STYLE = { border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#17212B', outline: 'none', background: '#fff', width: '100%' }

export default function Personnel() {
  const [people, setPeople] = useState<Person[]>([])
  const [zones, setZones] = useState<string[]>([])
  const [name, setName] = useState('')
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const refresh = () => getPersonnel().then((rows) => setPeople(rows as Person[])).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load personnel'))
  useEffect(() => {
    Promise.all([refresh(), getCameras()]).then(([, cameras]) => {
      const values = (cameras as any[]).flatMap((camera) => Array.isArray(camera.zones) ? camera.zones : [])
      setZones([...new Set(values.map(String))].sort())
    }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load personnel')).finally(() => setLoading(false))
  }, [])

  const activeCount = useMemo(() => people.filter((person) => person.active).length, [people])
  const addPerson = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setNotice(null)
    try { await createPersonnel({ display_name: name, allowed_zones: selectedZones }); setName(''); setSelectedZones([]); setNotice('Personnel record created'); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to create personnel') }
  }
  const enroll = async (personId: string, file: File) => {
    setError(null); setNotice(null)
    try { await enrollPersonnel(personId, file); setNotice('Face embedding enrolled'); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Enrollment failed') }
  }
  const remove = async (personId: string, embeddingId: string) => {
    if (!window.confirm('Deactivate this face embedding?')) return
    try { await deactivateEmbedding(personId, embeddingId); setNotice('Embedding removed'); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to remove embedding') }
  }

  return <div className="p-8">
    <div className="mb-6 flex items-start justify-between">
      <div><h1 className="text-xl font-semibold" style={{ color: '#17212B' }}>Personnel</h1><p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Manage authorized identities and restricted-zone access</p></div>
      <div className="text-right"><div className="text-2xl font-semibold" style={{ color: '#2F6B4F' }}>{activeCount}</div><div className="text-xs" style={{ color: '#94A3B8' }}>active records</div></div>
    </div>
    {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ color: '#D64545', background: 'rgba(214,69,69,0.08)', border: '1px solid rgba(214,69,69,0.2)' }}>{error}</div>}
    {notice && <div className="mb-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2" style={{ color: '#2E7D32', background: 'rgba(46,125,50,0.08)' }}><Check size={14} />{notice}</div>}
    <form onSubmit={addPerson} className="bg-white rounded-xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: '#17212B' }}>Add personnel</h2>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <label className="text-xs font-medium" style={{ color: '#64748B' }}>Display name<input required value={name} onChange={(e) => setName(e.target.value)} style={INPUT_STYLE} className="mt-1" placeholder="e.g. Jordan Lee" /></label>
        <label className="text-xs font-medium" style={{ color: '#64748B' }}>Allowed zones<select multiple value={selectedZones} onChange={(e) => setSelectedZones(Array.from(e.target.selectedOptions, (option) => option.value))} style={{ ...INPUT_STYLE, minHeight: 42 }} className="mt-1">{zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select></label>
        <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2F6B4F' }}><Plus size={14} />Add person</button>
      </div>
      <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Hold Ctrl/Cmd to select multiple zones.</p>
    </form>
    <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}><h2 className="text-sm font-semibold" style={{ color: '#17212B' }}>Authorized personnel</h2></div>
      {loading ? <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Loading personnel…</div> : people.length === 0 ? <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>No personnel records yet.</div> : people.map((person) => <div key={person.person_id} className="px-5 py-4" style={{ borderBottom: '1px solid #F8FAFC' }}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E8F1EC', color: '#2F6B4F' }}><UserRound size={16} /></div>
          <div className="flex-1 min-w-[180px]"><div className="font-medium text-sm" style={{ color: '#17212B' }}>{person.display_name}</div><div className="text-xs font-mono mt-0.5" style={{ color: '#94A3B8' }}>{person.person_id}</div></div>
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-[180px]">{person.allowed_zones.length ? person.allowed_zones.map((zone) => <span key={zone} className="text-xs px-2 py-1 rounded-full" style={{ color: '#2F6B4F', background: '#E8F1EC' }}>{zone}</span>) : <span className="text-xs" style={{ color: '#94A3B8' }}>No zone restrictions</span>}</div>
          <span className="text-xs px-2 py-1 rounded-full" style={{ color: person.active ? '#2E7D32' : '#64748B', background: person.active ? 'rgba(46,125,50,0.1)' : '#F1F5F9' }}>{person.active ? 'Active' : 'Inactive'}</span>
          <div className="text-sm text-right" style={{ color: '#17212B' }}><div className="font-semibold">{person.active_embedding_count}</div><div className="text-xs" style={{ color: '#94A3B8' }}>embeddings</div></div>
          <input ref={(node) => { fileInputs.current[person.person_id] = node }} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void enroll(person.person_id, file); e.currentTarget.value = '' }} />
          <button onClick={() => fileInputs.current[person.person_id]?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid #E2E8F0', color: '#2F6B4F' }}><Upload size={12} />Enroll</button>
        </div>
        {person.active_embeddings.length > 0 && <div className="ml-12 mt-3 flex flex-wrap gap-2">{person.active_embeddings.map((embedding) => <span key={embedding.embedding_id} className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-mono" style={{ color: '#64748B', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>{embedding.embedding_id.slice(0, 8)}<button aria-label="Remove embedding" onClick={() => void remove(person.person_id, embedding.embedding_id)} style={{ color: '#D64545' }}><Trash2 size={12} /></button></span>)}</div>}
      </div>)}
    </div>
  </div>
}
