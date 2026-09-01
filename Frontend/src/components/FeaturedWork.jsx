import { featured } from '../data/content.js'
const accentMap = {
  violet: 'from-neon-violet/20 to-transparent border-neon-violet/30',
  magenta: 'from-neon-magenta/20 to-transparent border-neon-magenta/30',
  ice: 'from-neon-ice/20 to-transparent border-neon-ice/30',
  amber: 'from-neon-amber/20 to-transparent border-neon-amber/30',
}
export default function FeaturedWork() {
  return (
    <section id="projects" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon-violet mb-2">Selected work</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold">Featured Work</h2>
        </div>
        <a href="#" className="text-sm text-white/60 hover:text-white transition">View all →</a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {featured.map((item) => (
          <article key={item.title} className={`group relative rounded-2xl border bg-gradient-to-b ${accentMap[item.accent]} p-px overflow-hidden transition-transform hover:-translate-y-1`}>
            <div className="rounded-2xl bg-night-900/80 h-full p-5 flex flex-col">
              <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-night-700 to-night-950 mb-4 flex items-center justify-center overflow-hidden">
                <span className="font-mono text-4xl text-white/10 group-hover:text-white/20 transition">{'</>'}</span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-1">{item.kind}</p>
              <h3 className="font-display font-semibold text-lg mb-1">{item.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{item.blurb}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
