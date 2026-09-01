import { stats } from '../data/content.js'
export default function Stats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
      {stats.map((s, i) => (
        <div key={s.label} className="glass rounded-2xl px-5 py-4 text-center animate-fade-up" style={{ animationDelay: `${0.6 + i * 0.1}s`, opacity: 0 }}>
          <div className="font-display text-2xl md:text-3xl font-bold text-gradient">{s.value}</div>
          <div className="text-xs text-white/50 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
