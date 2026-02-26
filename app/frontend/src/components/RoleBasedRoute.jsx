import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RoleBasedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#718096'
      }}>
        Ładowanie...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user?.role)) {
    if (user?.role === 'KLIENT') {
      return <Navigate to="/portal" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return children
}
