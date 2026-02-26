import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon, { getPriorityIcon } from '../../components/Icon'
import SearchBar from '../../components/SearchBar'
import TagFilter from '../../components/TagFilter'
import '../../styles/components/PortalHome.css'

export default function PortalHome() {
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [elasticSearchActive, setElasticSearchActive] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])

  useEffect(() => {
    loadTickets()
  }, [showArchived])

  const loadTickets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('archived', showArchived ? 'true' : 'false')

      const res = await fetch(`/api/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      const data = await res.json()
      setTickets(data)
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query) => {
    if (!query || query.trim().length < 1) {
      setElasticSearchActive(false)
      setSearchResults([])
      setSearchQuery('')
      return
    }

    try {
      const params = new URLSearchParams({ q: query })

      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))

      const res = await fetch(`/api/tickets/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })

      const data = await res.json()
      setSearchResults(data.tickets || [])
      setElasticSearchActive(true)
      setSearchQuery(query)
    } catch (error) {
      console.error('Error searching tickets:', error)
    }
  }

  const handleTagsChange = (tags) => {
    setSelectedTags(tags)
    if (elasticSearchActive && searchQuery) {
      handleSearch(searchQuery)
    }
  }

  const baseTickets = elasticSearchActive ? searchResults : tickets

  const filteredTickets = baseTickets.filter(ticket => {
    if (!elasticSearchActive && selectedTags.length > 0) {
      const ticketTagIds = ticket.tags?.map(t => t.id) || []
      if (!selectedTags.some(tagId => ticketTagIds.includes(tagId))) {
        return false
      }
    }

    if (filter === 'all') return true
    if (filter === 'open') return ticket.status === 'open' || ticket.status === 'in-progress'
    if (filter === 'resolved') return ticket.status === 'resolved' || ticket.status === 'closed'
    return true
  })

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  }

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="spinner"></div>
        <p>Ładowanie zgłoszeń...</p>
      </div>
    )
  }

  return (
    <div className="portal-home">
      <div className="portal-welcome">
        <h1>Witaj, {user?.name}! <Icon name="home" size={28} /></h1>
        <p>Zarządzaj swoimi zgłoszeniami w jednym miejscu</p>
      </div>

      {}
      <div className="portal-stats">
        <div className="portal-stat-card">
          <div className="portal-stat-icon"><Icon name="dashboard" size={32} /></div>
          <div className="portal-stat-info">
            <div className="portal-stat-value">{stats.total}</div>
            <div className="portal-stat-label">Wszystkie zgłoszenia</div>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon"><Icon name="arrow" size={32} /></div>
          <div className="portal-stat-info">
            <div className="portal-stat-value">{stats.open}</div>
            <div className="portal-stat-label">W trakcie realizacji</div>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon"><Icon name="check" size={32} /></div>
          <div className="portal-stat-info">
            <div className="portal-stat-value">{stats.resolved}</div>
            <div className="portal-stat-label">Rozwiązane</div>
          </div>
        </div>
      </div>

      {}
      <div className="portal-quick-actions">
        <button
          className="portal-quick-action-btn primary"
          onClick={() => navigate('/portal/new')}
        >
          <Icon name="plus" size={18} /> Nowe zgłoszenie
        </button>
        <button
          className="portal-quick-action-btn"
          onClick={() => navigate('/knowledge-base')}
        >
          <Icon name="ticket" size={18} /> Baza wiedzy
        </button>
      </div>

      {}
      <div className="portal-search-section">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Wyszukaj swoje zgłoszenia..."
        />
        <TagFilter
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
        />
      </div>

      {elasticSearchActive && (
        <div className="portal-search-info">
          Znaleziono {searchResults.length} wyników dla: <strong>{searchQuery}</strong>
        </div>
      )}

      {}
      <div className="portal-filters">
        <button
          className={`portal-filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Wszystkie ({stats.total})
        </button>
        <button
          className={`portal-filter-tab ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
        >
          Otwarte ({stats.open})
        </button>
        <button
          className={`portal-filter-tab ${filter === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilter('resolved')}
        >
          Rozwiązane ({stats.resolved})
        </button>
        <label className="portal-archive-toggle">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <span>Pokaż zarchiwizowane</span>
        </label>
      </div>

      {}
      {filteredTickets.length === 0 ? (
        <div className="portal-empty">
          <div className="portal-empty-icon"><Icon name="inbox" size={64} /></div>
          <h3>Brak zgłoszeń</h3>
          <p>
            {filter === 'all'
              ? 'Nie masz jeszcze żadnych zgłoszeń. Utwórz pierwsze!'
              : 'Brak zgłoszeń w tej kategorii.'}
          </p>
          {filter === 'all' && (
            <button
              className="portal-empty-btn"
              onClick={() => navigate('/portal/new')}
            >
              <Icon name="plus" size={18} /> Utwórz zgłoszenie
            </button>
          )}
        </div>
      ) : (
        <div className="portal-tickets-list">
          {filteredTickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => navigate(`/portal/ticket/${ticket.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TicketCard({ ticket, onClick }) {
  return (
    <div className="portal-ticket-card" onClick={onClick}>
      <div className="portal-ticket-header">
        <div className="portal-ticket-id">#{ticket.id}</div>
        <div className="portal-ticket-badges">
          <span className={`portal-badge status-${ticket.status}`}>
            {getStatusLabel(ticket.status)}
          </span>
          <span className={`portal-badge priority-${ticket.priority}`}>
            {getPriorityIcon(ticket.priority)} {getPriorityLabel(ticket.priority)}
          </span>
        </div>
      </div>

      <h3 className="portal-ticket-title">{ticket.title}</h3>
      <p className="portal-ticket-description">{ticket.description}</p>

      <div className="portal-ticket-footer">
        <span className="portal-ticket-date">
          <Icon name="clock" size={14} /> {new Date(ticket.createdAt).toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
        <button className="portal-ticket-view-btn">Zobacz szczegóły →</button>
      </div>
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
    critical: 'Krytyczny',
    high: 'Wysoki',
    medium: 'Średni',
    low: 'Niski'
  }
  return labels[priority] || priority
}
