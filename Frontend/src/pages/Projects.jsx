import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import Navbar from '../components/Navbar.jsx'
import RepositoryView from '../components/RepositoryView.jsx'

/**
 * Public Projects page — lists projects and shows the cached GitHub repository
 * for the selected one (metadata + file tree + file contents). Everything comes
 * from the Postgres cache (Phase 7); the browser never calls GitHub directly.
 */
export default function Projects() {
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/projects')
      .then((d) => {
        const list = d.projects || d.items || []
        setProjects(list)
        if (list.length > 0) setSelected(list[0])
      })
      .catch((e) => setError(e.message || 'Failed to load projects'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 pt-28 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon-violet mb-2">GitHub</p>
            <h1 className="font-display text-4xl font-bold">Projects</h1>
            <p className="text-white/50 mt-2">Here are some of my GitHub repositories.</p>
          </div>

          {loading && <p className="text-white/40 font-mono text-sm">loading…</p>}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && projects.length === 0 && !error && (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-white/50">No published projects yet.</p>
            </div>
          )}

          {projects.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
              {/* Project list */}
              <div className="space-y-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`w-full text-left glass rounded-xl p-4 transition ${
                      selected?.id === p.id ? 'border-neon-violet/40 bg-neon-violet/[0.08]' : 'hover:bg-white/[0.05]'
                    }`}
                  >
                    <h3 className="font-display font-semibold">{p.title}</h3>
                    {p.description && <p className="text-sm text-white/50 mt-1 line-clamp-2">{p.description}</p>}
                    {p.github_owner && (
                      <p className="font-mono text-xs text-white/30 mt-2">
                        {p.github_owner}/{p.github_repo}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Repository detail */}
              <div>
                {selected ? (
                  <RepositoryView project={selected} />
                ) : (
                  <div className="glass rounded-2xl p-10 text-center text-white/40">
                    Select a project.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
