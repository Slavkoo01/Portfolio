import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import AdminLayout from './AdminLayout.jsx'

/**
 * Real dashboard — pulls everything from /api/admin/dashboard (Phase 9), which
 * returns { counts, views, recent, github } in one call.
 */
export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    api.get('/api/admin/dashboard')
      .then((d) => { if (alive) setData(d) })
      .catch((e) => { if (alive) setError(e.message || 'Failed to load dashboard') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Welcome back! Here's an overview of your portfolio.</p>
      </div>

      {loading && <p className="text-white/40 font-mono text-sm">loading…</p>}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="3D Models" value={data.counts.models}
              sub={`${data.counts.models_published} published`} to="/admin/models" accent="violet" />
            <StatCard label="Projects" value={data.counts.projects}
              sub={`${data.counts.projects_published} published`} to="/admin/projects" accent="ice" />
          </div>

          {/* Recent lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RecentList title="Recent 3D Models" items={data.recent.models}
              render={(m) => m.title} sub={(m) => m.is_published ? 'published' : 'draft'} />
            <RecentList title="Recent Projects" items={data.recent.projects}
              render={(p) => p.title} sub={(p) => p.is_published ? 'published' : 'draft'} />
          </div>

          {/* GitHub status */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-semibold mb-3">GitHub</h3>
            <p className="text-sm text-white/60">
              {data.github.repositories} repositor{data.github.repositories === 1 ? 'y' : 'ies'} cached
              {data.github.last_sync && (
                <> · last sync: <span className="text-white/80">{data.github.last_sync.status}</span></>
              )}
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatCard({ label, value, sub, to, accent }) {
  const accents = {
    violet: 'from-neon-violet/20', ice: 'from-neon-ice/20',
    magenta: 'from-neon-magenta/20', amber: 'from-neon-amber/20',
  }
  const inner = (
    <div className={`glass rounded-2xl p-5 bg-gradient-to-br ${accents[accent]} to-transparent h-full`}>
      <div className="font-display text-3xl font-bold">{value ?? '—'}</div>
      <div className="text-sm text-white/70 mt-1">{label}</div>
      {sub && <div className="text-xs text-white/40 mt-2">{sub}</div>}
    </div>
  )
  return to ? <Link to={to} className="block hover:-translate-y-0.5 transition-transform">{inner}</Link> : inner
}

function RecentList({ title, items, render, sub }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-display font-semibold mb-4">{title}</h3>
      {(!items || items.length === 0) ? (
        <p className="text-sm text-white/30">Nothing yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between text-sm">
              <span className="text-white/80 truncate">{render(it)}</span>
              <span className="text-xs text-white/40 shrink-0 ml-3">{sub(it)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
