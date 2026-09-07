import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'

/**
 * Featured Work — pulls the models & projects you marked "Featured" from the
 * API. Models show their thumbnail; code projects show a default code tile.
 * Horizontally scrollable when there are many. No "view all" link.
 */
export default function FeaturedWork() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/models?featured=true').catch(() => ({ models: [] })),
      api.get('/api/projects?featured=true').catch(() => ({ projects: [] })),
    ]).then(([m, p]) => {
      const models = (m.models || m.items || []).map((x) => ({
        key: 'm' + x.id, title: x.title, kind: '3D Model',
        thumb: thumbOf(x), to: '/models',
      }))
      const projects = (p.projects || p.items || []).map((x) => ({
        key: 'p' + x.id, title: x.title, kind: 'Project',
        thumb: null, to: '/projects',
      }))
      setItems([...models, ...projects])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <section id="featured-work" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon-violet mb-2">Selected work</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold">Featured Work</h2>
      </div>

      {loading ? (
        <p className="text-white/40 font-mono text-sm">loading…</p>
      ) : items.length === 0 ? (
        <p className="text-white/40 text-sm">No featured work yet. Mark models or projects as “Featured” in the admin panel.</p>
      ) : (
        <Carousel items={items} />
      )}
    </section>
  )
}

/** Horizontal carousel with arrow buttons, edge fades, and centering when few. */
function Carousel({ items }) {
  const ref = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  function update() {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [items])

  function scroll(dir) {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <div className="relative">
      {/* edge fades (only when scrollable in that direction) */}
      <div className={`pointer-events-none absolute left-0 top-0 bottom-4 w-16 z-10 bg-gradient-to-r from-night-950 to-transparent transition-opacity ${canLeft ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`pointer-events-none absolute right-0 top-0 bottom-4 w-16 z-10 bg-gradient-to-l from-night-950 to-transparent transition-opacity ${canRight ? 'opacity-100' : 'opacity-0'}`} />

      {/* arrows */}
      {canLeft && (
        <button onClick={() => scroll(-1)} aria-label="Previous"
          className="absolute -left-5 lg:-left-14 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass flex items-center justify-center text-2xl text-white/70 hover:text-white hover:bg-white/10 transition shadow-lg">
          ‹
        </button>
      )}
      {canRight && (
        <button onClick={() => scroll(1)} aria-label="Next"
          className="absolute -right-5 lg:-right-14 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass flex items-center justify-center text-2xl text-white/70 hover:text-white hover:bg-white/10 transition shadow-lg">
          ›
        </button>
      )}

      {/* track — centered when few items, scrollable when many */}
      <div ref={ref}
        className="flex gap-5 pb-4 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto justify-start">
        {items.map((item) => (
          <Link key={item.key} to={item.to}
            className="group shrink-0 w-72 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-px overflow-hidden transition-transform hover:-translate-y-1">
            <div className="rounded-2xl bg-night-900/80 h-full p-5 flex flex-col">
              <div className="aspect-[4/3] rounded-xl mb-4 overflow-hidden bg-gradient-to-br from-night-700 to-night-950 flex items-center justify-center">
                {item.thumb
                  ? <img src={item.thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <span className="font-mono text-4xl text-white/10 group-hover:text-white/20 transition">{'</>'}</span>}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-1">{item.kind}</p>
              <h3 className="font-display font-semibold text-lg truncate">{item.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function thumbOf(model) {
  const t = (model.assets || []).find((a) => a.asset_type === 'THUMBNAIL')
  return t ? (t.url || (t.storage_key ? `/files/${t.storage_key}` : null)) : null
}
