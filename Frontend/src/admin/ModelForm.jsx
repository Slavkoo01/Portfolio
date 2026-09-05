import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { api } from '../lib/api.js'
import AdminLayout from './AdminLayout.jsx'

/**
 * Create/edit a 3D model with:
 *  - basic fields (title, slug, description, flags)
 *  - single thumbnail (uploading a new one replaces the old)
 *  - a GLB model upload + live 3D preview
 *  - transform controls (position/rotation/scale) that SAVE to the backend
 *  - texture / animation uploads
 */
export default function ModelForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'new'
  const navigate = useNavigate()

  const [model, setModel] = useState(null)
  const [form, setForm] = useState({
    title: '', slug: '', description: '', is_published: false, is_featured: false,
    position_x: 0, position_y: 0, position_z: 0,
    rotation_x: 0, rotation_y: 0, rotation_z: 0,
    scale_x: 1, scale_y: 1, scale_z: 1,
    tags: '', is_rigged: false, texture_info: '', software_ids: [],
  })
  const [allSoftware, setAllSoftware] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    if (!isEdit) return
    setLoading(true)
    api.get(`/api/admin/models/${id}`)
      .then((d) => {
        const m = d.model || d
        setModel(m)
        setForm((f) => ({
          ...f,
          title: m.title || '', slug: m.slug || '', description: m.description || '',
          is_published: !!m.is_published, is_featured: !!m.is_featured,
          position_x: num(m.position_x, 0), position_y: num(m.position_y, 0), position_z: num(m.position_z, 0),
          rotation_x: num(m.rotation_x, 0), rotation_y: num(m.rotation_y, 0), rotation_z: num(m.rotation_z, 0),
          scale_x: num(m.scale_x, 1), scale_y: num(m.scale_y, 1), scale_z: num(m.scale_z, 1),
          tags: Array.isArray(m.tags) ? m.tags.join(', ') : (m.tags || ''),
          is_rigged: !!m.is_rigged, texture_info: m.texture_info || '',
          software_ids: (m.software || []).map((sw) => sw.id),
        }))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/api/software').then((d) => setAllSoftware(d.software || [])).catch(() => {})
  }, [])

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function save(e) {
    e?.preventDefault()
    setError(''); setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        is_published: form.is_published, is_featured: form.is_featured,
        tags: form.tags.trim() || null,
        is_rigged: form.is_rigged,
        texture_info: form.texture_info.trim() || null,
        software_ids: form.software_ids,
        position_x: +form.position_x, position_y: +form.position_y, position_z: +form.position_z,
        rotation_x: +form.rotation_x, rotation_y: +form.rotation_y, rotation_z: +form.rotation_z,
        scale_x: +form.scale_x, scale_y: +form.scale_y, scale_z: +form.scale_z,
      }
      if (form.slug.trim()) payload.slug = form.slug.trim()

      if (isEdit) {
        await api.put(`/api/admin/models/${id}`, payload)
        load()
      } else {
        const d = await api.post('/api/admin/models', payload)
        navigate(`/admin/models/${(d.model || d).id}`)
      }
    } catch (e) {
      setError(e.code === 'SLUG_TAKEN' ? 'Slug already taken.' : (e.message || 'Save failed'))
    } finally { setSaving(false) }
  }

  const assets = model?.assets || []
  const glb = assets.find((a) => a.asset_type === 'MODEL' || /\.glb$/i.test(a.file_name || ''))
  const glbUrl = glb ? assetUrl(glb) : null

  // animation clips discovered inside the GLB, and which one is playing
  const [clipNames, setClipNames] = useState([])
  const [activeClip, setActiveClip] = useState(null)

  return (
    <AdminLayout>
      <div className="mb-6">
        <button onClick={() => navigate('/admin/models')} className="text-sm text-white/40 hover:text-white/70 transition font-mono mb-3">
          ← back to models
        </button>
        <h1 className="font-display text-3xl font-bold">{isEdit ? 'Edit Model' : 'New Model'}</h1>
      </div>

      {loading ? (
        <p className="text-white/40 font-mono text-sm">loading…</p>
      ) : (
        <>
          {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-5">{error}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* LEFT: details + transform */}
            <div className="space-y-6">
              <form onSubmit={save} className="glass rounded-2xl p-6 space-y-5">
                <Field label="Title" required>
                  <input className="minput" value={form.title} required onChange={(e) => up('title', e.target.value)} placeholder="Mech Warrior" />
                </Field>
                <Field label="Slug" hint="blank = auto">
                  <input className="minput font-mono" value={form.slug} onChange={(e) => up('slug', e.target.value)} placeholder="mech-warrior" />
                </Field>
                <Field label="Description">
                  <textarea className="minput resize-none" rows={3} value={form.description} onChange={(e) => up('description', e.target.value)} />
                </Field>

                {/* --- Showroom metadata --- */}
                <Field label="Tags" hint="comma-separated">
                  <input className="minput" value={form.tags} onChange={(e) => up('tags', e.target.value)} placeholder="Robot, Sci-Fi, Hard Surface" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Texture info" hint="e.g. 4K PBR">
                    <input className="minput" value={form.texture_info} onChange={(e) => up('texture_info', e.target.value)} placeholder="4K PBR" />
                  </Field>
                  <div className="flex items-end pb-2">
                    <Toggle label="Rigged" checked={form.is_rigged} onChange={(v) => up('is_rigged', v)} />
                  </div>
                </div>

                {/* Software picker */}
                <Field label="Software used">
                  {allSoftware.length === 0 ? (
                    <p className="text-xs text-white/30">No software in the database yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allSoftware.map((sw) => {
                        const on = form.software_ids.includes(sw.id)
                        return (
                          <button key={sw.id} type="button"
                            onClick={() => up('software_ids', on
                              ? form.software_ids.filter((x) => x !== sw.id)
                              : [...form.software_ids, sw.id])}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition border ${
                              on ? 'bg-neon-violet/15 border-neon-violet/40 text-white' : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-white'
                            }`}>
                            {sw.icon_url && <img src={sw.icon_url} alt="" className="w-4 h-4 object-contain" />}
                            {sw.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </Field>

                <div className="flex gap-6">
                  <Toggle label="Published" checked={form.is_published} onChange={(v) => up('is_published', v)} />
                  <Toggle label="Featured" checked={form.is_featured} onChange={(v) => up('is_featured', v)} />
                </div>
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-neon-violet to-neon-magenta px-6 py-3 font-medium shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition disabled:opacity-50">
                  {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Model'}
                </button>
              </form>

              {isEdit && (
                <TransformControls form={form} up={up} onSave={save} saving={saving} />
              )}
            </div>

            {/* RIGHT: 3D preview + assets */}
            <div className="space-y-6">
              {isEdit ? (
                <>
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-display font-semibold">3D Preview</h3>
                      {activeClip && (
                        <button onClick={() => setActiveClip(null)}
                          className="rounded-lg px-3 py-1 text-xs bg-white/[0.06] hover:bg-white/10 transition">
                          ■ stop
                        </button>
                      )}
                    </div>
                    <p className="text-white/40 text-xs mb-4">
                      {activeClip ? `Playing "${activeClip}". Drag to orbit.` : 'Drag to orbit. Textures & animations are read from the GLB.'}
                    </p>
                    {glbUrl ? (
                      <ModelViewer
                        url={glbUrl}
                        form={form}
                        activeClip={activeClip}
                        onClips={setClipNames}
                      />
                    ) : (
                      <div className="aspect-video rounded-xl bg-night-950 flex items-center justify-center text-white/30 text-sm">
                        Upload a GLB model below to preview it.
                      </div>
                    )}

                    {/* Animation clips discovered inside the GLB */}
                    {glbUrl && clipNames.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs text-white/40 mb-2">Animations ({clipNames.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {clipNames.map((name) => (
                            <button key={name}
                              onClick={() => setActiveClip((c) => c === name ? null : name)}
                              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                                activeClip === name
                                  ? 'bg-neon-violet/20 text-neon-violet border border-neon-violet/40'
                                  : 'bg-white/[0.06] text-white/60 hover:bg-white/10'
                              }`}>
                              {activeClip === name ? '▶ ' : ''}{name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {glbUrl && clipNames.length === 0 && (
                      <p className="mt-4 text-xs text-white/30">No animations found in this GLB.</p>
                    )}
                  </div>

                  <ThumbnailManager modelId={id} assets={assets} onChange={load} />

                  {/* Model file (single GLB — carries geometry, textures, animations) */}
                  <UploadSection
                    title="Model" hint="One GLB with everything: mesh, textures, and animations."
                    modelId={id} assetType="MODEL" single accept=".glb,.gltf"
                    items={glb ? [glb] : []} onChange={load}
                  />

                  {/* Textures gallery — shown to visitors as 'textures I made' */}
                  <UploadSection
                    title="Textures" hint="Gallery of textures to showcase (display only)."
                    modelId={id} assetType="TEXTURE" accept="image/*"
                    items={assets.filter((a) => a.asset_type === 'TEXTURE')} onChange={load} gallery
                  />
                </>
              ) : (
                <div className="glass rounded-2xl p-10 text-center text-white/40">
                  Create the model first, then you can upload a GLB, thumbnail, and set its transform.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .minput{width:100%;border-radius:0.75rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);padding:0.7rem 0.9rem;font-size:0.875rem;outline:none;color:white;transition:all .2s}
        .minput:focus{border-color:rgba(198,92,255,0.5);background:rgba(255,255,255,0.06)}
      `}</style>
    </AdminLayout>
  )
}

/* ---------- Transform controls ---------- */
function TransformControls({ form, up, onSave, saving }) {
  const rows = [
    { label: 'Position', keys: ['position_x', 'position_y', 'position_z'], min: -10, max: 10, step: 0.1 },
    { label: 'Rotation', keys: ['rotation_x', 'rotation_y', 'rotation_z'], min: -180, max: 180, step: 1 },
    { label: 'Scale', keys: ['scale_x', 'scale_y', 'scale_z'], min: 0.1, max: 5, step: 0.05 },
  ]
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Transform</h3>
        <button onClick={onSave} disabled={saving} className="rounded-lg px-4 py-1.5 text-xs bg-white/[0.06] hover:bg-white/10 transition">
          {saving ? 'Saving…' : 'Save transform'}
        </button>
      </div>
      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="text-xs text-white/50 mb-2">{row.label}</div>
            <div className="grid grid-cols-3 gap-3">
              {row.keys.map((k, i) => (
                <div key={k}>
                  <label className="text-[10px] text-white/30 uppercase">{'XYZ'[i]}</label>
                  <input type="number" step={row.step} min={row.min} max={row.max}
                    value={form[k]} onChange={(e) => up(k, e.target.value)}
                    className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-neon-violet/50" />
                  <input type="range" min={row.min} max={row.max} step={row.step}
                    value={form[k]} onChange={(e) => up(k, e.target.value)}
                    className="w-full mt-1 accent-neon-violet" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- 3D viewer ---------- */
function ModelViewer({ url, form, activeClip, onClips }) {
  return (
    <div className="aspect-video rounded-xl bg-night-950 overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.3} />
        <directionalLight position={[-5, 2, -5]} intensity={0.5} color="#8ab4ff" />
        <Suspense fallback={null}>
          <PosedModel url={url} form={form} activeClip={activeClip} onClips={onClips} />
        </Suspense>
        <OrbitControls enablePan={false} />
        <gridHelper args={[10, 10, '#333', '#1a1a2e']} position={[0, -1.5, 0]} />
      </Canvas>
    </div>
  )
}

function PosedModel({ url, form, activeClip, onClips }) {
  const group = useRef()
  const { scene, animations } = useGLTF(url)
  const cloned = useRef()
  if (!cloned.current || cloned.current.__url !== url) {
    cloned.current = scene.clone(true)
    cloned.current.__url = url
  }
  const { actions, names } = useAnimations(animations, group)

  // report the discovered clip names up to the parent (for the buttons)
  const clipsKey = names.join('|')
  useEffect(() => {
    onClips?.(names)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipsKey])

  // apply the saved transform
  useEffect(() => {
    if (!group.current) return
    group.current.position.set(+form.position_x, +form.position_y, +form.position_z)
    group.current.rotation.set(deg(+form.rotation_x), deg(+form.rotation_y), deg(+form.rotation_z))
    group.current.scale.set(+form.scale_x, +form.scale_y, +form.scale_z)
  }, [form, url])

  // play the selected clip (activeClip = clip name, or null = none)
  useEffect(() => {
    if (activeClip && actions[activeClip]) {
      const a = actions[activeClip]
      a.reset().fadeIn(0.3).play()
      return () => { a.fadeOut(0.3) }
    }
  }, [activeClip, actions])

  return <group ref={group}><primitive object={cloned.current} /></group>
}

/* ---------- Thumbnail (single, replaces) ---------- */
function ThumbnailManager({ modelId, assets, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const thumb = assets.find((a) => a.asset_type === 'THUMBNAIL')

  async function upload(file) {
    setError(''); setUploading(true)
    try {
      // delete existing thumbnail first (enforce single)
      if (thumb) {
        await api.del(`/api/admin/models/${modelId}/assets/${thumb.id}`).catch(() => {})
      }
      const fd = new FormData()
      fd.append('asset_type', 'THUMBNAIL')
      fd.append('file', file)
      await api.post(`/api/admin/models/${modelId}/assets`, fd, { isForm: true })
      onChange()
    } catch (e) {
      setError(e.code === 'CONTENT_MISMATCH' ? 'File content does not match extension.' : (e.message || 'Upload failed'))
    } finally { setUploading(false) }
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display font-semibold mb-1">Thumbnail</h3>
      <p className="text-white/40 text-xs mb-4">One image used as the model's cover. Uploading replaces the current one.</p>
      {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-300 mb-3">{error}</div>}
      <div className="flex items-center gap-4">
        <div className="w-28 h-28 rounded-xl bg-night-950 border border-white/[0.06] overflow-hidden flex items-center justify-center shrink-0">
          {thumb ? <img src={assetUrl(thumb)} alt="thumbnail" className="w-full h-full object-cover" /> : <span className="text-white/20 text-3xl">🖼</span>}
        </div>
        <label className={`rounded-lg px-4 py-2 text-sm cursor-pointer transition ${uploading ? 'bg-white/[0.04] text-white/30' : 'bg-white/[0.06] hover:bg-white/10'}`}>
          {uploading ? 'Uploading…' : thumb ? 'Replace' : 'Upload thumbnail'}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </label>
      </div>
    </div>
  )
}

/* ---------- Other files (GLB / textures / animations) ---------- */
/* ---------- Reusable upload section (Model / Textures / Animations) ---------- */
/**
 * One section that lists its assets as preview cards and uploads new ones.
 * Props:
 *  - single: enforce one file (replaces existing on upload)
 *  - gallery: render image previews (for textures)
 *  - selectable + onSelect + activeId: clicking a card selects it (animations)
 */
function UploadSection({ title, hint, modelId, assetType, accept, items = [], onChange, single, gallery, selectable, activeId, onSelect }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function upload(file) {
    setError(''); setUploading(true)
    try {
      if (single && items[0]) {
        await api.del(`/api/admin/models/${modelId}/assets/${items[0].id}`).catch(() => {})
      }
      const fd = new FormData()
      fd.append('asset_type', assetType)
      fd.append('file', file)
      await api.post(`/api/admin/models/${modelId}/assets`, fd, { isForm: true })
      onChange()
    } catch (e) {
      setError(e.code === 'CONTENT_MISMATCH' ? 'File content does not match its extension.'
        : (e.message || 'Upload failed'))
    } finally { setUploading(false) }
  }

  async function remove(a, e) {
    e?.stopPropagation()
    if (!confirm(`Delete ${a.file_name}?`)) return
    await api.del(`/api/admin/models/${modelId}/assets/${a.id}`).catch(() => {})
    onChange()
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold">{title}</h3>
        <label className={`rounded-lg px-4 py-1.5 text-xs cursor-pointer transition ${uploading ? 'bg-white/[0.04] text-white/30' : 'bg-white/[0.06] hover:bg-white/10'}`}>
          {uploading ? 'Uploading…' : single && items[0] ? 'Replace' : '+ Upload'}
          <input type="file" accept={accept} className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </label>
      </div>
      {hint && <p className="text-white/40 text-xs mb-4">{hint}</p>}
      {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-300 mb-3">{error}</div>}

      {items.length === 0 ? (
        <p className="text-sm text-white/30">Nothing uploaded yet.</p>
      ) : (
        <ul className={gallery ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
          {items.map((a) => {
            const active = selectable && activeId === a.id
            return (
              <li key={a.id}
                onClick={selectable ? () => onSelect(a) : undefined}
                className={`rounded-xl border overflow-hidden transition ${
                  active ? 'border-neon-violet/60 ring-1 ring-neon-violet/40'
                  : 'border-white/[0.06]'} ${selectable ? 'cursor-pointer hover:border-white/20' : ''} bg-white/[0.03]`}>
                <SectionPreview asset={a} gallery={gallery} />
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    {selectable && <div className="text-[10px] text-neon-violet">{active ? '▶ playing' : 'click to play'}</div>}
                    <div className="text-[10px] text-white/30 font-mono truncate">{a.file_name}</div>
                  </div>
                  <button onClick={(e) => remove(a, e)} className="text-red-300/70 hover:text-red-300 text-xs shrink-0 ml-2">✕</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Preview inside a section card: image for textures, static GLB thumb for models/anims. */
function SectionPreview({ asset, gallery }) {
  const url = assetUrl(asset)
  const name = (asset.file_name || '').toLowerCase()
  const isImage = gallery || /\.(png|jpe?g|webp|gif)$/i.test(name)
  const isGlb = /\.(glb|gltf)$/i.test(name)

  if (isImage && url && /\.(png|jpe?g|webp|gif)$/i.test(name)) {
    return (
      <div className="aspect-video bg-night-950 flex items-center justify-center overflow-hidden">
        <img src={url} alt={asset.file_name} className="max-w-full max-h-full object-contain" />
      </div>
    )
  }
  if (isGlb && url) {
    return (
      <div className="aspect-video bg-night-950">
        <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[4, 6, 4]} intensity={1.1} />
          <Suspense fallback={null}><FitGlb url={url} /></Suspense>
          <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={2} />
        </Canvas>
      </div>
    )
  }
  return (
    <div className="aspect-video bg-night-950 flex flex-col items-center justify-center text-center px-3">
      <span className="text-2xl text-white/20">⬡</span>
      <span className="text-[10px] text-white/40 mt-1">No preview for this format</span>
      {url && <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-neon-ice hover:underline mt-0.5">download</a>}
    </div>
  )
}

function FitGlb({ url }) {
  const ref = useRef()
  const { scene } = useGLTF(url)
  const cloned = useRef()
  if (!cloned.current) cloned.current = scene.clone(true)
  useEffect(() => {
    if (!ref.current) return
    const box = new THREE.Box3().setFromObject(ref.current)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const s = 2 / maxDim
    ref.current.scale.setScalar(s)
    ref.current.position.sub(center.multiplyScalar(s))
  }, [scene])
  return <primitive ref={ref} object={cloned.current} />
}

/* ---------- small helpers ---------- */
function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-2">
        {label}{required && <span className="text-neon-magenta"> *</span>}
        {hint && <span className="text-white/30 font-normal ml-2">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm">
      <span className={`w-10 h-6 rounded-full transition relative ${checked ? 'bg-neon-violet' : 'bg-white/10'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </span>
      <span className="text-white/70">{label}</span>
    </button>
  )
}
function assetUrl(a) { return a.url || (a.storage_key ? `/files/${a.storage_key}` : null) }
function num(v, d) { const n = parseFloat(v); return Number.isFinite(n) ? n : d }
function deg(d) { return (d * Math.PI) / 180 }
