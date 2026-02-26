import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import '../../styles/pages/RecurringAlerts.css'

export default function RecurringAlerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ACTIVE')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [actionNotes, setActionNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchAlerts()
    fetchStats()
  }, [filter])

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('almadesk_token')
      const url = `/api/recurring-alerts?status=${filter}`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/recurring-alerts/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleAction = async (alertId, action) => {
    if (!actionNotes && action === 'resolve') {
      alert('Notatki rozwiązania są wymagane')
      return
    }

    setActionLoading(true)
    try {
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch(`/api/recurring-alerts/${alertId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: actionNotes })
      })

      const data = await response.json()
      if (data.success) {
        setSelectedAlert(null)
        setActionNotes('')
        fetchAlerts()
        fetchStats()
      } else {
        alert(data.error || 'Akcja nie powiodła się')
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert('Nie udało się wykonać akcji')
    } finally {
      setActionLoading(false)
    }
  }

  const triggerAnalysis = async () => {
    if (!confirm('Czy na pewno chcesz uruchomić analizę?')) return

    try {
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/recurring-alerts/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        alert('Analiza uruchomiona w tle. Wyniki pojawią się za kilka sekund.')
        setTimeout(fetchAlerts, 5000)
      }
    } catch (error) {
      console.error('Failed to trigger analysis:', error)
    }
  }

  const getSeverityClass = (severity) => {
    return `severity-${severity.toLowerCase()}`
  }

  const getSeverityLabel = (severity) => {
    return {
      LOW: 'Niski',
      MEDIUM: 'Średni',
      HIGH: 'Wysoki',
      CRITICAL: 'Krytyczny'
    }[severity] || severity
  }

  const getStatusLabel = (status) => {
    return {
      ACTIVE: 'Aktywny',
      ACKNOWLEDGED: 'Potwierdzony',
      RESOLVED: 'Rozwiązany',
      DISMISSED: 'Odrzucony'
    }[status] || status
  }

  if (!user || !['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return (
      <div className="access-denied">
        <Icon name="alert" size={48} />
        <h2>Brak dostępu</h2>
        <p>Ten panel jest dostępny tylko dla agentów i administratorów.</p>
      </div>
    )
  }

  return (
    <div className="recurring-alerts-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Icon name="alert" size={28} />
            Nawracające problemy
          </h1>
          <p className="page-subtitle">
            Automatyczna detekcja powtarzających się zgłoszeń wymagających uwagi
          </p>
        </div>
        {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
          <button onClick={triggerAnalysis} className="btn btn-secondary">
            <Icon name="refresh" size={18} />
            Uruchom analizę
          </button>
        )}
      </div>

      {stats && (
        <div className="alerts-stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-total">
              <Icon name="list" size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Wszystkie</div>
              <div className="stat-value">{stats.total}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-active">
              <Icon name="alert" size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Aktywne</div>
              <div className="stat-value">{stats.active}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-acknowledged">
              <Icon name="check" size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Potwierdzone</div>
              <div className="stat-value">{stats.acknowledged}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-resolved">
              <Icon name="checkCircle" size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Rozwiązane</div>
              <div className="stat-value">{stats.resolved}</div>
            </div>
          </div>
        </div>
      )}

      <div className="alerts-filters">
        <button
          className={`filter-btn ${filter === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setFilter('ACTIVE')}
        >
          Aktywne
        </button>
        <button
          className={`filter-btn ${filter === 'ACKNOWLEDGED' ? 'active' : ''}`}
          onClick={() => setFilter('ACKNOWLEDGED')}
        >
          Potwierdzone
        </button>
        <button
          className={`filter-btn ${filter === 'RESOLVED' ? 'active' : ''}`}
          onClick={() => setFilter('RESOLVED')}
        >
          Rozwiązane
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Ładowanie alertów...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <Icon name="checkCircle" size={64} />
          <h3>Brak alertów</h3>
          <p>Nie wykryto nawracających problemów w wybranej kategorii.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-card ${getSeverityClass(alert.severity)}`}>
              <div className="alert-header">
                <div className="alert-title-section">
                  <h3 className="alert-title">{alert.title}</h3>
                  <div className="alert-badges">
                    <span className={`badge badge-${alert.severity.toLowerCase()}`}>
                      {getSeverityLabel(alert.severity)}
                    </span>
                    <span className="badge badge-category">
                      {alert.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="alert-stats">
                <div className="alert-stat">
                  <Icon name="repeat" size={16} />
                  <span><strong>{alert.occurrenceCount}</strong> wystąpień</span>
                </div>
                <div className="alert-stat">
                  <Icon name="users" size={16} />
                  <span><strong>{alert.affectedUsers}</strong> użytkowników</span>
                </div>
                <div className="alert-stat">
                  <Icon name="calendar" size={16} />
                  <span>
                    {new Date(alert.firstOccurrence).toLocaleDateString('pl-PL')} - {' '}
                    {new Date(alert.lastOccurrence).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              </div>

              {alert.suggestedAction && (
                <div className="alert-suggestion">
                  <Icon name="lightbulb" size={16} />
                  <span><strong>Sugerowane działanie:</strong> {alert.suggestedAction}</span>
                </div>
              )}

              {alert.keywords && alert.keywords.length > 0 && (
                <div className="alert-keywords">
                  <strong>Słowa kluczowe:</strong>
                  {alert.keywords.map((keyword, idx) => (
                    <span key={idx} className="keyword-tag">{keyword}</span>
                  ))}
                </div>
              )}

              {alert.acknowledgedBy && (
                <div className="alert-ack-info">
                  <Icon name="user" size={14} />
                  <span>
                    Potwierdzone przez {alert.acknowledgedBy.name}
                    {' '}({new Date(alert.acknowledgedAt).toLocaleString('pl-PL')})
                  </span>
                </div>
              )}

              {alert.notes && (
                <div className="alert-notes">
                  <strong>Notatki:</strong> {alert.notes}
                </div>
              )}

              <div className="alert-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
                >
                  {selectedAlert?.id === alert.id ? 'Zamknij' : 'Akcje'}
                </button>

                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => window.location.href = `/dashboard/tickets?alert=${alert.id}`}
                >
                  Zobacz zgłoszenia ({alert.tickets?.length || 0})
                </button>
              </div>

              {selectedAlert?.id === alert.id && (
                <div className="alert-action-panel">
                  <textarea
                    className="action-notes"
                    placeholder="Notatki (opcjonalne, wymagane dla rozwiązania)"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                  />

                  <div className="action-buttons">
                    {alert.status === 'ACTIVE' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAction(alert.id, 'acknowledge')}
                        disabled={actionLoading}
                      >
                        <Icon name="check" size={16} />
                        Potwierdź
                      </button>
                    )}

                    {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleAction(alert.id, 'resolve')}
                        disabled={actionLoading || !actionNotes}
                      >
                        <Icon name="checkCircle" size={16} />
                        Rozwiąż
                      </button>
                    )}

                    <button
                      className="btn btn-danger"
                      onClick={() => handleAction(alert.id, 'dismiss')}
                      disabled={actionLoading}
                    >
                      <Icon name="x" size={16} />
                      Odrzuć
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
