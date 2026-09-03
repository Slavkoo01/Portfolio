import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'
import AdminLayout from './AdminLayout.jsx'
import RepositoryView from '../components/RepositoryView.jsx'

/**
 * Projects management. Lists projects, lets you create/edit/delete, toggle
 * publish, and trigger a GitHub sync so the public repo view has fresh data.
 * Matches backend fields: title, slug, description, github_owner, github_repo,
 * github_url, is_featured, is_published.
 */
export default function ProjectsList() {
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [editing, setEditing] = useState(null) // project object or 'new' or null
  const [viewing, setViewing] = useState(null) // project whose code we're viewing

  const load = useCallback(() => {
    setLoading(true)
    api.get('/api/admin/projects')
      .then((d) => setProjects(d.projects || d.items || []))
      .catch((e) => setError(e.message || 'Failed to load projects'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function togglePublish(p) {
    setBusyId(p.id)
    try {
      await api.put(`/api/admin/projects/${p.id}`, { is_published: !p.is_published })
      load()
    } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.title}"?`)) return
    setBusyId(p.id)
    try { await api.del(`/api/admin/projects/${p.id}`); load() }
    catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  async function sync(p) {
    setBusyId(p.id)
    setError('')
    try {
      // 1) link the project → creates/ensures a cache row (idempotent)
      await api.post(`/api/admin/projects/${p.id}/github/link`)
      // 2) sync all linked repos (simplest reliable path)
      await api.post('/api/admin/github/sync')
      alert('Sync complete. The public Projects page will now show this repo.')
    } catch (e) {
      setError(e.message || 'Sync failed (see console).')
    } finally { setBusyId(null) }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Projects</h1>
          <p className="text-white/50 text-sm mt-1">Manage GitHub-linked projects.</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="rounded-full bg-gradient-to-r from-neon-violet to-neon-magenta px-5 py-2.5 text-sm font-medium shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition"
        >
          + Add Project
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-4">{error}</div>}
      {loading && <p className="text-white/40 font-mono text-sm">loading…</p>}

      {!loading && projects.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center"><p className="text-white/50">No projects yet.</p></div>
      )}

      {projects.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-white/40">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Repository</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.03] last:border-0">
                  <td className="px-5 py-3 text-white/90">{p.title}</td>
                  <td className="px-5 py-3 text-white/40 font-mono text-xs">
                    {p.github_owner ? `${p.github_owner}/${p.github_repo}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => togglePublish(p)} disabled={busyId === p.id}
                      className={`rounded-full px-3 py-1 text-xs transition ${p.is_published ? 'bg-green-500/15 text-green-300' : 'bg-white/[0.06] text-white/50'}`}>
                      {p.is_published ? 'published' : 'draft'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.github_owner && (
                        <button onClick={() => setViewing(p)}
                          className="rounded-lg px-3 py-1.5 text-xs bg-neon-violet/10 text-neon-violet hover:bg-neon-violet/20 transition">
                          Code
                        </button>
                      )}
                      {p.github_owner && (
                        <button onClick={() => sync(p)} disabled={busyId === p.id}
                          className="rounded-lg px-3 py-1.5 text-xs bg-neon-ice/10 text-neon-ice hover:bg-neon-ice/20 transition">
                          Sync
                        </button>
                      )}
                      <button onClick={() => setEditing(p)}
                        className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/10 transition">Edit</button>
                      <button onClick={() => remove(p)} disabled={busyId === p.id}
                        className="rounded-lg px-3 py-1.5 text-xs bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProjectEditor
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{viewing.title} — code</h2>
              <button onClick={() => setViewing(null)} className="rounded-lg px-4 py-2 text-sm bg-white/[0.06] hover:bg-white/10 transition">Close</button>
            </div>
            <RepositoryView project={viewing} />
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function ProjectEditor({ project, onClose, onSaved }) {
  const isEdit = !!project
  const [form, setForm] = useState({
    title: project?.title || '', description: project?.description || '',
    github_owner: project?.github_owner || 'Slavkoo01', github_repo: project?.github_repo || '',
    is_published: project?.is_published || false, is_featured: project?.is_featured || false,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function save() {
    setError(''); setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        github_owner: form.github_owner.trim() || null,
        github_repo: form.github_repo.trim() || null,
        is_published: form.is_published, is_featured: form.is_featured,
      }
      if (isEdit) await api.put(`/api/admin/projects/${project.id}`, payload)
      else await api.post('/api/admin/projects', payload)
      onSaved()
    } catch (e) {
      setError(e.code === 'SLUG_TAKEN' ? 'Slug already taken.' : (e.message || 'Save failed'))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold mb-5">{isEdit ? 'Edit Project' : 'New Project'}</h2>
        {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300 mb-4">{error}</div>}
        <div className="space-y-4">
          <input className="pinput" placeholder="Title" value={form.title} onChange={(e) => up('title', e.target.value)} />
          <textarea className="pinput resize-none" rows={3} placeholder="Description" value={form.description} onChange={(e) => up('description', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="pinput font-mono" placeholder="github owner" value={form.github_owner} onChange={(e) => up('github_owner', e.target.value)} />
            <input className="pinput font-mono" placeholder="repo name" value={form.github_repo} onChange={(e) => up('github_repo', e.target.value)} />
          </div>
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={form.is_published} onChange={(e) => up('is_published', e.target.checked)} /> Published
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => up('is_featured', e.target.checked)} /> Featured
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm bg-white/[0.06] hover:bg-white/10 transition">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm bg-gradient-to-r from-neon-violet to-neon-magenta font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <style>{`.pinput{width:100%;border-radius:0.75rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);padding:0.6rem 0.9rem;font-size:0.875rem;outline:none;color:white}.pinput:focus{border-color:rgba(198,92,255,0.5)}`}</style>
      </div>
    </div>
  )
}
