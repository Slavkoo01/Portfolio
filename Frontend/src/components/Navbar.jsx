import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { nav } from '../data/content.js'

const ROUTES = {
  'Home': '/',
  '3D Models': '/models',
  'Projects': '/projects',
  'Contact': '/contact',
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // close the mobile menu whenever the route changes
  useEffect(() => { setOpen(false) }, [location.pathname])

  const linkFor = (item, className = 'text-sm text-white/70 hover:text-white transition-colors') => ROUTES[item]
    ? <Link key={item} to={ROUTES[item]} className={className}>{item}</Link>
    : <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className={className}>{item}</a>

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled || open ? 'glass py-3' : 'py-5 bg-transparent'}`}>
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <Link to="/" className="font-display text-lg font-bold tracking-tight"><span className="text-gradient">Portfolio</span></Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {nav.map((item) => linkFor(item))}
        </nav>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen((o) => !o)} aria-label="Menu"
          className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5">
          <span className={`block w-6 h-0.5 bg-white transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>

        {/* balance spacer on desktop only */}
        <div className="hidden md:block w-16" />
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="md:hidden mt-3 px-6 pb-4 flex flex-col gap-1">
          {nav.map((item) => (
            <div key={item} className="border-b border-white/[0.06] last:border-0">
              {linkFor(item, 'block py-3 text-sm text-white/70 hover:text-white transition-colors')}
            </div>
          ))}
        </nav>
      )}
    </header>
  )
}
