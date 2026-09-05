import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { api } from '../lib/api.js'
import Navbar from '../components/Navbar.jsx'

/**
 * Public 3D Models gallery.
 * - Grid of thumbnails (from /api/models).
 * - Click a model → opens a detail view with a live 3D viewer (loads the GLB,
 *   applies the saved transform, plays animations), plus metadata.
 * - Optional category filter.
 */
export default function Models() {
  const [models, setModels] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const q = activeCat ? `?category=${activeCat}` : ''
    Promise.all([
      api.get(`/api/models${q}`).catch(() => ({ models: [] })),
      api.get('/api/models/categories').catch(() => ({ categories: [] })),
    ])
      .then(([m, c]) => {
        setModels(m.models || m.items || [])
        setCategories(c.categories || c.items || [])
      })
      .catch((e) => setError(e.message || 'Failed to load models'))
      .finally(() => setLoading(false))
  }, [activeCat])

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 pt-28 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon-violet mb-2">Gallery</p>
            <h1 className="font-display text-4xl font-bold">3D Models</h1>
            <p className="text-white/50 mt-2">Explore my 3D creations in an interactive viewer.</p>
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <FilterChip label="All" active={activeCat === ''} onClick={() => setActiveCat('')} />
              {categories.map((c) => (
                <FilterChip key={c.slug} label={c.name} active={activeCat === c.slug} onClick={() => setActiveCat(c.slug)} />
              ))}
            </div>
          )}

          {loading && <p className="text-white/40 font-mono text-sm">loading…</p>}
          {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>}

          {!loading && models.length === 0 && !error && (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-white/50">No models published yet.</p>
            </div>
          )}

          {/* Grid */}
          {models.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.map((m) => (
                <ModelCard key={m.id} model={m} onClick={() => setSelected(m)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail modal with 3D viewer */}
      {selected && <ModelDetail slug={selected.slug} onClose={() => setSelected(null)} />}
    </>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm transition ${
        active ? 'bg-neon-violet/15 text-white border border-neon-violet/30' : 'glass text-white/60 hover:text-white'
      }`}>
      {label}
    </button>
  )
}

/** Grid card: thumbnail + title. */
function ModelCard({ model, onClick }) {
  const thumb = (model.assets || []).find((a) => a.asset_type === 'THUMBNAIL')
  const url = thumb ? (thumb.url || (thumb.storage_key ? `/files/${thumb.storage_key}` : null)) : null
  return (
    <button onClick={onClick}
      className="group glass rounded-2xl overflow-hidden text-left hover:-translate-y-1 transition-transform">
      <div className="aspect-[4/3] bg-night-950 overflow-hidden flex items-center justify-center">
        {url
          ? <img src={url} alt={model.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <span className="text-white/15 text-5xl">⬡</span>}
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold">{model.title}</h3>
        {model.category && <p className="text-xs text-white/40 mt-1">{model.category.name}</p>}
      </div>
    </button>
  )
}

/** Detail modal: loads full model (with assets + transform), shows 3D viewer. */
function ModelDetail({ slug, onClose }) {
  const [model, setModel] = useState(null)
  const [error, setError] = useState('')
  const [activeClip, setActiveClip] = useState(null)
  const [clipNames, setClipNames] = useState([])

  useEffect(() => {
    api.get(`/api/models/${slug}`)
      .then((d) => setModel(d.model || d))
      .catch((e) => setError(e.message || 'Failed to load model'))
  }, [slug])

  const assets = model?.assets || []
  const glb = assets.find((a) => a.asset_type === 'MODEL' || /\.glb$/i.test(a.file_name || ''))
  const glbUrl = glb ? (glb.url || (glb.storage_key ? `/files/${glb.storage_key}` : null)) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[90vh] overflow-auto glass rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="font-display text-xl font-bold">{model?.title || 'Loading…'}</h2>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm bg-white/[0.06] hover:bg-white/10 transition">Close</button>
        </div>

        {error && <div className="p-6 text-red-300 text-sm">{error}</div>}

        {model && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 p-6">
            {/* 3D viewer */}
            <div>
              {glbUrl ? (
                <div className="aspect-video rounded-xl bg-night-950 overflow-hidden">
                  <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
                    <ambientLight intensity={0.7} />
                    <directionalLight position={[5, 8, 5]} intensity={1.3} />
                    <directionalLight position={[-5, 2, -5]} intensity={0.5} color="#8ab4ff" />
                    <Suspense fallback={null}>
                      <ViewerModel url={glbUrl} model={model} activeClip={activeClip} onClips={setClipNames} />
                    </Suspense>
                    <OrbitControls enablePan={false} autoRotate={!activeClip} autoRotateSpeed={1} />
                  </Canvas>
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-night-950 flex items-center justify-center text-white/30 text-sm">
                  No 3D model file uploaded.
                </div>
              )}

              {/* animation clips */}
              {clipNames.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {clipNames.map((name) => (
                    <button key={name} onClick={() => setActiveClip((c) => c === name ? null : name)}
                      className={`rounded-lg px-3 py-1.5 text-xs transition ${
                        activeClip === name ? 'bg-neon-violet/20 text-neon-violet border border-neon-violet/40' : 'glass text-white/60 hover:text-white'
                      }`}>
                      {activeClip === name ? '▶ ' : ''}{name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-5">
              {model.description && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-white/40 mb-2">Description</h4>
                  <p className="text-sm text-white/70 leading-relaxed">{model.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {model.polygon_count != null && <Stat label="Polygons" value={model.polygon_count.toLocaleString()} />}
                {model.vertex_count != null && <Stat label="Vertices" value={model.vertex_count.toLocaleString()} />}
                {model.category && <Stat label="Category" value={model.category.name} />}
              </div>

              {/* textures gallery */}
              {assets.filter((a) => a.asset_type === 'TEXTURE').length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-white/40 mb-2">Textures</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {assets.filter((a) => a.asset_type === 'TEXTURE').map((t) => {
                      const u = t.url || (t.storage_key ? `/files/${t.storage_key}` : null)
                      return u ? <img key={t.id} src={u} alt={t.file_name} className="aspect-square object-cover rounded-lg bg-night-950" /> : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <div className="text-xs text-white/40">{label}</div>
      <div className="font-display font-semibold mt-0.5">{value}</div>
    </div>
  )
}

/** Loads the GLB, applies saved transform, reports + plays animation clips. */
function ViewerModel({ url, model, activeClip, onClips }) {
  const group = useRef()
  const { scene, animations } = useGLTF(url)
  const cloned = useRef()
  if (!cloned.current) cloned.current = scene.clone(true)
  const { actions, names } = useAnimations(animations, group)

  const clipsKey = names.join('|')
  useEffect(() => { onClips?.(names); /* eslint-disable-next-line */ }, [clipsKey])

  // apply saved transform (position in units, rotation in degrees, scale)
  useEffect(() => {
    if (!group.current) return
    const d = (v) => (v * Math.PI) / 180
    group.current.position.set(model.position_x || 0, model.position_y || 0, model.position_z || 0)
    group.current.rotation.set(d(model.rotation_x || 0), d(model.rotation_y || 0), d(model.rotation_z || 0))
    const sx = model.scale_x || 1, sy = model.scale_y || 1, sz = model.scale_z || 1
    group.current.scale.set(sx, sy, sz)
  }, [model])

  useEffect(() => {
    if (activeClip && actions[activeClip]) {
      const a = actions[activeClip]
      a.reset().fadeIn(0.3).play()
      return () => { a.fadeOut(0.3) }
    }
  }, [activeClip, actions])

  return <group ref={group}><primitive object={cloned.current} /></group>
}
