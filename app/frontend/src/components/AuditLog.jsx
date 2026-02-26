import { useState, useEffect, useCallback } from 'react'
import Icon from './Icon'
import '../styles/components/AuditLog.css'

const ACTION_LABELS = {
  LOGIN:                  'Logowanie',
  LOGIN_SSO:              'Logowanie SSO',
  CREATE_TICKET:          'Nowe zgłoszenie',
  STATUS_CHANGE:          'Zmiana statusu',
  ASSIGN_TICKET:          'Przypisanie',
  ARCHIVE_TICKET:         'Archiwizacja',
  RESTORE_TICKET:         'Przywrócenie',
  CREATE_COMMENT:         'Komentarz',
  CREATE_INTERNAL_COMMENT:'Komentarz wewn.',
  CREATE_USER:            'Nowy użytkownik',
  UPDATE_ROLE:            'Zmiana roli',
  UPDATE_USER:            'Edycja użytkownika',
  DELETE_USER:            'Usunięcie użytkownika'
}

const ACTION_COLORS = {
  LOGIN:                  'audit-action-info',
  LOGIN_SSO:              'audit-action-info',
  CREATE_TICKET:          'audit-action-success',
  STATUS_CHANGE:          'audit-action-warning',
  ASSIGN_TICKET:          'audit-action-info',
  ARCHIVE_TICKET:         'audit-action-muted',
  RESTORE_TICKET:         'audit-action-muted',
  CREATE_COMMENT:         'audit-action-success',
  CREATE_INTERNAL_COMMENT:'audit-action-warning',
  CREATE_USER:            'audit-action-success',
  UPDATE_ROLE:            'audit-action-warning',
  UPDATE_USER:            'audit-action-info',
  DELETE_USER:            'audit-action-danger'
}

export default function AuditLog () {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const [filters, setFilters] = useState({ action: '', search: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const LIMIT = 30

  const token = localStorage.getItem('almadesk_token')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: LIMIT })
      if (filters.action) params.set('action', filters.action)
      if (filters.search) params.set('search', filters.search)
      if (filters.from)   params.set('from', filters.from)
      if (filters.to)     params.set('to',   filters.to)

      const res = await fetch(`/api/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
        setPages(data.pages)
      }
    } catch (e) {
      console.error('AuditLog fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [page, filters, token])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setPage(1)
  }

  const formatDate = (d) =>
    new Date(d).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="audit-log-wrapper">
      <div className="audit-log-header">
        <h3><Icon name="list" size={20} /> Log audytu</h3>
        <span className="audit-log-total">Łącznie: {total} wpisów</span>
      </div>

      {}
      <div className="audit-log-filters">
        <select
          name="action"
          value={filters.action}
          onChange={handleFilterChange}
          className="audit-filter-select"
        >
          <option value="">Wszystkie akcje</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Szukaj akcji lub encji…"
          className="audit-filter-input"
        />

        <input
          type="date"
          name="from"
          value={filters.from}
          onChange={handleFilterChange}
          className="audit-filter-input"
          title="Od daty"
        />
        <input
          type="date"
          name="to"
          value={filters.to}
          onChange={handleFilterChange}
          className="audit-filter-input"
          title="Do daty"
        />

        <button className="audit-filter-reset" onClick={() => { setFilters({ action: '', search: '', from: '', to: '' }); setPage(1) }}>
          Resetuj
        </button>
      </div>

      {}
      {loading ? (
        <div className="audit-log-loading"><Icon name="loader" size={24} /> Ładowanie…</div>
      ) : logs.length === 0 ? (
        <div className="audit-log-empty">Brak wpisów dla wybranych filtrów</div>
      ) : (
        <div className="audit-log-table-wrapper">
          <table className="audit-log-table">
            <thead>
              <tr>
                <th>Czas</th>
                <th>Akcja</th>
                <th>Encja</th>
                <th>Użytkownik</th>
                <th>IP</th>
                <th>Szczegóły</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <>
                  <tr key={log.id} className="audit-log-row" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <td className="audit-log-date">{formatDate(log.timestamp)}</td>
                    <td>
                      <span className={`audit-action-badge ${ACTION_COLORS[log.action] || 'audit-action-info'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="audit-log-entity">
                      {log.entityType}
                      {log.entityId ? <span className="audit-entity-id">#{log.entityId}</span> : null}
                    </td>
                    <td className="audit-log-user">
                      {log.user ? (
                        <span title={log.user.name}>{log.user.login}</span>
                      ) : (
                        <span className="audit-log-system">system</span>
                      )}
                    </td>
                    <td className="audit-log-ip">{log.ipAddress || '—'}</td>
                    <td className="audit-log-expand">
                      {log.changes ? (
                        <Icon name={expandedId === log.id ? 'arrow' : 'arrow'} size={14} style={{ transform: expandedId === log.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                      ) : '—'}
                    </td>
                  </tr>
                  {expandedId === log.id && log.changes && (
                    <tr key={`${log.id}-detail`} className="audit-log-detail-row">
                      <td colSpan={6}>
                        <pre className="audit-log-changes">{JSON.stringify(log.changes, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {}
      {pages > 1 && (
        <div className="audit-log-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="audit-page-btn">‹ Poprzednia</button>
          <span className="audit-page-info">Strona {page} z {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="audit-page-btn">Następna ›</button>
        </div>
      )}
    </div>
  )
}
