import { useState, useEffect } from 'react'
import Icon from './Icon'
import '../styles/components/MFASettings.css'

export default function MFASettings() {
  const [mfaStatus, setMfaStatus] = useState({
    mfaEnabled: false,
    backupCodesCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState(1)
  const [qrCode, setQrCode] = useState('')
  const [manualKey, setManualKey] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [disablePassword, setDisablePassword] = useState('')
  const [disableToken, setDisableToken] = useState('')
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regenerateToken, setRegenerateToken] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMFAStatus()
  }, [])

  const fetchMFAStatus = async () => {
    try {
      const token = localStorage.getItem('almadesk_token')
      const res = await fetch('/api/auth/mfa/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setMfaStatus(data)
      }
    } catch (err) {
      console.error('MFA status fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSetupMFA = async () => {
    try {
      setError('')
      const token = localStorage.getItem('almadesk_token')
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Setup failed')
      }

      const data = await res.json()
      setQrCode(data.qrCode)
      setManualKey(data.manualEntryKey)
      setShowSetup(true)
      setSetupStep(1)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVerifyToken = async () => {
    try {
      setError('')
      const token = localStorage.getItem('almadesk_token')
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: verifyToken })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Invalid token')
      }

      setSetupStep(2)
      setVerifyToken('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEnableMFA = async () => {
    try {
      setError('')
      const token = localStorage.getItem('almadesk_token')
      const res = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: verifyToken })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Enable failed')
      }

      const data = await res.json()
      setBackupCodes(data.backupCodes)
      setSetupStep(3)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleFinishSetup = () => {
    setShowSetup(false)
    setSetupStep(1)
    setBackupCodes([])
    setVerifyToken('')
    fetchMFAStatus()
  }

  const handleDisableMFA = async () => {
    try {
      setError('')
      const token = localStorage.getItem('almadesk_token')
      const res = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: disablePassword,
          token: disableToken
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Disable failed')
      }

      setShowDisableModal(false)
      setDisablePassword('')
      setDisableToken('')
      fetchMFAStatus()
      alert('MFA wyłączone pomyślnie')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    try {
      setError('')
      const token = localStorage.getItem('almadesk_token')
      const res = await fetch('/api/auth/mfa/regenerate-backup-codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: regenerateToken })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Regenerate failed')
      }

      const data = await res.json()
      setBackupCodes(data.backupCodes)
      setShowRegenerateModal(false)
      setRegenerateToken('')
      fetchMFAStatus()
    } catch (err) {
      setError(err.message)
    }
  }

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'almadesk-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="mfa-settings-loading">Ładowanie...</div>
  }

  if (showSetup) {
    return (
      <div className="mfa-setup-modal">
        <div className="mfa-setup-content">
          <h2>Konfiguracja weryfikacji dwuetapowej (MFA)</h2>

          {setupStep === 1 && (
            <div className="mfa-setup-step">
              <h3>Krok 1: Zeskanuj kod QR</h3>
              <p>Użyj aplikacji authenticator (Google Authenticator, Authy, Microsoft Authenticator) aby zeskanować kod:</p>

              <div className="mfa-qr-code">
                <img src={qrCode} alt="QR Code" />
              </div>

              <div className="mfa-manual-entry">
                <p>Lub wprowadź klucz ręcznie:</p>
                <code>{manualKey}</code>
              </div>

              <button className="btn-primary" onClick={() => setSetupStep(2)}>
                Dalej
              </button>
            </div>
          )}

          {setupStep === 2 && (
            <div className="mfa-setup-step">
              <h3>Krok 2: Weryfikacja</h3>
              <p>Wprowadź 6-cyfrowy kod z aplikacji authenticator:</p>

              {error && <div className="mfa-error">{error}</div>}

              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                className="mfa-token-input"
              />

              <div className="mfa-setup-actions">
                <button className="btn-secondary" onClick={() => setSetupStep(1)}>
                  Wstecz
                </button>
                <button
                  className="btn-primary"
                  onClick={handleEnableMFA}
                  disabled={verifyToken.length !== 6}
                >
                  Włącz MFA
                </button>
              </div>
            </div>
          )}

          {setupStep === 3 && (
            <div className="mfa-setup-step">
              <h3>Krok 3: Zapisz kody zapasowe</h3>
              <p className="mfa-warning">
                <Icon name="alert-triangle" size={20} />
                Zapisz te kody w bezpiecznym miejscu. Możesz ich użyć do zalogowania gdy nie masz dostępu do aplikacji authenticator.
              </p>

              <div className="mfa-backup-codes">
                {backupCodes.map((code, index) => (
                  <code key={index}>{code}</code>
                ))}
              </div>

              <div className="mfa-setup-actions">
                <button className="btn-secondary" onClick={downloadBackupCodes}>
                  <Icon name="download" size={16} />
                  Pobierz kody
                </button>
                <button className="btn-primary" onClick={handleFinishSetup}>
                  Zakończ
                </button>
              </div>
            </div>
          )}

          <button className="mfa-close-btn" onClick={() => setShowSetup(false)}>
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mfa-settings">
      <h2>Weryfikacja dwuetapowa (MFA)</h2>
      <p className="mfa-description">
        Zwiększ bezpieczeństwo konta dodając dodatkową warstwę ochrony.
        Po włączeniu MFA będziesz musiał podać kod z aplikacji authenticator przy każdym logowaniu.
      </p>

      <div className="mfa-status-card">
        <div className="mfa-status-icon">
          {mfaStatus.mfaEnabled ? (
            <Icon name="shield-check" size={48} color="#10B981" />
          ) : (
            <Icon name="shield" size={48} color="#6B7280" />
          )}
        </div>

        <div className="mfa-status-info">
          <h3>{mfaStatus.mfaEnabled ? 'MFA włączone' : 'MFA wyłączone'}</h3>
          <p>
            {mfaStatus.mfaEnabled
              ? `Twoje konto jest chronione. Pozostało ${mfaStatus.backupCodesCount} kodów zapasowych.`
              : 'Twoje konto nie jest chronione weryfikacją dwuetapową.'}
          </p>
        </div>

        <div className="mfa-status-actions">
          {mfaStatus.mfaEnabled ? (
            <>
              <button
                className="btn-secondary"
                onClick={() => setShowRegenerateModal(true)}
              >
                Regeneruj kody zapasowe
              </button>
              <button
                className="btn-danger"
                onClick={() => setShowDisableModal(true)}
              >
                Wyłącz MFA
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={handleSetupMFA}>
              <Icon name="shield" size={16} />
              Włącz MFA
            </button>
          )}
        </div>
      </div>

      {}
      {showDisableModal && (
        <div className="mfa-modal-overlay">
          <div className="mfa-modal">
            <h3>Wyłącz weryfikację dwuetapową</h3>
            <p>Wprowadź hasło oraz opcjonalnie kod MFA:</p>

            {error && <div className="mfa-error">{error}</div>}

            <input
              type="password"
              placeholder="Hasło"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="mfa-input"
            />

            <input
              type="text"
              placeholder="Kod MFA (opcjonalnie)"
              maxLength={6}
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
              className="mfa-input"
            />

            <div className="mfa-modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowDisableModal(false)
                  setError('')
                  setDisablePassword('')
                  setDisableToken('')
                }}
              >
                Anuluj
              </button>
              <button
                className="btn-danger"
                onClick={handleDisableMFA}
                disabled={!disablePassword}
              >
                Wyłącz MFA
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showRegenerateModal && (
        <div className="mfa-modal-overlay">
          <div className="mfa-modal">
            <h3>Regeneruj kody zapasowe</h3>
            <p>Wprowadź kod MFA z aplikacji authenticator:</p>

            {error && <div className="mfa-error">{error}</div>}

            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={regenerateToken}
              onChange={(e) => setRegenerateToken(e.target.value.replace(/\D/g, ''))}
              className="mfa-token-input"
            />

            {backupCodes.length > 0 && (
              <div className="mfa-backup-codes">
                {backupCodes.map((code, index) => (
                  <code key={index}>{code}</code>
                ))}
              </div>
            )}

            <div className="mfa-modal-actions">
              {backupCodes.length > 0 ? (
                <>
                  <button className="btn-secondary" onClick={downloadBackupCodes}>
                    Pobierz kody
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setShowRegenerateModal(false)
                      setBackupCodes([])
                      setRegenerateToken('')
                    }}
                  >
                    Zamknij
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowRegenerateModal(false)
                      setError('')
                      setRegenerateToken('')
                    }}
                  >
                    Anuluj
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleRegenerateBackupCodes}
                    disabled={regenerateToken.length !== 6}
                  >
                    Regeneruj
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
