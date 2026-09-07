import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'
import AdminLayout from './AdminLayout.jsx'
import { useToast } from '../components/Toast.jsx'

/**
 * Manage the software list: add/rename/delete tools and upload a custom icon
 * for each (replacing reliance on an external CDN).
 */
export default function SoftwareList() {
  const toast = useToast()
  const [software, setSoftware] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/api/admin/software')
      .then((d) => setSoftware(d.software || []))
      .catch((e) => toast.error(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!newName.trim()) return
    try {
      await api.post('/api/admin/software', { name: newName.trim() })
      toast.success('Software added.')
      setNewName('')
      load()
    } catch (e) {
      toast.error(e.code === 'SOFTWARE_EXISTS' ? 'Already exists.' : (e.message || 'Failed'))
    }
  }

  async function remove(sw) {
    if (!confirm(`Delete ${sw.name}?`)) return
    try { await api.del(`/api/admin/software/${sw.id}`); toast.success('Deleted.'); load() }
    catch (e) { toast.error(e.message || 'Failed') }
  }

  async function uploadIcon(sw, file) {
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/api/admin/software/${sw.id}/icon`, fd, { isForm: true })
      toast.success('Icon updated.')
      load()
    } catch (e) {
      toast.error(e.message || 'Icon upload failed')
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Software</h1>
        <p className="text-white/50 text-sm mt-1">Tools you use, with custom icons. Pick these per model.</p>
      </div>

      {/* Add new */}
      <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-3">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add software (e.g. Marmoset Toolbag)"
          className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-neon-violet/50" />
        <button onClick={add}
          className="rounded-xl bg-gradient-to-r from-neon-violet to-neon-magenta px-5 py-2.5 text-sm font-medium">
          Add
        </button>
      </div>

      {loading ? (
        <p className="text-white/40 font-mono text-sm">loading…</p>
      ) : software.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-white/50">No software yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {software.map((sw) => (
            <div key={sw.id} className="glass rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                {sw.icon_url
                  ? <img src={sw.icon_url} alt={sw.name} className="w-8 h-8 object-contain" />
                  : <span className="text-xs text-white/40">{initials(sw.name)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{sw.name}</div>
                <div className="text-xs text-white/30 font-mono truncate">{sw.slug}</div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <label className="rounded-lg px-3 py-1 text-xs bg-white/[0.06] hover:bg-white/10 transition cursor-pointer text-center">
                  Icon
                  <input type="file" accept="image/*,.svg" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIcon(sw, f); e.target.value = '' }} />
                </label>
                <button onClick={() => remove(sw)}
                  className="rounded-lg px-3 py-1 text-xs bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

function initials(name) {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}
