import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { api } from '../lib/api.js'
import Navbar from '../components/Navbar.jsx'

/**
 * 3D Models — showroom layout:
 *  - category sidebar (left)
 *  - big interactive 3D viewer (centre) for the selected model
 *  - detail panel (right): title, tags, description, specs
 *  - thumbnail strip (below): every model; click swaps the main viewer
 *  - description + software-used (bottom)
 */
export default function Models() {
  const [models, setModels] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState('')
  const [selectedSlug, setSelectedSlug] = useState(null)
  const [loading, setLoading] = useState(true)

  // load models (filtered by category) + categories
  useEffect(() => {
    setLoading(true)
    const q = activeCat ? `?category=${activeCat}` : ''
    Promise.all([
      api.get(`/api/models${q}`).catch(() => ({ models: [] })),
      api.get('/api/models/categories').catch(() => ({ categories: [] })),
    ]).then(([m, c]) => {
      const list = m.models || m.items || []
      setModels(list)
      setCategories(c.categories || c.items || [])
      setSelectedSlug(list[0]?.slug || null)
    }).finally(() => setLoading(false))
  }, [activeCat])

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 pt-28 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold">3D Models</h1>
            <p className="text-white/50 mt-2">Explore my 3D creations in an interactive viewer.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr] gap-6">
            {/* Category sidebar — horizontal chips on mobile, vertical on desktop */}
            <aside className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CatItem label="All Models" active={activeCat === ''} onClick={() => setActiveCat('')} />
              {categories.map((c) => (
                <CatItem key={c.slug} label={c.name} active={activeCat === c.slug} onClick={() => setActiveCat(c.slug)} />
              ))}
            </aside>

            {/* Main showroom */}
            <div>
              {loading ? (
                <p className="text-white/40 font-mono text-sm">loading…</p>
              ) : models.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center text-white/50">No models published yet.</div>
              ) : (
                <Showroom
                  slug={selectedSlug}
                  models={models}
                  onSelect={setSelectedSlug}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

function CatItem({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 lg:w-full text-left whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition ${
        active ? 'bg-neon-violet/15 text-white border border-neon-violet/30' : 'text-white/55 hover:text-white hover:bg-white/[0.04] border border-transparent'
      }`}>
      {label}
    </button>
  )
}

/** The selected-model showroom: viewer + details + thumbnail strip + bottom. */
function Showroom({ slug, models, onSelect }) {
  const [model, setModel] = useState(null)
  const [activeClip, setActiveClip] = useState(null)
  const [clipNames, setClipNames] = useState([])

  useEffect(() => {
    if (!slug) return
    setModel(null); setActiveClip(null); setClipNames([])
    api.get(`/api/models/${slug}`).then((d) => setModel(d.model || d)).catch(() => {})
  }, [slug])

  const assets = model?.assets || []
  const glb = assets.find((a) => a.asset_type === 'MODEL' || /\.glb$/i.test(a.file_name || ''))
  const glbUrl = glb ? assetUrl(glb) : null
  const tags = Array.isArray(model?.tags) ? model.tags : []

  return (
    <div className="space-y-6">
      {/* viewer + details */}
      <div className="glass rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_300px]">
        {/* 3D viewer */}
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[440px] bg-gradient-to-b from-night-900 to-night-950">
          {glbUrl ? (
            <Canvas camera={{ position: [0, 0.5, 5], fov: 45 }} dpr={[1, 2]}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[5, 8, 5]} intensity={1.4} />
              <directionalLight position={[-5, 2, -5]} intensity={0.5} color="#8ab4ff" />
              <Suspense fallback={null}>
                {model && <PosedModel url={glbUrl} model={model} activeClip={activeClip} onClips={setClipNames} />}
              </Suspense>
              <OrbitControls enablePan={false} autoRotate={!activeClip} autoRotateSpeed={1.2} minDistance={2} maxDistance={12} />
            </Canvas>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/25 text-sm">
              {model ? 'No 3D model file uploaded.' : 'loading…'}
            </div>
          )}

          {/* animation clip buttons (bottom-left overlay) */}
          {clipNames.length > 0 && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
              {clipNames.map((name) => (
                <button key={name} onClick={() => setActiveClip((c) => c === name ? null : name)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition backdrop-blur ${
                    activeClip === name ? 'bg-neon-violet/30 text-white border border-neon-violet/50' : 'bg-black/40 text-white/70 hover:bg-black/60'
                  }`}>
                  {activeClip === name ? '▶ ' : ''}{name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="p-6 border-t lg:border-t-0 lg:border-l border-white/[0.06]">
          {model ? (
            <>
              <h2 className="font-display text-2xl font-bold">{model.title}</h2>
              {tags.length > 0 && (
                <p className="text-sm text-white/40 mt-1 break-words">{tags.join(', ')}</p>
              )}
              {model.description && (
                <p className="text-sm text-white/70 leading-relaxed mt-4 break-words">{model.description}</p>
              )}
              <ul className="mt-5 space-y-2 text-sm">
                {model.polygon_count != null && <Spec label="Triangles" value={model.polygon_count.toLocaleString()} />}
                {model.vertex_count != null && <Spec label="Vertices" value={model.vertex_count.toLocaleString()} />}
                {model.texture_info && <Spec label="Textures" value={model.texture_info} />}
                <Spec label="Rigged" value={model.is_rigged ? 'Yes' : 'No'} />
                {model.category && <Spec label="Category" value={model.category.name} />}
              </ul>
            </>
          ) : (
            <p className="text-white/30 text-sm font-mono">loading…</p>
          )}
        </div>
      </div>

      {/* Thumbnail strip — every model */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {models.map((m) => (
          <ThumbButton key={m.id} model={m} active={m.slug === slug} onClick={() => onSelect(m.slug)} />
        ))}
      </div>

      {/* Renders gallery (if any) */}
      {(() => {
        const renders = assets.filter((a) => a.asset_type === 'RENDER')
        return renders.length > 0 ? (
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-semibold mb-4">Renders</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {renders.map((r) => {
                const u = assetUrl(r)
                return u ? (
                  <a key={r.id} href={u} target="_blank" rel="noreferrer"
                    className="aspect-[4/3] rounded-xl overflow-hidden bg-night-950 hover:opacity-90 transition">
                    <img src={u} alt={r.file_name} className="w-full h-full object-cover" />
                  </a>
                ) : null
              })}
            </div>
          </div>
        ) : null
      })()}

      {/* Bottom: description + software */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold mb-3">Description</h3>
          <p className="text-sm text-white/60 leading-relaxed break-words">
            {model?.description || 'No description provided.'}
          </p>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold mb-3">Software Used</h3>
          {model?.software?.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {model.software.map((sw) => (
                <div key={sw.id} title={sw.name}
                  className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden p-2">
                  {sw.icon_url
                    ? <img src={sw.icon_url} alt={sw.name} className="max-w-full max-h-full object-contain" />
                    : <span className="text-xs font-semibold text-neon-violet/80">{swInitials(sw.name)}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30">No software listed.</p>
          )}
        </div>
      </div>

      {/* Textures (if any) */}
      {(() => {
        const textures = assets.filter((a) => a.asset_type === 'TEXTURE')
        return textures.length > 0 ? (
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-semibold mb-4">Textures</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {textures.map((t) => {
                const u = assetUrl(t)
                return u ? (
                  <a key={t.id} href={u} target="_blank" rel="noreferrer"
                    className="aspect-square rounded-lg overflow-hidden bg-night-950 hover:opacity-90 transition">
                    <img src={u} alt={t.file_name} className="w-full h-full object-cover" />
                  </a>
                ) : null
              })}
            </div>
          </div>
        ) : null
      })()}
    </div>
  )
}

function swInitials(name) {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function Spec({ label, value }) {
  return (
    <li className="flex items-center gap-2 text-white/70">
      <span className="text-neon-violet">•</span>
      <span className="text-white/50">{label}:</span>
      <span className="text-white/90">{value}</span>
    </li>
  )
}

function ThumbButton({ model, active, onClick }) {
  const thumb = (model.assets || []).find((a) => a.asset_type === 'THUMBNAIL')
  const url = thumb ? assetUrl(thumb) : null
  return (
    <button onClick={onClick}
      className={`shrink-0 w-32 h-24 rounded-xl overflow-hidden border-2 transition ${
        active ? 'border-neon-violet' : 'border-transparent hover:border-white/20'
      }`}>
      <div className="w-full h-full bg-night-950 flex items-center justify-center">
        {url ? <img src={url} alt={model.title} className="w-full h-full object-cover" /> : <span className="text-white/15 text-2xl">⬡</span>}
      </div>
    </button>
  )
}

/** GLB with saved transform + animation clips. */
function PosedModel({ url, model, activeClip, onClips }) {
  const group = useRef()
  const { scene, animations } = useGLTF(url)
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions, names } = useAnimations(animations, cloned)

  const clipsKey = names.join('|')
  useEffect(() => { onClips?.(names); /* eslint-disable-next-line */ }, [clipsKey])

  useEffect(() => {
    if (!group.current) return
    const d = (v) => (v * Math.PI) / 180
    group.current.position.set(model.position_x || 0, model.position_y || 0, model.position_z || 0)
    group.current.rotation.set(d(model.rotation_x || 0), d(model.rotation_y || 0), d(model.rotation_z || 0))
    group.current.scale.set(model.scale_x || 1, model.scale_y || 1, model.scale_z || 1)
  }, [model, url])

  useEffect(() => {
    if (activeClip && actions[activeClip]) {
      const a = actions[activeClip]
      a.reset().fadeIn(0.3).play()
      return () => { a.fadeOut(0.3) }
    }
  }, [activeClip, actions])

  return <group ref={group}><primitive object={cloned} /></group>
}

function assetUrl(a) { return a.url || (a.storage_key ? `/files/${a.storage_key}` : null) }
