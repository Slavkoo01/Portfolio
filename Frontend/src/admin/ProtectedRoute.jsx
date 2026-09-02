import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

/**
 * Wraps admin pages. While we check the session it shows nothing; if there's no
 * user it bounces to /admin/login; otherwise it renders the page.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40 font-mono text-sm">
        checking session…
      </div>
    )
  }
  if (!user) return <Navigate to="/admin/login" replace />
  return children
}
