import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import { stats as fallbackStats } from '../data/content.js'

/**
 * Hero stats. Loads editable values from /api/stats; if that fails (backend
 * down or not seeded), falls back to the static values in content.js.
 */
export default function Stats() {
  const [stats, setStats] = useState(fallbackStats)

  useEffect(() => {
    api.get('/api/stats')
      .then((d) => { if (d.stats?.length) setStats(d.stats) })
      .catch(() => {}) // keep fallback
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
      {stats.map((s, i) => (
        <div key={s.key || s.label} className="glass rounded-2xl px-5 py-4 text-center animate-fade-up" style={{ animationDelay: `${0.6 + i * 0.1}s`, opacity: 0 }}>
          <div className="font-display text-2xl md:text-3xl font-bold text-gradient">{s.value}</div>
          <div className="text-xs text-white/50 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
