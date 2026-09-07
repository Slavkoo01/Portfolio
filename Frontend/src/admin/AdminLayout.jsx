import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

/**
 * Shared admin shell: a sidebar with navigation + a content area.
 * Every admin page renders inside this so the nav stays consistent.
 */
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '◈' },
  { to: '/admin/models', label: '3D Models', icon: '◆' },
  { to: '/admin/software', label: 'Software', icon: '⚙' },
  { to: '/admin/stats', label: 'Statistics', icon: '▦' },
  { to: '/admin/projects', label: 'Projects', icon: '⬡' },
]

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-night-900/50 backdrop-blur-md flex flex-col">
        <div className="px-6 py-6">
          <Link to="/" className="font-display text-lg font-bold">
            <span className="text-gradient">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
                  active
                    ? 'bg-neon-violet/15 text-white border border-neon-violet/30'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span className="text-neon-violet/80">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <div className="px-4 py-2 text-xs text-white/40">
            {user?.username || 'admin'}
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition"
          >
            <span>⏻</span> Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 px-8 py-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
