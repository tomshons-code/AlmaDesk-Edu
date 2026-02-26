import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon, { getPriorityIcon } from '../../components/Icon'
import SearchBar from '../../components/SearchBar'
import TagFilter from '../../components/TagFilter'
import CustomSelect from '../../components/CustomSelect'
import RegisterTicketModal from '../../components/RegisterTicketModal'
import { SkeletonTable } from '../../components/Skeleton'
import '../../styles/components/TicketQueue.css'
import '../../styles/components/RegisterTicketModal.css'

export default function TicketQueue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTickets, setSelectedTickets] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [showArchived, setShowArchived] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [locationFilter, setLocationFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [laboratoryFilter, setLaboratoryFilter] = useState('')

  const [elasticSearchActive, setElasticSearchActive] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedTags, setSelectedTags] = useState([])

  useEffect(() => {
    loadTickets()
  }, [showArchived, selectedTags])

  const locationOptions = [...new Set(tickets.map(t => t.location).filter(Boolean))].sort()
  const departmentOptions = [...new Set(tickets.map(t => t.department).filter(Boolean))].sort()
  const laboratoryOptions = [...new Set(tickets.map(t => t.laboratory).filter(Boolean))].sort()

  const loadTickets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('archived', showArchived ? 'true' : 'false')

      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','))
      }

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

      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
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

  const handleAssignToMe = async (ticketId) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ assignTo: user?.login })
      })

      if (res.ok) {
        loadTickets()
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
    }
  }

  const handleBulkAssign = async () => {
    for (const ticketId of selectedTickets) {
      await handleAssignToMe(ticketId)
    }
    setSelectedTickets([])
  }

  const toggleTicketSelection = (ticketId) => {
    setSelectedTickets(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedTickets.length === filteredTickets.length) {
      setSelectedTickets([])
    } else {
      setSelectedTickets(filteredTickets.map(t => t.id))
    }
  }

  const baseTickets = elasticSearchActive ? searchResults : tickets

  const filteredTickets = baseTickets
    .filter(ticket => {
      if (!elasticSearchActive && searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          ticket.title.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query) ||
          ticket.id.toString().includes(query)
        if (!matchesSearch) return false
      }

      if (!elasticSearchActive && statusFilter !== 'all' && ticket.status !== statusFilter) {
        return false
      }

      if (!elasticSearchActive && priorityFilter !== 'all' && ticket.priority !== priorityFilter) {
        return false
      }

      if (assignmentFilter === 'unassigned' && ticket.assignedTo) {
        return false
      }
      if (assignmentFilter === 'assigned' && !ticket.assignedTo) {
        return false
      }
      if (assignmentFilter === 'mine' && ticket.assignedTo !== user?.login) {
        return false
      }

      if (!elasticSearchActive && selectedTags.length > 0) {
        const ticketTagIds = ticket.tags?.map(t => t.id) || []
        if (!selectedTags.some(tagId => ticketTagIds.includes(tagId))) {
          return false
        }
      }

      if (locationFilter && ticket.location !== locationFilter) {
        return false
      }

      if (departmentFilter && ticket.department !== departmentFilter) {
        return false
      }

      if (laboratoryFilter && ticket.laboratory !== laboratoryFilter) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      if (elasticSearchActive) {
        return 0
      }

      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt)
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        case 'updated':
          return new Date(b.updatedAt) - new Date(a.updatedAt)
        default:
          return 0
      }
    })

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    unassigned: tickets.filter(t => !t.assignedTo).length,
    mine: tickets.filter(t => t.assignedTo === user?.login).length
  }

  if (loading) {
    return (
      <div className="ticket-queue-page">
        <div className="queue-header">
          <div className="queue-header-left">
            <h1><Icon name="list" size={28} /> <span>Kolejka zgłoszeń</span></h1>
          </div>
        </div>
        <SkeletonTable rows={8} cols={6} />
      </div>
    )
  }

  return (
    <div className="ticket-queue-page">
      {}
      <div className="queue-header">
        <div className="queue-header-left">
          <h1>
            <Icon name="list" size={28} />
            <span>Kolejka zgłoszeń</span>
          </h1>
          <p>Zarządzaj wszystkimi zgłoszeniami w systemie</p>
        </div>
        {(user?.role === 'AGENT' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <button
            className="queue-register-btn"
            onClick={() => setShowRegisterModal(true)}
            title="Zarejestruj zgłoszenie w imieniu klienta (telefon, czat, etc.)"
          >
            <Icon name="phone" size={18} />
            Zarejestruj zgłoszenie
          </button>
        )}
        <div className="queue-stats-mini">
          <div className="stat-mini">
            <div className="stat-mini-value">{stats.total}</div>
            <div className="stat-mini-label">Wszystkie</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-value">{stats.unassigned}</div>
            <div className="stat-mini-label">Nieprzypisane</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-value">{stats.mine}</div>
            <div className="stat-mini-label">Moje</div>
          </div>
        </div>
      </div>

      {}
      <div className="queue-search-hero">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Wyszukaj zgłoszenia (Elasticsearch)..."
        />
        {elasticSearchActive && (
          <div className="queue-search-info">
            <Icon name="search" size={14} />
            Znaleziono <strong>{searchResults.length}</strong> wyników dla: <strong>{searchQuery}</strong>
            <button className="queue-search-clear" onClick={() => { setSearchQuery(''); setElasticSearchActive(false); setSearchResults([]) }}>
              <Icon name="x" size={14} /> Wyczyść
            </button>
          </div>
        )}
      </div>

      {}
      <div className="queue-filters">
        <div className="queue-filters-top">
          <div className="queue-filters-label">
            <Icon name="filter" size={16} />
            <span>Filtry</span>
          </div>
          <label className="queue-archive-toggle">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span className="queue-toggle-track">
              <span className="queue-toggle-thumb" />
            </span>
            <span className="queue-toggle-label">Archiwum</span>
          </label>
        </div>

        <div className="queue-filter-chips">
          <div className="queue-filter-chip">
            <label>Status</label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              maxHeight="20rem"
              options={[
                { value: 'all', label: 'Wszystkie' },
                { value: 'open', label: 'Nowe' },
                { value: 'in-progress', label: 'W trakcie' },
                { value: 'resolved', label: 'Rozwiązane' },
                { value: 'closed', label: 'Zamknięte' }
              ]}
            />
          </div>

          <div className="queue-filter-chip">
            <label>Priorytet</label>
            <CustomSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              maxHeight="20rem"
              options={[
                { value: 'all', label: 'Wszystkie' },
                { value: 'critical', label: '🔴 Krytyczny' },
                { value: 'high', label: '🟠 Wysoki' },
                { value: 'medium', label: '🟡 Średni' },
                { value: 'low', label: '🟢 Niski' }
              ]}
            />
          </div>

          <div className="queue-filter-chip">
            <label>Przypisanie</label>
            <CustomSelect
              value={assignmentFilter}
              onChange={setAssignmentFilter}
              maxHeight="20rem"
              options={[
                { value: 'all', label: 'Wszystkie' },
                { value: 'unassigned', label: 'Nieprzypisane' },
                { value: 'assigned', label: 'Przypisane' },
                { value: 'mine', label: 'Moje' }
              ]}
            />
          </div>

          <div className="queue-filter-chip">
            <label>Sortuj</label>
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              maxHeight="20rem"
              options={[
                { value: 'newest', label: 'Najnowsze' },
                { value: 'oldest', label: 'Najstarsze' },
                { value: 'priority', label: 'Priorytet' },
                { value: 'updated', label: 'Ostatnio zaktualizowane' }
              ]}
            />
          </div>

          <div className="queue-filter-chip queue-filter-chip-tags">
            <label>Tagi</label>
            <TagFilter
              selectedTags={selectedTags}
              onTagsChange={handleTagsChange}
            />
          </div>

          {locationOptions.length > 0 && (
            <div className="queue-filter-chip">
              <label>Lokalizacja</label>
              <CustomSelect
                value={locationFilter}
                onChange={setLocationFilter}
                maxHeight="20rem"
                options={[
                  { value: '', label: 'Wszystkie' },
                  ...locationOptions.map(l => ({ value: l, label: l }))
                ]}
              />
            </div>
          )}

          {departmentOptions.length > 0 && (
            <div className="queue-filter-chip">
              <label>Wydział</label>
              <CustomSelect
                value={departmentFilter}
                onChange={setDepartmentFilter}
                maxHeight="20rem"
                options={[
                  { value: '', label: 'Wszystkie' },
                  ...departmentOptions.map(d => ({ value: d, label: d }))
                ]}
              />
            </div>
          )}

          {laboratoryOptions.length > 0 && (
            <div className="queue-filter-chip">
              <label>Laboratorium</label>
              <CustomSelect
                value={laboratoryFilter}
                onChange={setLaboratoryFilter}
                maxHeight="20rem"
                options={[
                  { value: '', label: 'Wszystkie' },
                  ...laboratoryOptions.map(l => ({ value: l, label: l }))
                ]}
              />
            </div>
          )}
        </div>

        {}
        {selectedTickets.length > 0 && (
          <div className="queue-bulk-actions">
            <span className="bulk-selected-count">
              <Icon name="check" size={16} />
              Zaznaczono: {selectedTickets.length}
            </span>
            <button
              className="bulk-action-btn"
              onClick={handleBulkAssign}
            >
              <Icon name="target" size={18} />
              <span>Przypisz do mnie</span>
            </button>
            <button
              className="bulk-action-btn cancel"
              onClick={() => setSelectedTickets([])}
            >
              <Icon name="x" size={18} /> Anuluj
            </button>
          </div>
        )}
      </div>

      {}
      <div className="queue-results-info">
        Znaleziono: <strong>{filteredTickets.length}</strong> zgłoszeń
        {searchQuery && ` dla zapytania "${searchQuery}"`}
      </div>

      {}
      {filteredTickets.length === 0 ? (
        <div className="queue-empty">
          <div className="queue-empty-icon">
            <Icon name="inbox" size={64} color="var(--color-text-tertiary)" />
          </div>
          <h3>Brak zgłoszeń</h3>
          <p>Nie znaleziono zgłoszeń pasujących do wybranych filtrów.</p>
        </div>
      ) : (
        <div className="queue-table-wrapper">
          <table className="queue-table">
            <thead>
              <tr>
                <th className="queue-th-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedTickets.length === filteredTickets.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="queue-th-id">ID</th>
                <th className="queue-th-title">Tytuł</th>
                <th className="queue-th-status">Status</th>
                <th className="queue-th-priority">Priorytet</th>
                <th className="queue-th-source">Kanał</th>
                <th className="queue-th-assignee">Przypisany</th>
                <th className="queue-th-date">Data utworzenia</th>
                <th className="queue-th-actions">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(ticket => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedTickets.includes(ticket.id)}
                  onToggleSelect={toggleTicketSelection}
                  onAssign={handleAssignToMe}
                  onView={() => navigate(`/dashboard/ticket/${ticket.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showRegisterModal && (
        <RegisterTicketModal
          onClose={() => setShowRegisterModal(false)}
          onCreated={() => { setShowRegisterModal(false); loadTickets() }}
        />
      )}
    </div>
  )
}

function TicketRow({ ticket, isSelected, onToggleSelect, onAssign, onView }) {
  return (
    <tr className={`queue-row ${isSelected ? 'selected' : ''}`}>
      <td className="queue-td-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(ticket.id)}
        />
      </td>
      <td className="queue-td-id">
        <span className="queue-ticket-id">#{ticket.id}</span>
      </td>
      <td className="queue-td-title">
        <div className="queue-ticket-title" onClick={onView}>
          {ticket.title}
        </div>
        <div className="queue-ticket-preview">
          {ticket.description.substring(0, 80)}...
        </div>
      </td>
      <td className="queue-td-status">
        <span className={`queue-badge status-${ticket.status}`}>
          {getStatusLabel(ticket.status)}
        </span>
      </td>
      <td className="queue-td-priority">
        <span className={`queue-badge priority-${ticket.priority}`}>
          {getPriorityIcon(ticket.priority)}
        </span>
      </td>
      <td className="queue-td-source">
        <span className={`source-badge source-${ticket.source || 'portal'}`}>
          <Icon name={getSourceIcon(ticket.source)} size={13} />
          {getSourceLabel(ticket.source)}
        </span>
      </td>
      <td className="queue-td-assignee">
        {ticket.assignedTo ? (
          <div className="queue-assignee">
            <div className="queue-assignee-avatar">
              {ticket.assignedTo.charAt(0)}
            </div>
            <span>{ticket.assignedTo}</span>
          </div>
        ) : (
          <span className="queue-unassigned">Nieprzypisane</span>
        )}
      </td>
      <td className="queue-td-date">
        {new Date(ticket.createdAt).toLocaleDateString('pl-PL', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </td>
      <td className="queue-td-actions">
        <button
          className="queue-action-btn view"
          onClick={onView}
          title="Zobacz szczegóły"
        >
          <Icon name="eye" size={16} />
        </button>
        {!ticket.assignedTo && (
          <button
            className="queue-action-btn assign"
            onClick={() => onAssign(ticket.id)}
            title="Przypisz do mnie"
          >
            <Icon name="target" size={16} />
          </button>
        )}
      </td>
    </tr>
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

function getSourceLabel(source) {
  const labels = {
    portal: 'Portal',
    email: 'E-mail',
    phone: 'Telefon',
    chat: 'Czat',
    'walk-in': 'Osobiście',
    teams: 'Teams'
  }
  return labels[source] || 'Portal'
}

function getSourceIcon(source) {
  const icons = {
    portal: 'portal',
    email: 'mail',
    phone: 'phone',
    chat: 'chat',
    'walk-in': 'walk-in',
    teams: 'teams'
  }
  return icons[source] || 'portal'
}
