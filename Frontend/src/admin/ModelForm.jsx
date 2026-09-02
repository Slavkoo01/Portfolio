import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { api } from '../lib/api.js'
import AdminLayout from './AdminLayout.jsx'

/**
 * Create or edit a 3D model.
 * - /admin/models/new  → create mode (no id)
 * - /admin/models/:id  → edit mode (loads existing, allows asset upload)
 *
 * Assets can only be uploaded once the model exists (needs an id), so in create
 * mode we save first, then the edit view shows the upload section.
 */
export default function ModelForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'new'
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '', slug: '', description: '', is_published: false, is_featured: false,
  })
  const [assets, setAssets] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const loadModel = useCallback(() => {
    if (!isEdit) return
    setLoading(true)
    api.get(`/api/admin/models/${id}`)
      .then((d) => {
        const m = d.model || d
        setForm({
          title: m.title || '', slug: m.slug || '', description: m.description || '',
          is_published: !!m.is_published, is_featured: !!m.is_featured,
        })
        setAssets(m.assets || [])
      })
      .catch((e) => setError(e.message || 'Failed to load model'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  useEffect(() => { loadModel() }, [loadModel])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function onSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        is_published: form.is_published,
        is_featured: form.is_featured,
      }
      // only send slug if the user typed one (backend auto-generates otherwise)
      if (form.slug.trim()) payload.slug = form.slug.trim()

      if (isEdit) {
        await api.put(`/api/admin/models/${id}`, payload)
        navigate('/admin/models')
      } else {
        const d = await api.post('/api/admin/models', payload)
        const newId = (d.model || d).id
        // go to edit view so they can upload assets
        navigate(`/admin/models/${newId}`)
      }
    } catch (e) {
      if (e.code === 'SLUG_TAKEN') setError('That slug is already taken — choose another.')
      else setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <button onClick={() => navigate('/admin/models')} className="text-sm text-white/40 hover:text-white/70 transition font-mono mb-4">
          ← back to models
        </button>
        <h1 className="font-display text-3xl font-bold">{isEdit ? 'Edit Model' : 'New Model'}</h1>
      </div>

      {loading ? (
        <p className="text-white/40 font-mono text-sm">loading…</p>
      ) : (
        <div className="max-w-2xl space-y-8">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={onSave} className="glass rounded-2xl p-6 space-y-5">
            <Field label="Title" required>
              <input
                type="text" value={form.title} required
                onChange={(e) => update('title', e.target.value)}
                className="input" placeholder="Mech Warrior"
              />
            </Field>

            <Field label="Slug" hint="Leave blank to auto-generate from title">
              <input
                type="text" value={form.slug}
                onChange={(e) => update('slug', e.target.value)}
                className="input font-mono" placeholder="mech-warrior"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description} rows={4}
                onChange={(e) => update('description', e.target.value)}
                className="input resize-none" placeholder="A high-poly mech model with PBR textures."
              />
            </Field>

            <div className="flex gap-6">
              <Toggle label="Published" checked={form.is_published} onChange={(v) => update('is_published', v)} />
              <Toggle label="Featured" checked={form.is_featured} onChange={(v) => update('is_featured', v)} />
            </div>

            <button
              type="submit" disabled={saving}
              className="rounded-xl bg-gradient-to-r from-neon-violet to-neon-magenta px-6 py-3 font-medium shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Model'}
            </button>
          </form>

          {/* Asset upload — only in edit mode (needs an existing model id) */}
          {isEdit && (
            <AssetUploader modelId={id} assets={assets} onChange={loadModel} />
          )}
        </div>
      )}

      <style>{`
        .input { width:100%; border-radius:0.75rem; background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1); padding:0.75rem 1rem; font-size:0.875rem;
          outline:none; transition:all 0.2s; color:white; }
        .input:focus { border-color:rgba(198,92,255,0.5); background:rgba(255,255,255,0.06); }
      `}</style>
    </AdminLayout>
  )
}

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
    <button
      type="button" onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm"
    >
      <span className={`w-10 h-6 rounded-full transition relative ${checked ? 'bg-neon-violet' : 'bg-white/10'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </span>
      <span className="text-white/70">{label}</span>
    </button>
  )
}

/** Uploads asset files to /api/admin/models/:id/assets (multipart form). */
function AssetUploader({ modelId, assets, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [assetType, setAssetType] = useState('THUMBNAIL')
  const [error, setError] = useState('')

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('asset_type', assetType)
      fd.append('file', file)
      await api.post(`/api/admin/models/${modelId}/assets`, fd, { isForm: true })
      onChange() // reload to show the new asset
    } catch (err) {
      if (err.code === 'CONTENT_MISMATCH') setError('File content does not match its extension.')
      else setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = '' // reset input
    }
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display font-semibold mb-1">Assets</h3>
      <p className="text-white/40 text-xs mb-5">Upload thumbnails, GLB models, or other files.</p>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {assets.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {assets.map((a) => (
            <li key={a.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <AssetPreview asset={a} />
              <div className="px-3 py-2">
                <div className="text-xs text-white/70">{a.asset_type}</div>
                <div className="text-[10px] text-white/30 font-mono truncate">{a.file_name || a.storage_key}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <select
          value={assetType} onChange={(e) => setAssetType(e.target.value)}
          className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none"
        >
          <option value="THUMBNAIL">Thumbnail</option>
          <option value="MODEL">Model (GLB)</option>
          <option value="TEXTURE">Texture</option>
          <option value="OTHER">Other</option>
        </select>
        <label className={`rounded-lg px-4 py-2 text-sm cursor-pointer transition ${uploading ? 'bg-white/[0.04] text-white/30' : 'bg-white/[0.06] hover:bg-white/10'}`}>
          {uploading ? 'Uploading…' : 'Choose file'}
          <input type="file" onChange={onFile} disabled={uploading} className="hidden" />
        </label>
      </div>
    </div>
  )
}

/**
 * Renders a preview for an uploaded asset:
 *  - THUMBNAIL / TEXTURE → the image itself (via asset.url → /files/<key>)
 *  - MODEL (.glb)        → a small live 3D viewer you can orbit
 *  - anything else       → a file icon
 */
function AssetPreview({ asset }) {
  const url = asset.url || (asset.storage_key ? `/files/${asset.storage_key}` : null)
  const type = asset.asset_type
  const isImage = type === 'THUMBNAIL' || type === 'TEXTURE' ||
    /\.(png|jpe?g|webp|gif)$/i.test(asset.file_name || '')
  const isModel = type === 'MODEL' || /\.glb$/i.test(asset.file_name || '')

  if (isImage && url) {
    return (
      <div className="aspect-square bg-night-950 flex items-center justify-center overflow-hidden">
        <img src={url} alt={asset.file_name} className="w-full h-full object-cover" />
      </div>
    )
  }
  if (isModel && url) {
    return <GlbThumb url={url} />
  }
  return (
    <div className="aspect-square bg-night-950 flex items-center justify-center text-3xl text-white/20">
      ⬡
    </div>
  )
}

/** Tiny standalone 3D preview of a GLB (orbitable). */
function GlbThumb({ url }) {
  return (
    <div className="aspect-square bg-night-950">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} />
        <Suspense fallback={null}>
          <GlbModel url={url} />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  )
}

function GlbModel({ url }) {
  const { scene } = useGLTF(url)
  // center + scale the model to fit the little viewer
  const ref = useRef()
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
  return <primitive ref={ref} object={scene} />
}
