import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeSelector from '../components/ThemeSelector'
import ResponseTemplates from '../components/ResponseTemplates'
import EmailSettings from '../components/EmailSettings'
import SSOSettings from '../components/SSOSettings'
import CategoryMappings from '../components/CategoryMappings'
import AuditLog from '../components/AuditLog'
import MFASettings from '../components/MFASettings'
import TagManager from '../components/TagManager'
import Icon from '../components/Icon'
import '../styles/components/SettingsPage.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    agentSignature: user?.agentSignature || '',
    notifications: {
      email: user?.notifyEmail ?? true,
      browser: user?.notifyBrowser ?? true,
      ticketUpdates: user?.notifyTicketUpdates ?? true,
      assignments: user?.notifyAssignments ?? true
    }
  })
  const [brandingSettings, setBrandingSettings] = useState({
    companyName: 'AlmaDesk-Edu',
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    logoUrl: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNotificationChange = (key) => {
    setFormData(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] }
    }))
  }

  const handleBrandingChange = (e) => {
    const { name, value } = e.target
    setBrandingSettings(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveAccount = async () => {
    try {
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          agentSignature: formData.agentSignature
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const data = await response.json()

      alert('Profil zaktualizowany pomyślnie!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Błąd podczas zapisywania profilu')
    }
  }

  const saveBrandingSettings = () => {
    alert('Ustawienia brandingu zapisane!')
  }

  const handleSaveNotifications = async () => {
    try {
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notifyEmail: formData.notifications.email,
          notifyBrowser: formData.notifications.browser,
          notifyTicketUpdates: formData.notifications.ticketUpdates,
          notifyAssignments: formData.notifications.assignments
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save notification preferences')
      }

      alert('Preferencje powiadomień zapisane!')
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      alert('Błąd podczas zapisywania preferencji powiadomień')
    }
  }

  const resetBranding = () => {
    setBrandingSettings({
      companyName: 'AlmaDesk-Edu',
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      logoUrl: ''
    })
  }

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const isAgent = user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  return (
    <div className="settings-wrapper">
      {}
      <div className="settings-topbar">
        <button className="settings-back-btn" onClick={() => navigate(-1)}>
          ← Powrót
        </button>
        <div className="settings-user-info">
          <span className="settings-user-name">{user?.name}</span>
          <span className="settings-user-role">{user?.role}</span>
          <button onClick={logout} className="settings-logout-btn">
            <Icon name="log-out" size={16} /> Wyloguj
          </button>
        </div>
      </div>

      <div className="settings-container">
        {}
        <aside className="settings-sidebar">
          <h1 className="settings-main-title">
            <Icon name="settings" size={28} />
            Ustawienia
          </h1>

          <nav className="settings-nav">
            <button
              className={`settings-nav-item ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <Icon name="user" size={20} />
              Konto
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Icon name="settings" size={20} />
              Wygląd
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Icon name="bell" size={20} />
              Powiadomienia
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Icon name="shield" size={20} />
              Bezpieczeństwo
            </button>
            {isAgent && (
              <>
                <button
                  className={`settings-nav-item ${activeTab === 'templates' ? 'active' : ''}`}
                  onClick={() => setActiveTab('templates')}
                >
                  <Icon name="template" size={20} />
                  Szablony
                </button>
                <button
                  className={`settings-nav-item ${activeTab === 'tags' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tags')}
                >
                  <Icon name="tag" size={20} />
                  Zarządzanie tagami
                </button>
              </>
            )}
            {isAdmin && (
              <>
                <div className="settings-nav-divider"></div>
                <button
                  className={`settings-nav-item ${activeTab === 'branding' ? 'active' : ''}`}
                  onClick={() => setActiveTab('branding')}
                >
                  <Icon name="crown" size={20} />
                  Branding
                </button>
                {isSuperAdmin && (
                  <>
                    <button
                      className={`settings-nav-item ${activeTab === 'email' ? 'active' : ''}`}
                      onClick={() => setActiveTab('email')}
                    >
                      <Icon name="mail" size={20} />
                      Email (SMTP)
                    </button>
                    <button
                      className={`settings-nav-item ${activeTab === 'category-mapping' ? 'active' : ''}`}
                      onClick={() => setActiveTab('category-mapping')}
                    >
                      <Icon name="tag" size={20} />
                      Mapowanie Kategorii
                    </button>
                    <button
                      className={`settings-nav-item ${activeTab === 'audit' ? 'active' : ''}`}
                      onClick={() => setActiveTab('audit')}
                    >
                      <Icon name="list" size={20} />
                      Log audytu
                    </button>
                    <button
                      className={`settings-nav-item ${activeTab === 'sso' ? 'active' : ''}`}
                      onClick={() => setActiveTab('sso')}
                    >
                      <Icon name="shield" size={20} />
                      Konfiguracja SSO
                    </button>
                  </>
                )}
                <button
                  className={`settings-nav-item ${activeTab === 'system' ? 'active' : ''}`}
                  onClick={() => setActiveTab('system')}
                >
                  <Icon name="dashboard" size={20} />
                  System
                </button>
              </>
            )}
          </nav>
        </aside>

        {}
        <main className="settings-content">
          {activeTab === 'account' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="user" size={24} /> Informacje o koncie</h2>
                <p>Zarządzaj swoimi danymi osobowymi</p>
              </div>

              <div className="settings-card">
                <div className="settings-form-group">
                  <label className="settings-label">Login</label>
                  <input
                    type="text"
                    value={user?.login}
                    disabled
                    className="settings-input disabled"
                  />
                  <small className="settings-hint">Login nie może być zmieniony</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Imię i nazwisko</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="settings-input"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="settings-input"
                  />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label className="settings-label">Telefon</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="settings-input"
                      placeholder="+48 123 456 789"
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Wydział/Jednostka</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="settings-input"
                      placeholder="np. Wydział Informatyki"
                    />
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Rola</label>
                  <div className="settings-role-badge">{user?.role}</div>
                  <small className="settings-hint">
                    Uprawnienia może zmieniać tylko administrator w zakładce Użytkownicy
                  </small>
                </div>

                {isAgent && (
                  <div className="settings-form-group">
                    <label className="settings-label">
                      <Icon name="edit" size={16} /> Podpis agenta (automatycznie dodawany do odpowiedzi)
                    </label>
                    <textarea
                      name="agentSignature"
                      value={formData.agentSignature}
                      onChange={handleInputChange}
                      className="settings-textarea"
                      placeholder="Pozdrawiam,\nJan Kowalski\nDział IT\ntel. +48 123 456 789"
                      rows={4}
                    />
                    <small className="settings-hint">
                      Ten podpis będzie automatycznie dodawany na końcu każdej odpowiedzi do zgłoszenia
                    </small>
                  </div>
                )}

                <button className="settings-save-btn" onClick={handleSaveAccount}>
                  <Icon name="check" size={18} /> Zapisz zmiany
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="settings" size={24} /> Wygląd aplikacji</h2>
                <p>Dostosuj motywy kolorystyczne do swoich preferencji</p>
              </div>

              <div className="settings-card">
                <ThemeSelector />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="bell" size={24} /> Powiadomienia</h2>
                <p>Zarządzaj powiadomieniami o zgłoszeniach</p>
              </div>

              <div className="settings-card">
                <div className="settings-notification-item">
                  <div className="settings-notification-info">
                    <h4>Powiadomienia email</h4>
                    <p>Otrzymuj powiadomienia na adres email</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={formData.notifications.email}
                      onChange={() => handleNotificationChange('email')}
                    />
                    <span className="settings-toggle-slider"></span>
                  </label>
                </div>

                <div className="settings-notification-item">
                  <div className="settings-notification-info">
                    <h4>Powiadomienia w przeglądarce</h4>
                    <p>Wyświetlaj powiadomienia push w przeglądarce</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={formData.notifications.browser}
                      onChange={() => handleNotificationChange('browser')}
                    />
                    <span className="settings-toggle-slider"></span>
                  </label>
                </div>

                <div className="settings-notification-item">
                  <div className="settings-notification-info">
                    <h4>Aktualizacje zgłoszeń</h4>
                    <p>Powiadomienia o zmianach statusu zgłoszeń</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={formData.notifications.ticketUpdates}
                      onChange={() => handleNotificationChange('ticketUpdates')}
                    />
                    <span className="settings-toggle-slider"></span>
                  </label>
                </div>

                <div className="settings-notification-item">
                  <div className="settings-notification-info">
                    <h4>Nowe przypisania</h4>
                    <p>Powiadomienia gdy zgłoszenie zostanie Ci przypisane</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={formData.notifications.assignments}
                      onChange={() => handleNotificationChange('assignments')}
                    />
                    <span className="settings-toggle-slider"></span>
                  </label>
                </div>

                <button className="settings-save-btn" onClick={handleSaveNotifications}>
                  <Icon name="check" size={18} /> Zapisz preferencje
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="shield" size={24} /> Bezpieczeństwo</h2>
                <p>Zarządzaj ustawieniami bezpieczeństwa konta</p>
              </div>
              <MFASettings />
            </div>
          )}

          {activeTab === 'templates' && isAgent && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="template" size={24} /> Szablony odpowiedzi</h2>
                <p>Zarządzaj szablonami odpowiedzi do szybszego reagowania na zgłoszenia</p>
              </div>

              <div className="settings-card">
                <ResponseTemplates />
              </div>
            </div>
          )}

          {activeTab === 'tags' && isAgent && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="tag" size={24} /> Zarządzanie tagami</h2>
                <p>Twórz i zarządzaj tagami używanymi do klasyfikacji zgłoszeń</p>
              </div>

              <div className="settings-card">
                <TagManager />
              </div>
            </div>
          )}

          {activeTab === 'branding' && isAdmin && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="crown" size={24} /> Branding systemu</h2>
                <p>Dostosuj wygląd systemu do brandingu Twojej organizacji</p>
              </div>

              <div className="settings-card">
                <div className="settings-form-group">
                  <label className="settings-label">Nazwa systemu</label>
                  <input
                    type="text"
                    name="companyName"
                    value={brandingSettings.companyName}
                    onChange={handleBrandingChange}
                    className="settings-input"
                    placeholder="np. Helpdesk Uniwersytetu"
                  />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label className="settings-label">Kolor główny</label>
                    <div className="settings-color-picker">
                      <input
                        type="color"
                        name="primaryColor"
                        value={brandingSettings.primaryColor}
                        onChange={handleBrandingChange}
                        className="settings-color-input"
                      />
                      <input
                        type="text"
                        value={brandingSettings.primaryColor}
                        readOnly
                        className="settings-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Kolor dodatkowy</label>
                    <div className="settings-color-picker">
                      <input
                        type="color"
                        name="secondaryColor"
                        value={brandingSettings.secondaryColor}
                        onChange={handleBrandingChange}
                        className="settings-color-input"
                      />
                      <input
                        type="text"
                        value={brandingSettings.secondaryColor}
                        readOnly
                        className="settings-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">URL logo</label>
                  <input
                    type="url"
                    name="logoUrl"
                    value={brandingSettings.logoUrl}
                    onChange={handleBrandingChange}
                    className="settings-input"
                    placeholder="https://example.com/logo.png"
                  />
                  <small className="settings-hint">Zalecany rozmiar: 200x50px</small>
                </div>

                <div className="settings-branding-preview">
                  <h4>Podgląd:</h4>
                  <div
                    className="settings-branding-sample"
                    style={{
                      background: `linear-gradient(135deg, ${brandingSettings.primaryColor}, ${brandingSettings.secondaryColor})`
                    }}
                  >
                    <span>{brandingSettings.companyName}</span>
                  </div>
                </div>

                <div className="settings-button-group">
                  <button className="settings-save-btn" onClick={saveBrandingSettings}>
                    <Icon name="check" size={18} /> Zastosuj branding
                  </button>
                  <button className="settings-secondary-btn" onClick={resetBranding}>
                    Reset do domyślnych
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && isAdmin && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="dashboard" size={24} /> Ustawienia systemowe</h2>
                <p>Konfiguracja zaawansowana dla administratorów</p>
              </div>

              <div className="settings-card">
                <div className="settings-info-box">
                  <Icon name="info" size={20} />
                  <div>
                    <h4>Panel administracyjny w budowie</h4>
                    <p>Tutaj będą dostępne zaawansowane opcje konfiguracji systemu, zarządzanie użytkownikami, role i uprawnienia.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && isSuperAdmin && (
            <div className="settings-section">
              <EmailSettings />
            </div>
          )}

          {activeTab === 'category-mapping' && isSuperAdmin && (
            <div className="settings-section">
              <CategoryMappings />
            </div>
          )}

          {activeTab === 'audit' && isSuperAdmin && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="list" size={24} /> Log audytu systemu</h2>
                <p>Historia operacji i aktywności użytkowników w systemie</p>
              </div>
              <div className="settings-card">
                <AuditLog />
              </div>
            </div>
          )}

          {activeTab === 'sso' && isSuperAdmin && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2><Icon name="shield" size={24} /> Konfiguracja SSO</h2>
                <p>Zarządzaj dostawcami Single Sign-On (SSO) dla systemu</p>
              </div>
              <div className="settings-card">
                <SSOSettings />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
