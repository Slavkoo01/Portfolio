import { useState, useEffect, useRef, useCallback } from 'react'
import hljs from 'highlight.js/lib/common'
import 'highlight.js/styles/github-dark.css'
import { api } from '../lib/api.js'

/**
 * Shows one repository from the cache: metadata + collapsible file tree +
 * syntax-highlighted file content. Used by both the public Projects page and
 * the admin Projects table.
 */
export default function RepositoryView({ project, admin = false }) {
  // admin reads hit /api/admin/projects/... which also return DRAFT projects;
  // public reads hit /api/projects/... (published only).
  const base = admin ? '/api/admin/projects' : '/api/projects'
  const [repo, setRepo] = useState(null)
  const [tree, setTree] = useState([])
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [openDirs, setOpenDirs] = useState(() => new Set())

  useEffect(() => {
    let alive = true
    setLoading(true); setError(''); setFile(null); setRepo(null); setTree([])

    const slug = project.slug
    Promise.all([
      api.get(`${base}/${slug}/repository`).catch(() => null),
      api.get(`${base}/${slug}/repository/tree`).catch(() => null),
    ])
      .then(([repoData, treeData]) => {
        if (!alive) return
        if (!repoData) { setError('This project has no cached repository yet.'); return }
        setRepo(repoData.repository || repoData)
        const t = treeData?.tree || treeData?.items || []
        setTree(t)
        // start fully collapsed
        setOpenDirs(new Set())
        const readme = findReadme(t)
        if (readme) openFile(slug, readme.path)
      })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [project.slug])

  const openFile = useCallback(async (slug, path) => {
    try {
      const d = await api.get(`${base}/${slug}/repository/file/${path}`)
      setFile(d.file || d)
    } catch (e) {
      setFile({ path, content: null, error: e.message })
    }
  }, [])

  const toggleDir = useCallback((path) => {
    setOpenDirs((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }, [])

  const collapseAll = useCallback(() => setOpenDirs(new Set()), [])
  const expandAll = useCallback(() => {
    const all = new Set()
    const walk = (nodes) => nodes.forEach((n) => {
      if (n.type === 'dir') { all.add(n.path); if (n.children) walk(n.children) }
    })
    walk(tree)
    setOpenDirs(all)
  }, [tree])

  if (loading) return <div className="glass rounded-2xl p-10 text-center text-white/40 font-mono text-sm">loading repository…</div>
  if (error) return (
    <div className="glass rounded-2xl p-10 text-center">
      <p className="text-white/50 mb-2">{error}</p>
      <p className="text-white/30 text-sm">Sync this project (Projects → Sync) to cache its code here.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {repo && (
        <div className="glass rounded-2xl p-5 flex flex-wrap items-center gap-6">
          <div>
            <div className="font-display font-semibold text-lg">{repo.name || project.github_repo}</div>
            {repo.description && <div className="text-sm text-white/50 break-words">{repo.description}</div>}
          </div>
          <div className="flex items-center gap-5 text-sm text-white/60 ml-auto">
            {repo.language && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neon-ice" />{repo.language}</span>}
            {repo.stars != null && <span>★ {repo.stars}</span>}
            {repo.forks != null && <span>⑂ {repo.forks}</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
        {/* File tree — fixed height, scrolls inside */}
        <div className="glass rounded-2xl p-4 h-[65vh] min-h-[380px] max-h-[680px] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 font-mono">FILES</p>
            <div className="flex gap-1">
              <button onClick={collapseAll} title="Collapse all"
                className="rounded px-2 py-0.5 text-[10px] bg-white/[0.06] text-white/50 hover:bg-white/10 transition">collapse</button>
              <button onClick={expandAll} title="Expand all"
                className="rounded px-2 py-0.5 text-[10px] bg-white/[0.06] text-white/50 hover:bg-white/10 transition">expand</button>
            </div>
          </div>
          {tree.length === 0 ? (
            <p className="text-sm text-white/30">No files cached.</p>
          ) : (
            <FileTree nodes={tree} onOpen={(path) => openFile(project.slug, path)}
              activePath={file?.path} openDirs={openDirs} onToggle={toggleDir} />
          )}
        </div>

        {/* File content — fixed height; header stays, code scrolls */}
        <div className="glass rounded-2xl h-[65vh] min-h-[380px] max-h-[680px] flex flex-col overflow-hidden">
          {!file ? (
            <div className="p-5 text-sm text-white/30">Select a file to view its contents.</div>
          ) : file.content == null ? (
            <div className="p-5 text-sm text-white/40">
              <p className="font-mono text-white/60 mb-2">{file.path}</p>
              {(() => {
                const isText = /\.(md|txt|rst|py|js|jsx|ts|tsx|json|ya?ml|toml|ini|cfg|xml|html?|css|scss|c|cpp|h|hpp|cs|java|go|rs|rb|php|sh|sql|kt|swift|lock|gitignore|env)$/i.test(file.file_name || file.path || '')
                const label = isText ? 'File too large to preview' : 'Binary file'
                return file.download_url
                  ? <p>{label} — <a href={file.download_url} target="_blank" rel="noreferrer" className="text-neon-ice hover:underline">download</a></p>
                  : <p>{label} (not cached).</p>
              })()}
            </div>
          ) : (
            <>
              <p className="font-mono text-xs text-white/50 px-5 pt-5 pb-3 border-b border-white/[0.06] shrink-0">{file.path}</p>
              <div className="flex-1 overflow-auto p-5">
                <CodeView path={file.path} content={file.content} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description below the code window */}
      {project.description && (
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold mb-2">About this project</h3>
          <p className="text-sm text-white/60 leading-relaxed break-words">{project.description}</p>
        </div>
      )}
    </div>
  )
}

/** Controlled recursive tree — folder open state lives in `openDirs`. */
function FileTree({ nodes, onOpen, activePath, openDirs, onToggle, depth = 0 }) {
  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return (
    <ul className={depth > 0 ? 'ml-3' : ''}>
      {sorted.map((node) => (
        <li key={node.path}>
          {node.type === 'dir' ? (
            <>
              <button onClick={() => onToggle(node.path)}
                className="flex items-center gap-1 w-full text-left text-sm text-white/60 hover:text-white/90 py-0.5 select-none">
                <span className="text-[10px] w-3 inline-block">{openDirs.has(node.path) ? '▼' : '▶'}</span>
                <span>📁 {node.name}</span>
              </button>
              {openDirs.has(node.path) && node.children && (
                <FileTree nodes={node.children} onOpen={onOpen} activePath={activePath}
                  openDirs={openDirs} onToggle={onToggle} depth={depth + 1} />
              )}
            </>
          ) : (
            <button onClick={() => onOpen(node.path)}
              className={`flex items-center gap-1 w-full text-left text-sm py-0.5 transition ${
                activePath === node.path ? 'text-neon-violet' : 'text-white/60 hover:text-white/90'
              }`}>
              <span className="w-3 inline-block" />
              <span>📄 {node.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Syntax-highlighted code with line numbers. */
function CodeView({ path, content }) {
  const ref = useRef(null)
  const ext = (path.split('.').pop() || '').toLowerCase()
  const langMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', c: 'c',
    cpp: 'cpp', cs: 'csharp', php: 'php', html: 'xml', css: 'css',
    json: 'json', yml: 'yaml', yaml: 'yaml', sh: 'bash', md: 'markdown',
    sql: 'sql', kt: 'kotlin', swift: 'swift',
  }
  const lang = langMap[ext]

  useEffect(() => {
    if (!ref.current) return
    try {
      const result = lang && hljs.getLanguage(lang)
        ? hljs.highlight(content, { language: lang })
        : hljs.highlightAuto(content)
      ref.current.innerHTML = result.value
    } catch {
      ref.current.textContent = content
    }
  }, [content, lang])

  const lineCount = content.split('\n').length
  return (
    <div className="flex text-xs font-mono leading-relaxed overflow-auto">
      <div className="select-none text-right pr-4 text-white/20 shrink-0">
        {Array.from({ length: lineCount }).map((_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <pre className="flex-1 min-w-0"><code ref={ref} className="hljs-code whitespace-pre">{content}</code></pre>
    </div>
  )
}

function findReadme(tree) {
  for (const node of tree) {
    if (node.type !== 'dir' && /^readme\.md$/i.test(node.name)) return node
  }
  return null
}
