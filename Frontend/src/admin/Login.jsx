import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

/**
 * Admin login. Posts to /api/auth/login via the auth context. On success the
 * session cookie is set by the backend and we redirect to the dashboard.
 *
 * The backend expects { identifier, password } — identifier can be the admin
 * username or email (see Phase 4 auth_service).
 */
export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // already logged in? skip the form
  if (user) return <Navigate to="/admin" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(identifier.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      if (err.status === 401) setError('Incorrect email or password.')
      else setError(err.message || 'Login failed. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-neon-violet/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="inline-block mb-8 text-sm text-white/40 hover:text-white/70 transition font-mono">
          ← back to site
        </Link>

        <div className="glass rounded-3xl p-8">
          <h1 className="font-display text-2xl font-bold mb-1">Admin Login</h1>
          <p className="text-white/50 text-sm mb-8">Please sign in to access the admin panel.</p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">Email or username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm outline-none focus:border-neon-violet/50 focus:bg-white/[0.06] transition"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm outline-none focus:border-neon-violet/50 focus:bg-white/[0.06] transition"
                placeholder="********"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-neon-violet to-neon-magenta px-6 py-3 font-medium text-white shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
