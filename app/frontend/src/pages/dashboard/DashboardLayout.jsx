import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import '../../styles/components/DashboardLayout.css'

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  return (
    <div className="dashboard-wrapper">
      {}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <div className="dashboard-logo">
            <Icon name="university" size={24} /> <span>AlmaDesk-Edu</span>
          </div>
          <div className="dashboard-role-badge">
            {user?.role === 'SUPER_ADMIN' ? <><Icon name="crown" size={16} /> Admin</> : <><Icon name="wrench" size={16} /> Agent</>}
          </div>
        </div>

        <nav className="dashboard-nav">
          <button
            className={`dashboard-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <span className="nav-icon"><Icon name="dashboard" size={18} /></span>
            <span>Dashboard</span>
          </button>

          <button
            className={`dashboard-nav-item ${isActive('/dashboard/queue') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/queue')}
          >
            <span className="nav-icon"><Icon name="list" size={18} /></span>
            <span>Kolejka zgłoszeń</span>
          </button>

          <button
            className={`dashboard-nav-item ${isActive('/dashboard/my-tickets') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/my-tickets')}
          >
            <span className="nav-icon"><Icon name="user" size={18} /></span>
            <span>Moje zgłoszenia</span>
          </button>

          <button
            className={`dashboard-nav-item ${location.pathname.startsWith('/knowledge-base') ? 'active' : ''}`}
            onClick={() => navigate('/knowledge-base')}
          >
            <span className="nav-icon"><Icon name="book" size={18} /></span>
            <span>Baza wiedzy</span>
          </button>

          <div className="dashboard-nav-divider" />

          {['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
            <>
              <button
                className={`dashboard-nav-item ${location.pathname.startsWith('/dashboard/change-requests') ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/change-requests')}
              >
                <span className="nav-icon"><Icon name="refresh" size={18} /></span>
                <span>Zarządzanie Zmianami</span>
              </button>

              <button
                className={`dashboard-nav-item ${isActive('/dashboard/reports') ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/reports')}
              >
                <span className="nav-icon"><Icon name="file-text" size={18} /></span>
                <span>Raporty</span>
              </button>

              <button
                className={`dashboard-nav-item ${isActive('/dashboard/recurring-alerts') ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/recurring-alerts')}
              >
                <span className="nav-icon"><Icon name="alert-triangle" size={18} /></span>
                <span>Nawracające problemy</span>
              </button>
            </>
          )}

          {user?.role === 'SUPER_ADMIN' && (
            <>
              <div className="dashboard-nav-divider" />
              <button
                className={`dashboard-nav-item ${isActive('/dashboard/users') ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/users')}
              >
                <span className="nav-icon"><Icon name="users" size={18} /></span>
                <span>Użytkownicy</span>
              </button>
            </>
          )}
        </nav>

        <div className="dashboard-sidebar-footer">
          <button
            className="dashboard-nav-item"
            onClick={() => navigate('/settings')}
          >
            <span className="nav-icon"><Icon name="settings" size={18} /></span>
            <span>Ustawienia</span>
          </button>
        </div>
      </aside>

      {}
      <div className="dashboard-content">
        {}
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb">
            <span className="breadcrumb-home" onClick={() => navigate('/dashboard')}>
              Dashboard
            </span>
            {location.pathname !== '/dashboard' && (
              <>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">
                  {getBreadcrumbTitle(location.pathname)}
                </span>
              </>
            )}
          </div>

          <div className="dashboard-topbar-actions">
            <button className="dashboard-notifications-btn">
              <Icon name="bell" size={20} />
              <span className="notification-badge">3</span>
            </button>

            {}
            <div className="dashboard-user-dropdown" ref={userMenuRef}>
              <button
                className="dashboard-user-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <div className="dashboard-user-avatar">
                  {user?.name?.charAt(0)}
                </div>
                <span className="dashboard-user-name">{user?.name}</span>
                <Icon name={isUserMenuOpen ? 'chevron-up' : 'chevron-down'} size={16} />
              </button>

              {isUserMenuOpen && (
                <div className="dashboard-user-menu">
                  <div className="user-menu-header">
                    <div className="user-menu-name">{user?.name}</div>
                    <div className="user-menu-email">{user?.email}</div>
                  </div>
                  <div className="user-menu-divider" />
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      navigate('/settings')
                    }}
                    className="user-menu-item"
                  >
                    <Icon name="settings" size={16} /> Ustawienia
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="user-menu-item logout"
                  >
                    <Icon name="log-out" size={16} /> Wyloguj
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {}
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function getBreadcrumbTitle(pathname) {
  const titles = {
    '/dashboard/queue': 'Kolejka zgłoszeń',
    '/dashboard/my-tickets': 'Moje zgłoszenia',
    '/dashboard/users': 'Użytkownicy',
    '/dashboard/reports': 'Raporty',
    '/dashboard/recurring-alerts': 'Nawracające problemy'
  }
  return titles[pathname] || 'Dashboard'
}
