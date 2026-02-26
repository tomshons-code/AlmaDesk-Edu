import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)


function decodeTokenPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}


const REFRESH_CHECK_INTERVAL_MS = 5 * 60 * 1000

const REFRESH_THRESHOLD_MS = 60 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef(null)

  const logout = useCallback(() => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('almadesk_token')
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleForceLogout = () => logout()
    window.addEventListener('auth:logout', handleForceLogout)
    return () => window.removeEventListener('auth:logout', handleForceLogout)
  }, [logout])


  const silentRefresh = useCallback(async () => {
    const token = localStorage.getItem('almadesk_token')
    if (!token) return

    const payload = decodeTokenPayload(token)
    if (!payload?.exp) return

    const msUntilExpiry = payload.exp * 1000 - Date.now()
    if (msUntilExpiry > REFRESH_THRESHOLD_MS) return

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.token) {
          localStorage.setItem('almadesk_token', data.token)
          setUser(data.user)
        }
      }
    } catch (err) {
      console.warn('Silent token refresh failed:', err)
    }
  }, [])


  const startRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(silentRefresh, REFRESH_CHECK_INTERVAL_MS)
  }, [silentRefresh])

  useEffect(() => {
    const token = localStorage.getItem('almadesk_token')
    if (token) {
      verifyToken(token)
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async (token) => {
    try {
      const res = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setIsAuthenticated(true)
        startRefreshTimer()
      } else {
        localStorage.removeItem('almadesk_token')
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      localStorage.removeItem('almadesk_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login: username, password })
      })

      const data = await res.json()

      if (res.ok && data.token) {
        localStorage.setItem('almadesk_token', data.token)
        setUser(data.user)
        setIsAuthenticated(true)
        startRefreshTimer()
        return { success: true }
      }

      return { success: false, error: data.error || 'Nieprawidłowy login lub hasło' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Błąd połączenia z serwerem' }
    }
  }

  const loginSSO = () => {
    window.location.href = '/api/auth/sso/login'
  }

  const completeSSOLogin = async (token) => {
    if (!token) {
      return
    }

    setLoading(true)
    localStorage.setItem('almadesk_token', token)
    await verifyToken(token)
  }

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [])

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    loginSSO,
    completeSSOLogin,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
