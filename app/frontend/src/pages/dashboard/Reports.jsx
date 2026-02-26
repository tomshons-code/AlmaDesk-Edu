import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import CustomSelect from '../../components/CustomSelect'
import {
  getScheduledReportsSettings,
  updateScheduledReportsSettings,
  triggerScheduledReport
} from '../../api/settings'
import '../../styles/components/Reports.css'

export default function Reports() {
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    priority: 'all',
    category: 'all',
    assignedTo: 'all'
  })
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(null)
  const [agents, setAgents] = useState([])

  const [scheduleSettings, setScheduleSettings] = useState({
    enabled: false,
    frequency: 'monthly',
    recipients: '',
    hour: 7
  })
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleFeedback, setScheduleFeedback] = useState(null)
  const [triggeringReport, setTriggeringReport] = useState(false)

  useEffect(() => {
    loadAgents()

    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)

    setFilters(prev => ({
      ...prev,
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }))

    if (user?.role === 'SUPER_ADMIN') {
      getScheduledReportsSettings()
        .then(data => setScheduleSettings(data))
        .catch(err => console.warn('Could not load schedule settings:', err))
    }
  }, [])

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/users/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setAgents(data)
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const loadReportData = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value)
        }
      })

      const res = await fetch(`/api/reports/data?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        setReportData(data)
      } else {
        alert('Błąd podczas ładowania danych raportu')
      }
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Błąd podczas ładowania danych raportu')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format) => {
    if (!reportData) {
      alert('Najpierw wygeneruj raport')
      return
    }

    setExporting(format)
    try {
      const res = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({
          ...filters,
          tickets: reportData.tickets,
          stats: reportData.stats
        })
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `raport-${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert(`Błąd podczas eksportu do ${format.toUpperCase()}`)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      alert(`Błąd podczas eksportu do ${format.toUpperCase()}`)
    } finally {
      setExporting(null)
    }
  }

  const handleSaveSchedule = async () => {
    setScheduleSaving(true)
    setScheduleFeedback(null)
    try {
      await updateScheduledReportsSettings(scheduleSettings)
      setScheduleFeedback({ type: 'success', msg: 'Ustawienia planowania zapisane!' })
    } catch (err) {
      setScheduleFeedback({ type: 'error', msg: err.message || 'Błąd zapisu ustawień' })
    } finally {
      setScheduleSaving(false)
      setTimeout(() => setScheduleFeedback(null), 4000)
    }
  }

  const handleTriggerNow = async () => {
    if (!scheduleSettings.recipients.trim()) {
      setScheduleFeedback({ type: 'error', msg: 'Podaj co najmniej jeden adres e-mail odbiorcy przed wysłaniem.' })
      return
    }
    setTriggeringReport(true)
    setScheduleFeedback(null)
    try {
      const result = await triggerScheduledReport(scheduleSettings.frequency, scheduleSettings.recipients)
      const sentMsg = result.sent > 1 ? `do ${result.sent} odbiorców` : 'do odbiorcy'
      const failMsg = result.failed?.length ? ` (${result.failed.length} nieudanych)` : ''
      setScheduleFeedback({ type: 'success', msg: `Raport wysłany ${sentMsg}${failMsg}! Sprawdź skrzynkę odbiorczą.` })
    } catch (err) {
      setScheduleFeedback({ type: 'error', msg: err.message || 'Błąd podczas wysyłania raportu' })
    } finally {
      setTriggeringReport(false)
      setTimeout(() => setScheduleFeedback(null), 6000)
    }
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="reports-title">
          <Icon name="file-text" size={28} />
          <h1>Raporty i Analiza</h1>
        </div>
        <p className="reports-subtitle">Generuj szczegółowe raporty zgłoszeń z możliwością eksportu</p>
      </div>

      <div className="reports-filters-card">
        <h3 className="reports-section-title">
          <Icon name="filter" size={20} />
          Filtry raportu
        </h3>

        <div className="reports-filters-grid">
          <div className="reports-filter-group">
            <label>Data od</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="reports-date-input"
            />
          </div>

          <div className="reports-filter-group">
            <label>Data do</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="reports-date-input"
            />
          </div>

          <div className="reports-filter-group">
            <label>Status</label>
            <CustomSelect
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              options={[
                { value: 'all', label: 'Wszystkie' },
                { value: 'open', label: 'Nowe' },
                { value: 'in-progress', label: 'W trakcie' },
                { value: 'resolved', label: 'Rozwiązane' },
                { value: 'closed', label: 'Zamknięte' }
              ]}
            />
          </div>

          <div className="reports-filter-group">
            <label>Priorytet</label>
            <CustomSelect
              value={filters.priority}
              onChange={(value) => handleFilterChange('priority', value)}
              options={[
                { value: 'all', label: 'Wszystkie' },
                { value: 'critical', label: '🔴 Krytyczny' },
                { value: 'high', label: '🟠 Wysoki' },
                { value: 'medium', label: '🟡 Średni' },
                { value: 'low', label: '🟢 Niski' }
              ]}
            />
          </div>

          <div className="reports-filter-group">
            <label>Kategoria</label>
            <CustomSelect
              value={filters.category}
              onChange={(value) => handleFilterChange('category', value)}
              options={[
                { value: 'all', label: 'Wszystkie' },
                { value: 'hardware', label: 'Sprzęt' },
                { value: 'software', label: 'Oprogramowanie' },
                { value: 'network', label: 'Sieć' },
                { value: 'access', label: 'Dostęp' },
                { value: 'account', label: 'Konto' },
                { value: 'other', label: 'Inne' }
              ]}
            />
          </div>

          <div className="reports-filter-group">
            <label>Przypisany do</label>
            <CustomSelect
              value={filters.assignedTo}
              onChange={(value) => handleFilterChange('assignedTo', value)}
              options={[
                { value: 'all', label: 'Wszyscy' },
                ...agents.map(agent => ({
                  value: agent.login,
                  label: agent.name
                }))
              ]}
            />
          </div>
        </div>

        <div className="reports-actions">
          <button
            className="btn-generate-report"
            onClick={loadReportData}
            disabled={loading}
          >
            {loading ? (
              <>
                <Icon name="loader" size={18} />
                Generowanie...
              </>
            ) : (
              <>
                <Icon name="play" size={18} />
                Wygeneruj raport
              </>
            )}
          </button>

          {reportData && (
            <div className="btn-export-group">
              <button
                className="btn-export btn-export-pdf"
                onClick={() => exportReport('pdf')}
                disabled={exporting !== null}
              >
                {exporting === 'pdf' ? (
                  <>
                    <Icon name="loader" size={16} />
                    Eksportowanie...
                  </>
                ) : (
                  <>
                    <Icon name="file-text" size={16} />
                    Eksport PDF
                  </>
                )}
              </button>

              <button
                className="btn-export btn-export-excel"
                onClick={() => exportReport('excel')}
                disabled={exporting !== null}
              >
                {exporting === 'excel' ? (
                  <>
                    <Icon name="loader" size={16} />
                    Eksportowanie...
                  </>
                ) : (
                  <>
                    <Icon name="download" size={16} />
                    Eksport Excel
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {}
      {user?.role === 'SUPER_ADMIN' && (
        <div className="reports-schedule-card">
          <h3 className="reports-section-title">
            <Icon name="calendar" size={20} />
            Automatyczne raporty e-mail
          </h3>
          <p className="reports-schedule-desc">
            Skonfiguruj wysyłanie raportów PDF na podane adresy e-mail w wybranym rytmie.
          </p>

          <div className="reports-schedule-grid">
            <div className="reports-schedule-field reports-schedule-toggle-row">
              <label className="reports-toggle-label">
                <span>Włącz automatyczne raporty</span>
                <button
                  type="button"
                  className={`reports-toggle-btn ${scheduleSettings.enabled ? 'active' : ''}`}
                  onClick={() => setScheduleSettings(p => ({ ...p, enabled: !p.enabled }))}
                  aria-label="Przełącz automatyczne raporty"
                >
                  <span className="reports-toggle-knob" />
                </button>
              </label>
            </div>

            <div className="reports-schedule-field">
              <label>Częstotliwość</label>
              <CustomSelect
                value={scheduleSettings.frequency}
                onChange={v => setScheduleSettings(p => ({ ...p, frequency: v }))}
                options={[
                  { value: 'monthly',   label: 'Co miesiąc (1. każdego miesiąca)' },
                  { value: 'quarterly', label: 'Co kwartał (1. każdego kwartału)' },
                  { value: 'both',      label: 'Miesięcznie i kwartalnie' }
                ]}
              />
            </div>

            <div className="reports-schedule-field">
              <label>Godzina wysyłki</label>
              <CustomSelect
                value={String(scheduleSettings.hour)}
                onChange={v => setScheduleSettings(p => ({ ...p, hour: parseInt(v, 10) }))}
                options={[4,5,6,7,8,9,10].map(h => ({ value: String(h), label: `${h}:00` }))}
              />
            </div>

            <div className="reports-schedule-field reports-schedule-field-full">
              <label>Odbiorcy (adresy e-mail oddzielone przecinkami)</label>
              <input
                type="text"
                className="reports-date-input"
                placeholder="rektor@uczelnia.edu, dziekan@uczelnia.edu"
                value={scheduleSettings.recipients}
                onChange={e => setScheduleSettings(p => ({ ...p, recipients: e.target.value }))}
              />
            </div>
          </div>

          {scheduleFeedback && (
            <div className={`reports-schedule-feedback reports-schedule-feedback-${scheduleFeedback.type}`}>
              <Icon name={scheduleFeedback.type === 'success' ? 'check' : 'alert'} size={16} />
              {scheduleFeedback.msg}
            </div>
          )}

          <div className="reports-schedule-actions">
            <button
              className="btn-generate-report"
              onClick={handleSaveSchedule}
              disabled={scheduleSaving}
            >
              {scheduleSaving
                ? <><Icon name="loader" size={16} /> Zapisywanie…</>
                : <><Icon name="check" size={16} /> Zapisz ustawienia</>}
            </button>
            <button
              className="btn-export btn-export-pdf"
              onClick={handleTriggerNow}
              disabled={triggeringReport || !scheduleSettings.recipients.trim()}
              title="Wyślij raport testowy teraz na podane adresy"
            >
              {triggeringReport
                ? <><Icon name="loader" size={16} /> Wysyłanie…</>
                : <><Icon name="play" size={16} /> Wyślij teraz (test)</>}
            </button>
          </div>
        </div>
      )}

      {reportData && (
        <>
          <div className="reports-stats-grid">
            <div className="reports-stat-card">
              <div className="reports-stat-icon">
                <Icon name="file-text" size={24} />
              </div>
              <div className="reports-stat-content">
                <div className="reports-stat-value">{reportData.stats.total}</div>
                <div className="reports-stat-label">Łączna liczba zgłoszeń</div>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon reports-stat-icon-success">
                <Icon name="check" size={24} />
              </div>
              <div className="reports-stat-content">
                <div className="reports-stat-value">{reportData.stats.resolvedCount}</div>
                <div className="reports-stat-label">Rozwiązane zgłoszenia</div>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon reports-stat-icon-info">
                <Icon name="clock" size={24} />
              </div>
              <div className="reports-stat-content">
                <div className="reports-stat-value">
                  {reportData.stats.avgResolutionTime > 0
                    ? `${reportData.stats.avgResolutionTime}h`
                    : 'N/A'}
                </div>
                <div className="reports-stat-label">Średni czas rozwiązania</div>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon reports-stat-icon-warning">
                <Icon name="percent" size={24} />
              </div>
              <div className="reports-stat-content">
                <div className="reports-stat-value">
                  {reportData.stats.total > 0
                    ? Math.round((reportData.stats.resolvedCount / reportData.stats.total) * 100)
                    : 0}%
                </div>
                <div className="reports-stat-label">Wskaźnik rozwiązań</div>
              </div>
            </div>
          </div>

          <div className="reports-breakdown-grid">
            <div className="reports-breakdown-card">
              <h4 className="reports-breakdown-title">
                <Icon name="activity" size={18} />
                Podział według statusu
              </h4>
              <div className="reports-breakdown-list">
                {Object.entries(reportData.stats.byStatus).map(([status, count]) => (
                  <div key={status} className="reports-breakdown-item">
                    <span className="reports-breakdown-label">{getStatusLabel(status)}</span>
                    <span className="reports-breakdown-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="reports-breakdown-card">
              <h4 className="reports-breakdown-title">
                <Icon name="alert" size={18} />
                Podział według priorytetu
              </h4>
              <div className="reports-breakdown-list">
                {Object.entries(reportData.stats.byPriority).map(([priority, count]) => (
                  <div key={priority} className="reports-breakdown-item">
                    <span className="reports-breakdown-label">{getPriorityLabel(priority)}</span>
                    <span className="reports-breakdown-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="reports-breakdown-card">
              <h4 className="reports-breakdown-title">
                <Icon name="folder" size={18} />
                Podział według kategorii
              </h4>
              <div className="reports-breakdown-list">
                {Object.entries(reportData.stats.byCategory).map(([category, count]) => (
                  <div key={category} className="reports-breakdown-item">
                    <span className="reports-breakdown-label">{getCategoryLabel(category)}</span>
                    <span className="reports-breakdown-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="reports-table-card">
            <h3 className="reports-section-title">
              <Icon name="list" size={20} />
              Szczegóły zgłoszeń ({reportData.tickets.length})
            </h3>

            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tytuł</th>
                    <th>Status</th>
                    <th>Priorytet</th>
                    <th>Kategoria</th>
                    <th>Przypisany</th>
                    <th>Data utworzenia</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.tickets.slice(0, 100).map(ticket => (
                    <tr key={ticket.id}>
                      <td>#{ticket.id}</td>
                      <td className="reports-table-title">{ticket.title}</td>
                      <td>
                        <span className={`reports-status-badge reports-status-${ticket.status}`}>
                          {getStatusLabel(ticket.status)}
                        </span>
                      </td>
                      <td>
                        <span className={`reports-priority-badge reports-priority-${ticket.priority}`}>
                          {getPriorityLabel(ticket.priority)}
                        </span>
                      </td>
                      <td>{getCategoryLabel(ticket.category)}</td>
                      <td>{ticket.assignedTo ? ticket.assignedTo.name : 'Nieprzypisane'}</td>
                      <td>{new Date(ticket.createdAt).toLocaleDateString('pl-PL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.tickets.length > 100 && (
                <div className="reports-table-notice">
                  Pokazano 100 z {reportData.tickets.length} zgłoszeń.
                  Pobierz raport aby zobaczyć wszystkie.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!reportData && !loading && (
        <div className="reports-empty-state">
          <Icon name="file-text" size={64} />
          <h3>Brak danych do wyświetlenia</h3>
          <p>Ustaw filtry i kliknij "Wygeneruj raport" aby zobaczyć dane</p>
        </div>
      )}
    </div>
  )
}

function getStatusLabel(status) {
  const labels = {
    open: 'Nowe',
    'in-progress': 'W trakcie',
    resolved: 'Rozwiązane',
    closed: 'Zamknięte'
  }
  return labels[status] || status
}

function getPriorityLabel(priority) {
  const labels = {
    low: '🟢 Niski',
    medium: '🟡 Średni',
    high: '🟠 Wysoki',
    critical: '🔴 Krytyczny'
  }
  return labels[priority] || priority
}

function getCategoryLabel(category) {
  const labels = {
    hardware: 'Sprzęt',
    software: 'Oprogramowanie',
    network: 'Sieć',
    access: 'Dostęp',
    account: 'Konto',
    other: 'Inne'
  }
  return labels[category] || category
}
