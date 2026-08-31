import { useRef, useEffect, useState } from 'react'
import Stats from '../components/Stats.jsx'
import { profile } from '../data/content.js'

/**
 * Image-based hero using the Blender render directly (public/hero-art.png).
 * - Parallax tilt: the art shifts/rotates slightly toward the cursor for depth.
 * - Floating ember motes echo the render's particles so it feels alive.
 * - Radial glows behind the art recreate the lantern atmosphere.
 */
export default function Hero() {
  const artRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      // -0.5 .. 0.5 across the viewport
      const nx = e.clientX / window.innerWidth - 0.5
      const ny = e.clientY / window.innerHeight - 0.5
      setTilt({ x: nx, y: ny })
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <section id="home" className="relative min-h-screen w-full overflow-hidden">
      {/* Ambient radial glows — echo the lantern light in the render */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-[12%] w-[55vw] h-[55vw] max-w-[760px] max-h-[760px] rounded-full bg-neon-violet/12 blur-[130px]" />
        <div className="absolute bottom-[8%] right-[22%] w-[32vw] h-[32vw] rounded-full bg-neon-ice/12 blur-[110px]" />
        <div className="absolute top-[35%] right-[28%] w-[24vw] h-[24vw] rounded-full bg-neon-amber/10 blur-[90px]" />
      </div>

      {/* The render, right-aligned, with parallax tilt */}
      <div className="absolute inset-0 lg:left-[30%] flex items-center justify-center pointer-events-none">
        <div
          ref={artRef}
          className="relative w-full h-full max-w-[1100px]"
          style={{
            transform: `perspective(1200px) rotateY(${tilt.x * 6}deg) rotateX(${-tilt.y * 5}deg) translate3d(${tilt.x * -18}px, ${tilt.y * -12}px, 0)`,
            transition: 'transform 0.25s ease-out',
          }}
        >
          <img
            src="/hero-art.png"
            alt="Floating island with a knight, lanterns and neon arcs"
            className="absolute inset-0 w-full h-full object-contain select-none"
            draggable="false"
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 70% 75% at 55% 45%, #000 55%, transparent 92%)',
              maskImage:
                'radial-gradient(ellipse 70% 75% at 55% 45%, #000 55%, transparent 92%)',
            }}
          />
        </div>
      </div>

      {/* Floating ember motes */}
      <Embers />

      {/* Hero copy */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 min-h-screen flex items-center">
        <div className="max-w-xl">
          <p className="font-mono text-sm text-neon-ice mb-4 animate-fade-up" style={{ opacity: 0, animationDelay: '0.1s' }}>
            Hi, I'm
          </p>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-3 animate-fade-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
            {profile.name}
          </h1>
          <h2 className="font-display text-2xl md:text-4xl font-semibold text-gradient mb-6 animate-fade-up" style={{ opacity: 0, animationDelay: '0.3s' }}>
            {profile.role}
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-8 animate-fade-up" style={{ opacity: 0, animationDelay: '0.4s' }}>
            {profile.tagline}
          </p>

          <div className="flex flex-wrap gap-4 mb-12 animate-fade-up" style={{ opacity: 0, animationDelay: '0.5s' }}>
            <a href="#projects" className="rounded-full bg-gradient-to-r from-neon-violet to-neon-magenta px-7 py-3 font-medium text-white shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition-shadow">
              View My Work
            </a>
            <a href="#" className="glass rounded-full px-7 py-3 font-medium hover:bg-white/10 transition">
              Download CV
            </a>
          </div>

          <Stats />
        </div>
      </div>
    </section>
  )
}

/** Subtle drifting ember/dust motes over the whole hero. */
function Embers() {
  const motes = Array.from({ length: 18 })
  return (
    <div className="absolute inset-0 -z-[5] overflow-hidden pointer-events-none">
      {motes.map((_, i) => {
        const size = 2 + (i % 4)
        const left = (i * 53) % 100
        const top = (i * 37) % 100
        const dur = 8 + (i % 7)
        const delay = (i % 5) * 1.3
        const colors = ['#ffb968', '#c65cff', '#5b7bff', '#ffffff']
        const color = colors[i % colors.length]
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: size, height: size, left: `${left}%`, top: `${top}%`,
              background: color, opacity: 0.5,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              animation: `emberFloat ${dur}s ease-in-out ${delay}s infinite`,
            }}
          />
        )
      })}
    </div>
  )
}
