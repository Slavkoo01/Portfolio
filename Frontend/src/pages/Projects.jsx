import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import Navbar from '../components/Navbar.jsx'

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

/** Shows one repository: metadata, file tree, and the selected file's content. */
function RepositoryView({ project }) {
  const [repo, setRepo] = useState(null)
  const [tree, setTree] = useState([])
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true); setError(''); setFile(null); setRepo(null); setTree([])

    const slug = project.slug
    Promise.all([
      api.get(`/api/projects/${slug}/repository`).catch(() => null),
      api.get(`/api/projects/${slug}/repository/tree`).catch(() => null),
    ])
      .then(([repoData, treeData]) => {
        if (!alive) return
        if (!repoData) { setError('This project has no cached repository yet.'); return }
        setRepo(repoData.repository || repoData)
        setTree(treeData?.tree || treeData?.items || [])
        // auto-open README if present
        const readme = findReadme(treeData?.tree || [])
        if (readme) openFile(slug, readme.path)
      })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [project.slug])

  async function openFile(slug, path) {
    try {
      const d = await api.get(`/api/projects/${slug}/repository/file/${path}`)
      setFile(d.file || d)
    } catch (e) {
      setFile({ path, content: null, error: e.message })
    }
  }

  if (loading) return <div className="glass rounded-2xl p-10 text-center text-white/40 font-mono text-sm">loading repository…</div>
  if (error) return <div className="glass rounded-2xl p-10 text-center text-white/40">{error}</div>

  return (
    <div className="space-y-5">
      {/* Metadata bar */}
      {repo && (
        <div className="glass rounded-2xl p-5 flex flex-wrap items-center gap-6">
          <div>
            <div className="font-display font-semibold text-lg">{repo.name || project.github_repo}</div>
            {repo.description && <div className="text-sm text-white/50">{repo.description}</div>}
          </div>
          <div className="flex items-center gap-5 text-sm text-white/60 ml-auto">
            {repo.language && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neon-ice" />{repo.language}</span>}
            {repo.stars != null && <span>★ {repo.stars}</span>}
            {repo.forks != null && <span>⑂ {repo.forks}</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
        {/* File tree */}
        <div className="glass rounded-2xl p-4 max-h-[500px] overflow-auto">
          <p className="text-xs text-white/40 mb-3 font-mono">FILES</p>
          {tree.length === 0 ? (
            <p className="text-sm text-white/30">No files cached.</p>
          ) : (
            <FileTree nodes={tree} onOpen={(path) => openFile(project.slug, path)} activePath={file?.path} />
          )}
        </div>

        {/* File content */}
        <div className="glass rounded-2xl p-5 max-h-[500px] overflow-auto">
          {!file ? (
            <p className="text-sm text-white/30">Select a file to view its contents.</p>
          ) : file.content == null ? (
            <div className="text-sm text-white/40">
              <p className="font-mono text-white/60 mb-2">{file.path}</p>
              {file.download_url
                ? <a href={file.download_url} target="_blank" rel="noreferrer" className="text-neon-ice hover:underline">Binary file — download</a>
                : <p>Cannot display this file.</p>}
            </div>
          ) : (
            <>
              <p className="font-mono text-xs text-white/50 mb-3 pb-3 border-b border-white/[0.06]">{file.path}</p>
              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap leading-relaxed">{file.content}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Recursive file tree renderer. */
function FileTree({ nodes, onOpen, activePath, depth = 0 }) {
  return (
    <ul className={depth > 0 ? 'ml-3' : ''}>
      {nodes.map((node) => (
        <li key={node.path}>
          {node.type === 'dir' ? (
            <details open={depth < 1}>
              <summary className="cursor-pointer text-sm text-white/60 hover:text-white/90 py-0.5 select-none">
                📁 {node.name}
              </summary>
              {node.children && <FileTree nodes={node.children} onOpen={onOpen} activePath={activePath} depth={depth + 1} />}
            </details>
          ) : (
            <button
              onClick={() => onOpen(node.path)}
              className={`block w-full text-left text-sm py-0.5 transition ${
                activePath === node.path ? 'text-neon-violet' : 'text-white/60 hover:text-white/90'
              }`}
            >
              📄 {node.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function findReadme(tree) {
  for (const node of tree) {
    if (node.type !== 'dir' && /^readme\.md$/i.test(node.name)) return node
  }
  return null
}
