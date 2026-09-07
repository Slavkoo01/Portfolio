import { Suspense } from 'react'
import { Link } from 'react-router-dom'
import Scene from '../three/Scene.jsx'
import Stats from '../components/Stats.jsx'
import { profile } from '../data/content.js'

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen w-full overflow-hidden">
      {/* Ambient radial glows echoing the lantern light */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full bg-neon-violet/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] rounded-full bg-neon-ice/10 blur-[100px]" />
      </div>

      {/* The interactive 3D island */}
      <div className="absolute inset-0 lg:left-[34%]">
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white/30 font-mono text-sm">loading island…</div>}>
          <Scene />
        </Suspense>
      </div>

      {/* Hero copy */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 min-h-screen flex items-center pointer-events-none">
        <div className="max-w-xl pointer-events-auto">
          <p className="font-mono text-sm text-neon-ice mb-4 animate-fade-up" style={{ opacity: 0, animationDelay: '0.1s' }}>Hi, I'm</p>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-3 animate-fade-up" style={{ opacity: 0, animationDelay: '0.2s' }}>{profile.name}</h1>
          <h2 className="font-display text-2xl md:text-4xl font-semibold text-gradient mb-6 animate-fade-up" style={{ opacity: 0, animationDelay: '0.3s' }}>{profile.role}</h2>
          <p className="text-white/60 text-lg leading-relaxed mb-8 animate-fade-up" style={{ opacity: 0, animationDelay: '0.4s' }}>{profile.tagline}</p>
          <div className="flex flex-wrap gap-4 mb-12 animate-fade-up" style={{ opacity: 0, animationDelay: '0.5s' }}>
            <Link to="/models" className="rounded-full bg-gradient-to-r from-neon-violet to-neon-magenta px-7 py-3 font-medium text-white shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition-shadow">View My Work</Link>
          </div>
          <Stats />
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 lg:left-[67%] -translate-x-1/2 z-10 text-center pointer-events-none">
        <p className="font-mono text-xs text-white/40 animate-pulse">grab &amp; rotate the island ✦</p>
      </div>
    </section>
  )
}
