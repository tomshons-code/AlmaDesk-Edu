import { useState, useEffect } from 'react'
import { getSmtpSettings, updateSmtpSettings, testSmtpSettings, getSmtpPresets, getImapSettings, updateImapSettings, testImapSettings, triggerImapPoll } from '../api/settings'
import '../styles/components/EmailSettings.css'

const EmailSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [presets, setPresets] = useState({})
  const [selectedPreset, setSelectedPreset] = useState('custom')

  const [formData, setFormData] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_secure: 'false',
    smtp_from_email: '',
    smtp_from_name: 'AlmaDesk Support',
    smtp_provider: 'custom'
  })

  const [testEmail, setTestEmail] = useState('')

  const [imapSaving, setImapSaving] = useState(false)
  const [imapTesting, setImapTesting] = useState(false)
  const [imapPolling, setImapPolling] = useState(false)
  const [imapError, setImapError] = useState(null)
  const [imapSuccess, setImapSuccess] = useState(null)
  const [imapData, setImapData] = useState({
    imap_enabled: 'false',
    imap_host: '',
    imap_port: '993',
    imap_user: '',
    imap_password: '',
    imap_secure: 'true',
    imap_mailbox: 'INBOX',
    imap_poll_interval: '5'
  })

  useEffect(() => {
    loadSettings()
    loadPresets()
    loadImapSettings()
  }, [])

  const loadImapSettings = async () => {
    try {
      const s = await getImapSettings()
      setImapData(prev => ({ ...prev, ...s }))
    } catch (err) {
      console.error('IMAP load error:', err)
    }
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      const settings = await getSmtpSettings()

      const newFormData = { ...formData }
      Object.keys(settings).forEach(key => {
        if (settings[key] !== null) {
          newFormData[key] = settings[key]
        }
      })

      setFormData(newFormData)
      setSelectedPreset(newFormData.smtp_provider || 'custom')
    } catch (err) {
      setError('Nie udało się załadować ustawień SMTP')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadPresets = async () => {
    try {
      const presetsData = await getSmtpPresets()
      setPresets(presetsData)
    } catch (err) {
      console.error('Failed to load presets:', err)
    }
  }

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset)

    if (presets[preset]) {
      setFormData({
        ...formData,
        smtp_host: presets[preset].smtp_host || '',
        smtp_port: presets[preset].smtp_port || '587',
        smtp_secure: presets[preset].smtp_secure || 'false',
        smtp_provider: preset
      })
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      await updateSmtpSettings(formData)
      setSuccess('Ustawienia SMTP zostały zapisane pomyślnie')

      await loadSettings()
    } catch (err) {
      setError(err.message || 'Nie udało się zapisać ustawień')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) {
      setError('Wprowadź adres email do testu')
      return
    }

    setError(null)
    setSuccess(null)
    setTesting(true)

    try {
      const result = await testSmtpSettings(testEmail)
      if (result.success) {
        setSuccess(`Email testowy został wysłany na adres: ${testEmail}. Sprawdź skrzynkę odbiorczą.`)
      } else {
        const errorMsg = result.error || 'Nie udało się wysłać emaila testowego'

        if (errorMsg.includes('Application-specific password') || errorMsg.includes('InvalidSecondFactor')) {
          setError(`Gmail wymaga hasła aplikacji:\n\n${errorMsg}\n\nAby wygenerować hasło aplikacji:\n1. Wejdź na: https://myaccount.google.com/apppasswords\n2. Wybierz aplikację i urządzenie\n3. Skopiuj wygenerowane hasło i użyj go zamiast swojego zwykłego hasła`)
        } else if (errorMsg.includes('basic authentication is disabled') || errorMsg.includes('5.7.139')) {
          setError(`Office 365 wyłączył uwierzytelnianie podstawowe:\n\n${errorMsg}\n\nMicrosoft wyłączył podstawowe uwierzytelnianie SMTP. Musisz użyć hasła aplikacji:\n\n1. Wejdź na: https://account.microsoft.com/security (konta osobiste)\n   LUB dla kont firmowych: https://mysignins.microsoft.com/security-info\n\n2. Znajdź opcję "Hasła aplikacji" / "App passwords"\n\n3. Wygeneruj nowe hasło dla "Mail" lub "Other"\n\n4. Skopiuj wygenerowane hasło i użyj go w polu "Hasło"\n\nUWAGA: Jeśli nie widzisz opcji hasła aplikacji, skontaktuj się z administratorem IT`)
        } else if (errorMsg.includes('Invalid login') || errorMsg.includes('authentication')) {
          setError(`Błąd uwierzytelniania:\n\n${errorMsg}\n\nSprawdź:\n• Czy login i hasło są poprawne\n• Czy konto email jest aktywne\n• Czy serwer SMTP akceptuje połączenia z tego IP`)
        } else {
          setError(`${errorMsg}`)
        }
      }
    } catch (err) {
      const errorMsg = err.message || 'Nie udało się wysłać emaila testowego'

      if (errorMsg.includes('Application-specific password') || errorMsg.includes('InvalidSecondFactor')) {
        setError(`Gmail wymaga hasła aplikacji:\n\n${errorMsg}\n\nAby wygenerować hasło aplikacji:\n1. Wejdź na: https://myaccount.google.com/apppasswords\n2. Wybierz aplikację i urządzenie\n3. Skopiuj wygenerowane hasło i użyj go zamiast swojego zwykłego hasła`)
      } else if (errorMsg.includes('basic authentication is disabled') || errorMsg.includes('5.7.139')) {
        setError(`Office 365 wyłączył uwierzytelnianie podstawowe:\n\n${errorMsg}\n\nMicrosoft wyłączył podstawowe uwierzytelnianie SMTP. Musisz użyć hasła aplikacji:\n\n1. Wejdź na: https://account.microsoft.com/security (konta osobiste)\n   LUB dla kont firmowych: https://mysignins.microsoft.com/security-info\n\n2. Znajdź opcję "Hasła aplikacji" / "App passwords"\n\n3. Wygeneruj nowe hasło dla "Mail" lub "Other"\n\n4. Skopiuj wygenerowane hasło i użyj go w polu "Hasło"\n\nUWAGA: Jeśli nie widzisz opcji hasła aplikacji, skontaktuj się z administratorem IT`)
      } else if (errorMsg.includes('Invalid login') || errorMsg.includes('authentication')) {
        setError(`Błąd uwierzytelniania:\n\n${errorMsg}\n\nSprawdź:\n• Czy login i hasło są poprawne\n• Czy konto email jest aktywne\n• Czy serwer SMTP akceptuje połączenia z tego IP`)
      } else {
        setError(`${errorMsg}`)
      }
    } finally {
      setTesting(false)
    }
  }

  const handleImapChange = (e) => {
    const { name, value, type, checked } = e.target
    setImapData(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value }))
  }

  const handleImapSubmit = async (e) => {
    e.preventDefault()
    setImapError(null)
    setImapSuccess(null)
    setImapSaving(true)
    try {
      await updateImapSettings(imapData)
      setImapSuccess('Ustawienia IMAP zapisane. Polling jest aktywny.')
      await loadImapSettings()
    } catch (err) {
      setImapError(err.message || 'Błąd zapisu ustawień IMAP')
    } finally {
      setImapSaving(false)
    }
  }

  const handleImapTest = async () => {
    setImapError(null)
    setImapSuccess(null)
    setImapTesting(true)
    try {
      const result = await testImapSettings(imapData)
      setImapSuccess(result.message || 'Połączenie IMAP działa poprawnie')
    } catch (err) {
      setImapError(err.message || 'Nie udało się połączyć z serwerem IMAP')
    } finally {
      setImapTesting(false)
    }
  }

  const handleImapPoll = async () => {
    setImapError(null)
    setImapSuccess(null)
    setImapPolling(true)
    try {
      const result = await triggerImapPoll()
      setImapSuccess(result.message || 'Polling zakończony')
    } catch (err) {
      setImapError(err.message || 'Błąd pollingu')
    } finally {
      setImapPolling(false)
    }
  }

  if (loading) {
    return <div className="email-settings-loading">Ładowanie ustawień email...</div>
  }

  const currentPreset = presets[selectedPreset]

  return (
    <div className="email-settings">
      <h2>Konfiguracja Email (SMTP)</h2>
      <p className="email-settings-description">
        Skonfiguruj serwer SMTP do wysyłania powiadomień email o nowych zgłoszeniach, zmianach statusu i komentarzach.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {}
      <div className="preset-selector">
        <label>Wybierz dostawcę email:</label>
        <div className="preset-buttons">
          <button
            type="button"
            className={`preset-btn ${selectedPreset === 'office365' ? 'active' : ''}`}
            onClick={() => handlePresetChange('office365')}
          >
            <span className="preset-icon">🏢</span>
            Microsoft 365 / Office 365
          </button>
          <button
            type="button"
            className={`preset-btn ${selectedPreset === 'google' ? 'active' : ''}`}
            onClick={() => handlePresetChange('google')}
          >
            <span className="preset-icon">📧</span>
            Google Gmail / Workspace
          </button>
          <button
            type="button"
            className={`preset-btn ${selectedPreset === 'custom' ? 'active' : ''}`}
            onClick={() => handlePresetChange('custom')}
          >
            <span className="preset-icon">⚙️</span>
            Niestandardowy
          </button>
        </div>

        {currentPreset && (
          <div className="preset-info">
            <h4>{currentPreset.name}</h4>
            <p>{currentPreset.description}</p>
            {currentPreset.instructions && (
              <ul className="preset-instructions">
                {currentPreset.instructions.map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {}
      <form onSubmit={handleSubmit} className="email-settings-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="smtp_host">Host SMTP *</label>
            <input
              type="text"
              id="smtp_host"
              name="smtp_host"
              value={formData.smtp_host}
              onChange={handleChange}
              placeholder={currentPreset?.smtp_host || 'smtp.example.com'}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtp_port">Port *</label>
            <input
              type="number"
              id="smtp_port"
              name="smtp_port"
              value={formData.smtp_port}
              onChange={handleChange}
              placeholder="587"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtp_user">Użytkownik *</label>
            <input
              type="text"
              id="smtp_user"
              name="smtp_user"
              value={formData.smtp_user}
              onChange={handleChange}
              placeholder={currentPreset?.userPlaceholder || 'uzytkownik@domena.pl'}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtp_password">Hasło *</label>
            <input
              type="password"
              id="smtp_password"
              name="smtp_password"
              value={formData.smtp_password}
              onChange={handleChange}
              placeholder="••••••••"
            />
            <small className="form-hint">Pozostaw puste aby nie zmieniać hasła</small>
          </div>

          <div className="form-group">
            <label htmlFor="smtp_from_email">Email nadawcy *</label>
            <input
              type="email"
              id="smtp_from_email"
              name="smtp_from_email"
              value={formData.smtp_from_email}
              onChange={handleChange}
              placeholder="noreply@almadesk.edu"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtp_from_name">Nazwa nadawcy *</label>
            <input
              type="text"
              id="smtp_from_name"
              name="smtp_from_name"
              value={formData.smtp_from_name}
              onChange={handleChange}
              placeholder="AlmaDesk Support"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtp_secure">Szyfrowanie</label>
            <select
              id="smtp_secure"
              name="smtp_secure"
              value={formData.smtp_secure}
              onChange={handleChange}
            >
              <option value="false">TLS/STARTTLS (port 587)</option>
              <option value="true">SSL (port 465)</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </button>
        </div>
      </form>

      {}
      <div className="test-email-section">
        <h3>Testuj konfigurację</h3>
        <p>Wyślij email testowy aby sprawdzić czy konfiguracja działa prawidłowo.</p>

        <div className="test-email-form">
          <input
            type="email"
            placeholder="adres@email.pl"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="test-email-input"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !testEmail}
            className="btn btn-secondary"
          >
            {testing ? 'Wysyłanie...' : 'Wyślij email testowy'}
          </button>
        </div>
      </div>

      {}
      <div className="imap-settings-section">
        <h2>Odbiór email → Zgłoszenia (IMAP)</h2>
        <p className="email-settings-description">
          System automatycznie sprawdza skrzynkę pocztową i tworzy zgłoszenia z przychodzących maili.
          Tytuł maila staje się tytułem zgłoszenia, treść maila — opisem.
        </p>

        {imapError && <div className="alert alert-error">{imapError}</div>}
        {imapSuccess && <div className="alert alert-success">{imapSuccess}</div>}

        <div className="imap-toggle-row">
          <label className="imap-toggle-label">
            <input
              type="checkbox"
              name="imap_enabled"
              checked={imapData.imap_enabled === 'true'}
              onChange={handleImapChange}
            />
            <span>Włącz polling IMAP</span>
          </label>
        </div>

        <form onSubmit={handleImapSubmit} className="email-settings-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Host IMAP *</label>
              <input
                type="text"
                name="imap_host"
                value={imapData.imap_host}
                onChange={handleImapChange}
                placeholder="imap.gmail.com"
                required={imapData.imap_enabled === 'true'}
              />
            </div>
            <div className="form-group">
              <label>Port</label>
              <input
                type="number"
                name="imap_port"
                value={imapData.imap_port}
                onChange={handleImapChange}
                placeholder="993"
              />
            </div>
            <div className="form-group">
              <label>Login (email) *</label>
              <input
                type="text"
                name="imap_user"
                value={imapData.imap_user}
                onChange={handleImapChange}
                placeholder="helpdesk@uczelnia.pl"
              />
            </div>
            <div className="form-group">
              <label>Hasło *</label>
              <input
                type="password"
                name="imap_password"
                value={imapData.imap_password}
                onChange={handleImapChange}
                placeholder="••••••••"
              />
              <small className="form-hint">Pozostaw puste aby nie zmieniać hasła</small>
            </div>
            <div className="form-group">
              <label>Skrzynka</label>
              <input
                type="text"
                name="imap_mailbox"
                value={imapData.imap_mailbox}
                onChange={handleImapChange}
                placeholder="INBOX"
              />
            </div>
            <div className="form-group">
              <label>Interwał pollingu (min)</label>
              <input
                type="number"
                name="imap_poll_interval"
                value={imapData.imap_poll_interval}
                onChange={handleImapChange}
                min="1"
                max="60"
                placeholder="5"
              />
            </div>
            <div className="form-group">
              <label>Szyfrowanie SSL</label>
              <select name="imap_secure" value={imapData.imap_secure} onChange={handleImapChange}>
                <option value="true">SSL (port 993)</option>
                <option value="false">STARTTLS (port 143)</option>
              </select>
            </div>
          </div>

          <div className="form-actions imap-actions">
            <button type="submit" className="btn btn-primary" disabled={imapSaving}>
              {imapSaving ? 'Zapisywanie...' : 'Zapisz IMAP'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleImapTest} disabled={imapTesting}>
              {imapTesting ? 'Testowanie...' : 'Testuj połączenie'}
            </button>
            {imapData.imap_enabled === 'true' && (
              <button type="button" className="btn btn-secondary" onClick={handleImapPoll} disabled={imapPolling}>
                {imapPolling ? 'Sprawdzam...' : '▶ Sprawdź skrzynkę teraz'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmailSettings
