import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import AdminLayout from './AdminLayout.jsx'

/**
 * 3D Models management — list all models with quick publish/unpublish and
 * delete, plus a link to create or edit. Data comes from /api/admin/models.
 */
export default function ModelsList() {
  const [models, setModels] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/api/admin/models')
      .then((d) => setModels(d.models || d.items || []))
      .catch((e) => setError(e.message || 'Failed to load models'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function togglePublish(m) {
    setBusyId(m.id)
    try {
      await api.put(`/api/admin/models/${m.id}`, { is_published: !m.is_published })
      load()
    } catch (e) {
      setError(e.message || 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(m) {
    if (!confirm(`Delete "${m.title}"? This can be undone from the backend (soft delete).`)) return
    setBusyId(m.id)
    try {
      await api.del(`/api/admin/models/${m.id}`)
      load()
    } catch (e) {
      setError(e.message || 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">3D Models</h1>
          <p className="text-white/50 text-sm mt-1">Manage your 3D model catalog.</p>
        </div>
        <Link
          to="/admin/models/new"
          className="rounded-full bg-gradient-to-r from-neon-violet to-neon-magenta px-5 py-2.5 text-sm font-medium shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition"
        >
          + Add Model
        </Link>
      </div>

      {loading && <p className="text-white/40 font-mono text-sm">loading…</p>}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {!loading && models.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-white/50">No models yet. Add your first one.</p>
        </div>
      )}

      {models.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-white/40">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Slug</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b border-white/[0.03] last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ModelThumb model={m} />
                      <span className="text-white/90">{m.title}</span>
                    </div>
                    {m.is_featured && <span className="ml-2 text-xs text-neon-amber">★ featured</span>}
                  </td>
                  <td className="px-5 py-3 text-white/40 font-mono text-xs">{m.slug}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => togglePublish(m)}
                      disabled={busyId === m.id}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        m.is_published
                          ? 'bg-green-500/15 text-green-300 hover:bg-green-500/25'
                          : 'bg-white/[0.06] text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {m.is_published ? 'published' : 'draft'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/models/${m.id}`}
                        className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/10 transition"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => remove(m)}
                        disabled={busyId === m.id}
                        className="rounded-lg px-3 py-1.5 text-xs bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}

/** Small thumbnail for the list row. */
function ModelThumb({ model }) {
  const thumb = (model.assets || []).find((a) => a.asset_type === 'THUMBNAIL')
  const url = thumb ? (thumb.url || (thumb.storage_key ? `/files/${thumb.storage_key}` : null)) : null
  return (
    <div className="w-32 h-32 rounded-xl bg-night-950 border border-white/[0.06] overflow-hidden flex items-center justify-center shrink-0">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span className="text-white/20 text-3xl">⬡</span>}
    </div>
  )
}
