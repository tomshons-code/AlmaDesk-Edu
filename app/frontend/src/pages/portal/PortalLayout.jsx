import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import '../../styles/components/PortalLayout.css'

export default function PortalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <div className="portal-wrapper">
      {}
      <header className="portal-header">
        <div className="portal-header-content">
          <div className="portal-logo" onClick={() => navigate('/portal')}>
            <Icon name="university" size={24} /> <span>AlmaDesk-Edu</span>
            <span className="portal-badge">Portal Klienta</span>
          </div>

          <nav className="portal-nav">
            <button
              className={`portal-nav-item ${isActive('/portal') ? 'active' : ''}`}
              onClick={() => navigate('/portal')}
            >
              <Icon name="list" size={18} /> Moje zgłoszenia
            </button>
            <button
              className={`portal-nav-item ${isActive('/portal/new') ? 'active' : ''}`}
              onClick={() => navigate('/portal/new')}
            >
              <Icon name="plus" size={18} /> Nowe zgłoszenie
            </button>
            <button
              className={`portal-nav-item ${location.pathname.startsWith('/knowledge-base') ? 'active' : ''}`}
              onClick={() => navigate('/knowledge-base')}
            >
              <Icon name="book" size={18} /> Baza wiedzy
            </button>
          </nav>

          <div className="portal-user-menu">
            <div className="portal-user-info">
              <div className="portal-avatar">{user?.name?.charAt(0)}</div>
              <span className="portal-user-name">{user?.name}</span>
            </div>
            <button onClick={() => navigate('/settings')} className="portal-settings-btn">
              <Icon name="settings" size={18} />
            </button>
            <button onClick={logout} className="portal-logout-btn">
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="portal-main">
        <Outlet />
      </main>

      {}
      <footer className="portal-footer">
        <p>© {new Date().getFullYear()} AlmaDesk-Edu | Masz pytania? Skontaktuj się z IT: helpdesk@university.edu</p>
      </footer>
    </div>
  )
}
