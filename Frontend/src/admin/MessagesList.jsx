import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'
import AdminLayout from './AdminLayout.jsx'

/**
 * Contact messages inbox. Lists messages, opening one marks it read (backend
 * does that on GET /:id), and you can change status or delete.
 * Fields: id, name, email, subject, message, status, created_at, read_at, replied_at.
 */
export default function MessagesList() {
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    const q = filter ? `?status=${filter}` : ''
    api.get(`/api/admin/messages${q}`)
      .then((d) => setMessages(d.messages || d.items || []))
      .catch((e) => setError(e.message || 'Failed to load messages'))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  async function open(m) {
    try {
      const d = await api.get(`/api/admin/messages/${m.id}`)
      setSelected(d.message || d)
      load() // refresh list (status may have changed to READ)
    } catch (e) { setError(e.message) }
  }

  async function setStatus(m, status) {
    try {
      await api.patch(`/api/admin/messages/${m.id}`, { status })
      if (selected?.id === m.id) setSelected({ ...selected, status })
      load()
    } catch (e) { setError(e.message) }
  }

  async function remove(m) {
    if (!confirm('Delete this message permanently?')) return
    try {
      await api.del(`/api/admin/messages/${m.id}`)
      if (selected?.id === m.id) setSelected(null)
      load()
    } catch (e) { setError(e.message) }
  }

  const filters = ['', 'UNREAD', 'READ', 'REPLIED', 'ARCHIVED']

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Messages</h1>
        <p className="text-white/50 text-sm mt-1">Contact form submissions.</p>
      </div>

      {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-4">{error}</div>}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {filters.map((f) => (
          <button key={f || 'all'} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs transition ${filter === f ? 'bg-neon-violet/15 text-white border border-neon-violet/30' : 'bg-white/[0.04] text-white/50 hover:text-white'}`}>
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading && <p className="text-white/40 font-mono text-sm">loading…</p>}
      {!loading && messages.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center"><p className="text-white/50">No messages.</p></div>
      )}

      {messages.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          {/* list */}
          <div className="space-y-2 max-h-[600px] overflow-auto">
            {messages.map((m) => (
              <button key={m.id} onClick={() => open(m)}
                className={`w-full text-left glass rounded-xl p-4 transition ${selected?.id === m.id ? 'border-neon-violet/40 bg-neon-violet/[0.08]' : 'hover:bg-white/[0.05]'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/90">{m.name}</span>
                  <StatusBadge status={m.status} />
                </div>
                {m.subject && <div className="text-sm text-white/60 mt-1 truncate">{m.subject}</div>}
                <div className="text-xs text-white/30 mt-1">{m.email}</div>
              </button>
            ))}
          </div>

          {/* detail */}
          <div>
            {!selected ? (
              <div className="glass rounded-2xl p-10 text-center text-white/40">Select a message to read.</div>
            ) : (
              <div className="glass rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{selected.subject || '(no subject)'}</h3>
                    <p className="text-sm text-white/50 mt-1">
                      {selected.name} · <a href={`mailto:${selected.email}`} className="text-neon-ice hover:underline">{selected.email}</a>
                    </p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed border-t border-white/[0.06] pt-4">
                  {selected.message}
                </p>
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/[0.06]">
                  <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || '')}`}
                     className="rounded-lg px-4 py-2 text-sm bg-gradient-to-r from-neon-violet to-neon-magenta font-medium">Reply</a>
                  <button onClick={() => setStatus(selected, 'REPLIED')} className="rounded-lg px-4 py-2 text-sm bg-white/[0.06] hover:bg-white/10 transition">Mark replied</button>
                  <button onClick={() => setStatus(selected, 'ARCHIVED')} className="rounded-lg px-4 py-2 text-sm bg-white/[0.06] hover:bg-white/10 transition">Archive</button>
                  <button onClick={() => remove(selected)} className="rounded-lg px-4 py-2 text-sm bg-red-500/10 text-red-300 hover:bg-red-500/20 transition ml-auto">Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatusBadge({ status }) {
  const map = {
    UNREAD: 'bg-neon-violet/20 text-neon-violet',
    READ: 'bg-white/[0.08] text-white/50',
    REPLIED: 'bg-green-500/15 text-green-300',
    ARCHIVED: 'bg-white/[0.04] text-white/30',
  }
  return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium shrink-0 ${map[status] || map.READ}`}>{(status || '').toLowerCase()}</span>
}
