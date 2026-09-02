import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'

/**
 * Auth state for the whole app.
 * On mount it asks the backend "who am I?" (/api/auth/me). If a valid session
 * cookie exists, we get the user back and know they're logged in. Components
 * read `user` to decide what to show; ProtectedRoute uses it to guard pages.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // check existing session on load
  useEffect(() => {
    let alive = true
    api.me()
      .then((data) => { if (alive) setUser(data?.user ?? null) })
      .catch(() => { if (alive) setUser(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const login = useCallback(async (identifier, password) => {
    const data = await api.login(identifier, password)
    setUser(data?.user ?? null)
    return data
  }, [])

  const logout = useCallback(async () => {
    try { await api.logout() } finally { setUser(null) }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
