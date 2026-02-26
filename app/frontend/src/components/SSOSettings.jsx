import { useState, useEffect } from 'react'
import Icon from './Icon'
import '../styles/components/SSOSettings.css'

const SSOSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [formData, setFormData] = useState({
    sso_enabled: 'false',
    sso_azure_enabled: 'false',
    sso_azure_tenant_id: '',
    sso_azure_client_id: '',
    sso_azure_client_secret: '',
    sso_azure_display_name: 'Zaloguj przez Microsoft',
    sso_google_enabled: 'false',
    sso_google_client_id: '',
    sso_google_client_secret: '',
    sso_google_display_name: 'Zaloguj przez Google',
    sso_github_enabled: 'false',
    sso_github_client_id: '',
    sso_github_client_secret: '',
    sso_github_display_name: 'Zaloguj przez GitHub',
    sso_gitlab_enabled: 'false',
    sso_gitlab_url: 'https://gitlab.com',
    sso_gitlab_client_id: '',
    sso_gitlab_client_secret: '',
    sso_gitlab_display_name: 'Zaloguj przez GitLab'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/settings/sso', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const settings = await response.json()
        const newFormData = { ...formData }
        Object.keys(settings).forEach(key => {
          if (settings[key] !== null) {
            newFormData[key] = settings[key]
          }
        })
        setFormData(newFormData)
      } else {
        setError('Nie udało się załadować ustawień SSO')
      }
    } catch (err) {
      setError('Błąd podczas ładowania ustawień SSO')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/settings/sso', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(result.message || 'Ustawienia SSO zostały zapisane i zsynchronizowane z Keycloak!')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError('Nie udało się zapisać ustawień SSO')
      }
    } catch (err) {
      setError('Błąd podczas zapisywania ustawień SSO')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      setSuccess(null)

      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/settings/sso/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(result.message || 'Synchronizacja z Keycloak zakończona pomyślnie!')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        const errorData = await response.json()
        setError('Błąd synchronizacji: ' + (errorData.error || 'Nieznany błąd'))
      }
    } catch (err) {
      setError('Błąd podczas synchronizacji z Keycloak')
      console.error(err)
    } finally {
      setSyncing(false)
    }
  }

  const toggleProvider = (provider) => {
    const field = `sso_${provider}_enabled`
    const newValue = formData[field] === 'true' ? 'false' : 'true'
    handleChange(field, newValue)
  }

  const toggleMainSSO = () => {
    const newValue = formData.sso_enabled === 'true' ? 'false' : 'true'
    handleChange('sso_enabled', newValue)
  }

  if (loading) {
    return (
      <div className="sso-settings-loading">
        <Icon name="loader" size={32} />
        <p>Ładowanie ustawień SSO...</p>
      </div>
    )
  }

  return (
    <div className="sso-settings">
      <div className="sso-settings-header">
        <h2>
          <Icon name="shield" size={24} />
          Logowanie SSO (Single Sign-On)
        </h2>
        <p className="sso-settings-subtitle">
          Skonfiguruj zewnętrznych dostawców uwierzytelniania dla użytkowników
        </p>
      </div>

      {error && (
        <div className="sso-alert sso-alert-error">
          <Icon name="alert-circle" size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="sso-alert sso-alert-success">
          <Icon name="check-circle" size={20} />
          {success}
        </div>
      )}

      {}
      <div className="sso-main-toggle">
        <div className="sso-toggle-label">
          <strong>Włącz logowanie SSO</strong>
          <span className="sso-toggle-desc">Globalne włączenie/wyłączenie SSO</span>
        </div>
        <button
          className={`sso-toggle-btn ${formData.sso_enabled === 'true' ? 'active' : ''}`}
          onClick={toggleMainSSO}
        >
          <span className="sso-toggle-slider"></span>
        </button>
      </div>

      {}
      <div className="sso-provider-card">
        <div className="sso-provider-header">
          <div className="sso-provider-title">
            <div className="sso-provider-icon sso-icon-microsoft">
              <svg width="24" height="24" viewBox="0 0 23 23" fill="none">
                <path d="M0 0h11v11H0z" fill="#f25022"/>
                <path d="M12 0h11v11H12z" fill="#7fba00"/>
                <path d="M0 12h11v11H0z" fill="#00a4ef"/>
                <path d="M12 12h11v11H12z" fill="#ffb900"/>
              </svg>
            </div>
            <div>
              <h3>Microsoft / Azure AD</h3>
              <p>Logowanie przez konta Microsoft 365 / Azure AD</p>
            </div>
          </div>
          <button
            className={`sso-toggle-btn ${formData.sso_azure_enabled === 'true' ? 'active' : ''}`}
            onClick={() => toggleProvider('azure')}
          >
            <span className="sso-toggle-slider"></span>
          </button>
        </div>

        {formData.sso_azure_enabled === 'true' && (
          <div className="sso-provider-config">
            <div className="sso-form-group">
              <label>Nazwa przycisku logowania</label>
              <input
                type="text"
                value={formData.sso_azure_display_name}
                onChange={(e) => handleChange('sso_azure_display_name', e.target.value)}
                placeholder="Zaloguj przez Microsoft"
              />
            </div>
            <div className="sso-form-group">
              <label>Azure Tenant ID</label>
              <input
                type="text"
                value={formData.sso_azure_tenant_id}
                onChange={(e) => handleChange('sso_azure_tenant_id', e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div className="sso-form-group">
              <label>Application (Client) ID</label>
              <input
                type="text"
                value={formData.sso_azure_client_id}
                onChange={(e) => handleChange('sso_azure_client_id', e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div className="sso-form-group">
              <label>Client Secret</label>
              <input
                type="password"
                value={formData.sso_azure_client_secret}
                onChange={(e) => handleChange('sso_azure_client_secret', e.target.value)}
                placeholder="••••••••••••••••"
              />
              <small>Wygenerowany w Azure Portal → Certificates & secrets</small>
            </div>
          </div>
        )}
      </div>

      {}
      <div className="sso-provider-card">
        <div className="sso-provider-header">
          <div className="sso-provider-title">
            <div className="sso-provider-icon sso-icon-google">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <h3>Google Workspace</h3>
              <p>Logowanie przez konta @gmail.com lub Google Workspace</p>
            </div>
          </div>
          <button
            className={`sso-toggle-btn ${formData.sso_google_enabled === 'true' ? 'active' : ''}`}
            onClick={() => toggleProvider('google')}
          >
            <span className="sso-toggle-slider"></span>
          </button>
        </div>

        {formData.sso_google_enabled === 'true' && (
          <div className="sso-provider-config">
            <div className="sso-form-group">
              <label>Nazwa przycisku logowania</label>
              <input
                type="text"
                value={formData.sso_google_display_name}
                onChange={(e) => handleChange('sso_google_display_name', e.target.value)}
                placeholder="Zaloguj przez Google"
              />
            </div>
            <div className="sso-form-group">
              <label>Google Client ID</label>
              <input
                type="text"
                value={formData.sso_google_client_id}
                onChange={(e) => handleChange('sso_google_client_id', e.target.value)}
                placeholder="xxxxxxxxxxxxx.apps.googleusercontent.com"
              />
              <small>Z Google Cloud Console → APIs & Services → Credentials</small>
            </div>
            <div className="sso-form-group">
              <label>Client Secret</label>
              <input
                type="password"
                value={formData.sso_google_client_secret}
                onChange={(e) => handleChange('sso_google_client_secret', e.target.value)}
                placeholder="••••••••••••••••"
              />
            </div>
          </div>
        )}
      </div>

      {}
      <div className="sso-provider-card">
        <div className="sso-provider-header">
          <div className="sso-provider-title">
            <div className="sso-provider-icon sso-icon-github">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <div>
              <h3>GitHub</h3>
              <p>Logowanie przez konta GitHub (dla programistów/IT)</p>
            </div>
          </div>
          <button
            className={`sso-toggle-btn ${formData.sso_github_enabled === 'true' ? 'active' : ''}`}
            onClick={() => toggleProvider('github')}
          >
            <span className="sso-toggle-slider"></span>
          </button>
        </div>

        {formData.sso_github_enabled === 'true' && (
          <div className="sso-provider-config">
            <div className="sso-form-group">
              <label>Nazwa przycisku logowania</label>
              <input
                type="text"
                value={formData.sso_github_display_name}
                onChange={(e) => handleChange('sso_github_display_name', e.target.value)}
                placeholder="Zaloguj przez GitHub"
              />
            </div>
            <div className="sso-form-group">
              <label>GitHub Client ID</label>
              <input
                type="text"
                value={formData.sso_github_client_id}
                onChange={(e) => handleChange('sso_github_client_id', e.target.value)}
                placeholder="Iv1.xxxxxxxxxxxxxxxx"
              />
              <small>Z GitHub Settings → Developer settings → OAuth Apps</small>
            </div>
            <div className="sso-form-group">
              <label>Client Secret</label>
              <input
                type="password"
                value={formData.sso_github_client_secret}
                onChange={(e) => handleChange('sso_github_client_secret', e.target.value)}
                placeholder="••••••••••••••••"
              />
            </div>
          </div>
        )}
      </div>

      {}
      <div className="sso-provider-card">
        <div className="sso-provider-header">
          <div className="sso-provider-title">
            <div className="sso-provider-icon sso-icon-gitlab">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.6 11.2l-1.2-3.7-2.4-7.3c-.1-.4-.4-.6-.7-.6-.3 0-.6.2-.7.6l-2.4 7.3H7.8L5.4.9c-.1-.4-.4-.6-.7-.6-.3 0-.6.2-.7.6L1.6 11.2c-.2.5 0 1.1.5 1.4l9.9 7.2 9.9-7.2c.5-.3.7-.9.5-1.4zM12 17.8l-3.7-11.3h7.4L12 17.8z"/>
              </svg>
            </div>
            <div>
              <h3>GitLab</h3>
              <p>Logowanie przez GitLab (self-hosted lub gitlab.com)</p>
            </div>
          </div>
          <button
            className={`sso-toggle-btn ${formData.sso_gitlab_enabled === 'true' ? 'active' : ''}`}
            onClick={() => toggleProvider('gitlab')}
          >
            <span className="sso-toggle-slider"></span>
          </button>
        </div>

        {formData.sso_gitlab_enabled === 'true' && (
          <div className="sso-provider-config">
            <div className="sso-form-group">
              <label>Nazwa przycisku logowania</label>
              <input
                type="text"
                value={formData.sso_gitlab_display_name}
                onChange={(e) => handleChange('sso_gitlab_display_name', e.target.value)}
                placeholder="Zaloguj przez GitLab"
              />
            </div>
            <div className="sso-form-group">
              <label>GitLab URL</label>
              <input
                type="text"
                value={formData.sso_gitlab_url}
                onChange={(e) => handleChange('sso_gitlab_url', e.target.value)}
                placeholder="https://gitlab.com"
              />
              <small>Dla self-hosted: https:
            </div>
            <div className="sso-form-group">
              <label>Application ID</label>
              <input
                type="text"
                value={formData.sso_gitlab_client_id}
                onChange={(e) => handleChange('sso_gitlab_client_id', e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxx"
              />
              <small>Z GitLab Admin → Applications</small>
            </div>
            <div className="sso-form-group">
              <label>Secret</label>
              <input
                type="password"
                value={formData.sso_gitlab_client_secret}
                onChange={(e) => handleChange('sso_gitlab_client_secret', e.target.value)}
                placeholder="••••••••••••••••"
              />
            </div>
          </div>
        )}
      </div>

      {}
      <div className="sso-settings-footer">
        <button
          className="sso-sync-btn"
          onClick={handleSync}
          disabled={syncing || saving}
          title="Synchronizuj ustawienia z Keycloak"
        >
          {syncing ? (
            <>
              <Icon name="loader" size={18} />
              Synchronizacja...
            </>
          ) : (
            <>
              <Icon name="refresh-cw" size={18} />
              Synchronizuj z Keycloak
            </>
          )}
        </button>
        <button
          className="sso-save-btn"
          onClick={handleSave}
          disabled={saving || syncing}
        >
          {saving ? (
            <>
              <Icon name="loader" size={18} />
              Zapisywanie...
            </>
          ) : (
            <>
              <Icon name="check" size={18} />
              Zapisz ustawienia SSO
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default SSOSettings
