import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import '../../styles/components/ChangeRequests.css'

export default function ChangeRequestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [changeRequests, setChangeRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    loadChangeRequests()
    loadStats()
  }, [])

  const loadChangeRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)

      const res = await fetch(`/api/change-requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      const data = await res.json()
      setChangeRequests(data)
    } catch (error) {
      console.error('Error loading change requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/change-requests/stats/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  useEffect(() => {
    loadChangeRequests()
  }, [statusFilter, priorityFilter, categoryFilter])

  const filteredRequests = changeRequests
    .filter(req => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          req.title.toLowerCase().includes(query) ||
          req.description?.toLowerCase().includes(query) ||
          req.id.toString().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt)
        case 'priority': {
          const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, PLANNING: 4 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        case 'scheduled':
          if (!a.scheduledStart && !b.scheduledStart) return 0
          if (!a.scheduledStart) return 1
          if (!b.scheduledStart) return -1
          return new Date(a.scheduledStart) - new Date(b.scheduledStart)
        default:
          return 0
      }
    })

  const getStatusLabel = (status) => {
    const labels = {
      DRAFT: 'Szkic',
      SUBMITTED: 'Zgłoszony',
      UNDER_REVIEW: 'W ocenie',
      APPROVED: 'Zatwierdzony',
      REJECTED: 'Odrzucony',
      SCHEDULED: 'Zaplanowany',
      IN_PROGRESS: 'W realizacji',
      IMPLEMENTED: 'Zaimplementowany',
      VERIFIED: 'Zweryfikowany',
      FAILED: 'Nieudany',
      CLOSED: 'Zamknięty',
      CANCELLED: 'Anulowany'
    }
    return labels[status] || status
  }

  const getPriorityLabel = (priority) => {
    const labels = {
      CRITICAL: 'Krytyczny',
      HIGH: 'Wysoki',
      MEDIUM: 'Średni',
      LOW: 'Niski',
      PLANNING: 'Planowanie'
    }
    return labels[priority] || priority
  }

  const getCategoryLabel = (category) => {
    const labels = {
      STANDARD: 'Standardowa',
      NORMAL: 'Normalna',
      EMERGENCY: 'Awaryjna',
      MAJOR: 'Główna'
    }
    return labels[category] || category
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="change-requests-page">
      <div className="page-header">
        <div className="page-title">
          <Icon name="git-branch" size={28} />
          <h1>Zarządzanie Zmianami</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/dashboard/change-requests/new')}
        >
          <Icon name="plus" size={18} />
          Nowy wniosek o zmianę
        </button>
      </div>

      {}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon draft">
              <Icon name="file-text" size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.byStatus?.DRAFT || 0}</div>
              <div className="stat-label">Szkice</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon review">
              <Icon name="search" size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.byStatus?.UNDER_REVIEW || 0}</div>
              <div className="stat-label">W ocenie</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon approved">
              <Icon name="check-circle" size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.byStatus?.APPROVED || 0}</div>
              <div className="stat-label">Zatwierdzone</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon in-progress">
              <Icon name="activity" size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.byStatus?.IN_PROGRESS || 0}</div>
              <div className="stat-label">W realizacji</div>
            </div>
          </div>
        </div>
      )}

      {}
      <div className="filters-section">
        <div className="search-container">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Szukaj wg. tytułu, opisu lub ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Wszystkie statusy</option>
            <option value="DRAFT">Szkic</option>
            <option value="SUBMITTED">Zgłoszony</option>
            <option value="UNDER_REVIEW">W ocenie</option>
            <option value="APPROVED">Zatwierdzony</option>
            <option value="SCHEDULED">Zaplanowany</option>
            <option value="IN_PROGRESS">W realizacji</option>
            <option value="IMPLEMENTED">Zaimplementowany</option>
            <option value="VERIFIED">Zweryfikowany</option>
            <option value="CLOSED">Zamknięty</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Wszystkie priorytety</option>
            <option value="CRITICAL">Krytyczny</option>
            <option value="HIGH">Wysoki</option>
            <option value="MEDIUM">Średni</option>
            <option value="LOW">Niski</option>
            <option value="PLANNING">Planowanie</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Wszystkie kategorie</option>
            <option value="STANDARD">Standardowa</option>
            <option value="NORMAL">Normalna</option>
            <option value="EMERGENCY">Awaryjna</option>
            <option value="MAJOR">Główna</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="newest">Najnowsze</option>
            <option value="oldest">Najstarsze</option>
            <option value="priority">Priorytet</option>
            <option value="scheduled">Data realizacji</option>
          </select>
        </div>

        <div className="results-count">
          Znaleziono: <strong>{filteredRequests.length}</strong> wniosków
        </div>
      </div>

      {}
      <div className="change-requests-list">
        {loading ? (
          <div className="loading-state">
            <Icon name="loader" size={32} />
            Ładowanie...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <Icon name="inbox" size={48} />
            <p>Brak wniosków o zmiany</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/dashboard/change-requests/new')}
            >
              Utwórz pierwszy wniosek
            </button>
          </div>
        ) : (
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tytuł</th>
                  <th>Status</th>
                  <th>Priorytet</th>
                  <th>Kategoria</th>
                  <th>Wnioskodawca</th>
                  <th>Data utworzenia</th>
                  <th>Termin realizacji</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/dashboard/change-requests/${req.id}`)}
                    className="clickable-row"
                  >
                    <td className="id-cell">#{req.id}</td>
                    <td className="title-cell">
                      <div className="title-wrapper">
                        <span className="title-text">{req.title}</span>
                        {req.description && (
                          <span className="description-preview">
                            {req.description.substring(0, 80)}...
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${req.status.toLowerCase()}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge priority-${req.priority.toLowerCase()}`}>
                        {getPriorityLabel(req.priority)}
                      </span>
                    </td>
                    <td>
                      <span className="category-badge">
                        {getCategoryLabel(req.category)}
                      </span>
                    </td>
                    <td>{req.requestedBy?.name || 'N/A'}</td>
                    <td className="date-cell">{formatDate(req.createdAt)}</td>
                    <td className="date-cell">{formatDate(req.scheduledStart)}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon"
                        onClick={() => navigate(`/dashboard/change-requests/${req.id}`)}
                        title="Zobacz szczegóły"
                      >
                        <Icon name="eye" size={16} />
                      </button>
                      {req.status === 'DRAFT' && req.requestedById === user?.id && (
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/dashboard/change-requests/${req.id}/edit`)}
                          title="Edytuj"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
