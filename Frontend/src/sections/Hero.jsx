import { Suspense } from 'react'
import { Link } from 'react-router-dom'
import Scene from '../three/Scene.jsx'
import Stats from '../components/Stats.jsx'
import { profile } from '../data/content.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

export default function Hero() {
  const isMobile = useIsMobile()

  return (
    <section id="home" className="relative min-h-screen w-full overflow-hidden">
      {/* Ambient glow behind everything */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full bg-neon-violet/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[60vw] h-[60vw] rounded-full bg-neon-ice/10 blur-[100px]" />
      </div>

      {isMobile ? (
        /* ---------- MOBILE: static render image + stacked text ---------- */
        <div className="relative z-10 px-6 pt-28 pb-16 flex flex-col items-center text-center min-h-screen">
          <img src="/hero-render.png" alt="Floating island"
            className="w-full max-w-md rounded-2xl mb-8 animate-fade-up" style={{ opacity: 0, animationDelay: '0.1s' }} />
          <p className="font-mono text-sm text-neon-ice mb-3 animate-fade-up" style={{ opacity: 0, animationDelay: '0.2s' }}>Hi, I'm</p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] mb-3 animate-fade-up" style={{ opacity: 0, animationDelay: '0.3s' }}>{profile.name}</h1>
          <h2 className="font-display text-2xl font-semibold text-gradient mb-5 animate-fade-up" style={{ opacity: 0, animationDelay: '0.4s' }}>{profile.role}</h2>
          <p className="text-white/60 text-base leading-relaxed mb-7 max-w-sm animate-fade-up" style={{ opacity: 0, animationDelay: '0.5s' }}>{profile.tagline}</p>
          <Link to="/models" className="rounded-full bg-gradient-to-r from-neon-violet to-neon-magenta px-7 py-3 font-medium text-white shadow-lg shadow-neon-violet/25 mb-10 animate-fade-up" style={{ opacity: 0, animationDelay: '0.6s' }}>
            View My Work
          </Link>
          <Stats />
        </div>
      ) : (
        /* ---------- DESKTOP: interactive 3D scene + side text ---------- */
        <>
          <div className="absolute inset-0 lg:left-[34%]">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white/30 font-mono text-sm">loading island…</div>}>
              <Scene />
            </Suspense>
          </div>

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
        </>
      )}
    </section>
  )
}
