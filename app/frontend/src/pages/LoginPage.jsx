import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'
import '../styles/components/LoginPage.css'

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ssoConfig, setSsoConfig] = useState(null)
  const { login: authLogin, loginSSO } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/auth/sso/config')
      .then(res => res.json())
      .then(data => setSsoConfig(data))
      .catch(err => console.error('Failed to load SSO config:', err))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await authLogin(login, password)

    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  const renderSSOButtons = () => {
    if (!ssoConfig?.enabled || !ssoConfig?.providers?.length) {
      return null
    }

    return ssoConfig.providers.map(provider => {
      const handleSSOLogin = () => {
        window.location.href = provider.loginUrl
      }

      if (provider.id === 'azure-ad') {
        return (
          <button key={provider.id} onClick={handleSSOLogin} className="login-sso-button login-sso-microsoft">
            <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
              <path d="M0 0h11v11H0z" fill="#f25022"/>
              <path d="M12 0h11v11H12z" fill="#7fba00"/>
              <path d="M0 12h11v11H0z" fill="#00a4ef"/>
              <path d="M12 12h11v11H12z" fill="#ffb900"/>
            </svg>
            <span>{provider.name}</span>
          </button>
        )
      }

      if (provider.id === 'google') {
        return (
          <button key={provider.id} onClick={handleSSOLogin} className="login-sso-button login-sso-google">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>{provider.name}</span>
          </button>
        )
      }

      if (provider.id === 'github') {
        return (
          <button key={provider.id} onClick={handleSSOLogin} className="login-sso-button login-sso-github">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>{provider.name}</span>
          </button>
        )
      }

      if (provider.id === 'gitlab') {
        return (
          <button key={provider.id} onClick={handleSSOLogin} className="login-sso-button login-sso-gitlab">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC6D26">
              <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 00-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 00-.867 0L1.387 9.452.045 13.587a.924.924 0 00.331 1.03l11.625 8.456 11.625-8.456a.92.92 0 00.329-1.03"/>
            </svg>
            <span>{provider.name}</span>
          </button>
        )
      }

      return (
        <button key={provider.id} onClick={handleSSOLogin} className="login-sso-button">
          <Icon name="shield" size={20} />
          <span>{provider.name}</span>
        </button>
      )
    })
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <Icon name="university" size={32} color="var(--color-primary)" />
            <h1 className="login-title">AlmaDesk-Edu</h1>
          </div>
          <p className="login-subtitle">System obsługi zgłoszeń IT</p>
        </div>

        <div className="login-sso-buttons">
          {renderSSOButtons()}
        </div>

        {ssoConfig?.enabled && ssoConfig?.providers?.length > 0 && (
          <div className="login-divider">
            <hr className="login-divider-line" />
            <span className="login-divider-text">LUB</span>
            <hr className="login-divider-line" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Login:</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Wprowadź login"
              className="login-input"
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">Hasło:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wprowadź hasło"
              className="login-input"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="login-error">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            <Icon name="login" size={20} />
            <span>{loading ? 'Logowanie...' : 'Zaloguj'}</span>
          </button>
        </form>

        {}
        {import.meta.env.DEV && (
          <div className="login-footer">
            <Icon name="info" size={16} />
            <p>Testowe konta: admin/admin123!, agent/agent123, user/user123</p>
          </div>
        )}
      </div>
    </div>
  )
}
