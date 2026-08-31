import Navbar from './components/Navbar.jsx'
import Hero from './sections/Hero.jsx'
import FeaturedWork from './components/FeaturedWork.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeaturedWork />
      </main>
      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/40">
        <p className="font-mono">Built with React · Three.js · Tailwind</p>
      </footer>
    </>
  )
}
