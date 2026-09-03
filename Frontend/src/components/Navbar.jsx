import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { nav } from '../data/content.js'

// which nav items are real routed pages vs in-page anchors
const ROUTES = {
  'Home': '/',
  'Projects': '/projects',
  'Contact': '/contact',
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'glass py-3' : 'py-5 bg-transparent'}`}>
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <Link to="/" className="font-display text-lg font-bold tracking-tight"><span className="text-gradient">Portfolio</span></Link>
        <nav className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            ROUTES[item] ? (
              <Link key={item} to={ROUTES[item]} className="text-sm text-white/70 hover:text-white transition-colors">{item}</Link>
            ) : (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm text-white/70 hover:text-white transition-colors">{item}</a>
            )
          ))}
        </nav>
        <Link to="/admin/login" className="glass rounded-full px-4 py-2 text-xs font-medium hover:bg-white/10 transition">Admin</Link>
      </div>
    </header>
  )
}
