import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import AdminLayout from './AdminLayout.jsx'
import { useToast } from '../components/Toast.jsx'

/**
 * Edit the homepage statistics (label + value pairs shown under the hero).
 * Loads from /api/admin/stats, saves back with PUT.
 */
export default function StatsEditor() {
  const toast = useToast()
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/admin/stats')
      .then((d) => setStats(d.stats || []))
      .catch((e) => toast.error(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  function update(i, field, val) {
    setStats((s) => s.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  function addStat() {
    // generate a unique key from label later; use a temp key now
    setStats((s) => [...s, { key: `stat_${Date.now()}`, label: '', value: '' }])
  }

  function removeStat(i) {
    setStats((s) => s.filter((_, idx) => idx !== i))
  }

  async function save() {
    // require BOTH label and value for each stat
    const incomplete = stats.some((s) => (s.label.trim() && !s.value.trim()) || (!s.label.trim() && s.value.trim()))
    if (incomplete) {
      toast.error('Each statistic needs both a label and a value.')
      return
    }
    setSaving(true)
    try {
      // only keep fully-filled rows; generate a clean key from the label
      const payload = stats
        .filter((s) => s.label.trim() && s.value.trim())
        .map((s) => ({
          key: s.key.startsWith('stat_') ? (slugKey(s.label) || s.key) : s.key,
          label: s.label.trim(), value: s.value.trim(),
        }))
      const d = await api.put('/api/admin/stats', { stats: payload })
      setStats(d.stats || stats)
      toast.success('Statistics saved.')
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Statistics</h1>
        <p className="text-white/50 text-sm mt-1">The numbers shown under your hero on the home page.</p>
      </div>

      {loading ? (
        <p className="text-white/40 font-mono text-sm">loading…</p>
      ) : (
        <div className="max-w-2xl space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            {stats.length === 0 && (
              <p className="text-sm text-white/40">No statistics yet. Add your first one below.</p>
            )}
            {stats.map((s, i) => (
              <div key={s.key || i} className="grid grid-cols-[1fr_120px_auto] gap-3 items-end">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1">Label</label>
                  <input value={s.label} onChange={(e) => update(i, 'label', e.target.value)}
                    placeholder="3D Models"
                    className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-neon-violet/50" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1">Value</label>
                  <input value={s.value} onChange={(e) => update(i, 'value', e.target.value)}
                    placeholder="10+"
                    className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-neon-violet/50 font-display font-bold text-center" />
                </div>
                <button onClick={() => removeStat(i)} title="Remove"
                  className="rounded-lg px-3 py-2 text-sm bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">✕</button>
              </div>
            ))}
            <button onClick={addStat}
              className="rounded-lg px-4 py-2 text-xs bg-white/[0.04] border border-dashed border-white/20 text-white/50 hover:text-white transition">
              + Add statistic
            </button>
          </div>

          <button onClick={save} disabled={saving}
            className="rounded-xl bg-gradient-to-r from-neon-violet to-neon-magenta px-6 py-3 font-medium shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          <p className="text-xs text-white/30">
            Tip: keep values short — "10+", "1+", "5". The label is the text underneath.
          </p>
        </div>
      )}
    </AdminLayout>
  )
}

function slugKey(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}
