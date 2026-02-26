import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon, { getPriorityIcon } from '../../components/Icon'
import { SkeletonTable } from '../../components/Skeleton'
import '../../styles/components/MyTickets.css'

export default function MyTickets() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    loadMyTickets()
  }, [])

  const loadMyTickets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      const data = await res.json()

      const myTickets = data.filter(ticket => ticket.assignedTo === user?.login)
      setTickets(myTickets)
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortedTickets = [...tickets].sort((a, b) => {
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
    resolved: tickets.filter(t => t.status === 'resolved').length
  }

  if (loading) {
    return (
      <div className="my-tickets-page">
        <div className="my-tickets-header">
          <div className="my-tickets-header-left">
            <h1><Icon name="user" size={24} /> Moje zgłoszenia</h1>
          </div>
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div className="my-tickets-page">
      {}
      <div className="my-tickets-header">
        <div className="my-tickets-header-left">
          <h1><Icon name="user" size={24} /> Moje zgłoszenia</h1>
          <p>Zgłoszenia przypisane do Ciebie</p>
        </div>
        <div className="my-tickets-stats">
          <div className="my-stat-card">
            <div className="my-stat-value">{stats.total}</div>
            <div className="my-stat-label">Wszystkie</div>
          </div>
          <div className="my-stat-card">
            <div className="my-stat-value">{stats.inProgress}</div>
            <div className="my-stat-label">W trakcie</div>
          </div>
          <div className="my-stat-card">
            <div className="my-stat-value">{stats.open}</div>
            <div className="my-stat-label">Nowe</div>
          </div>
        </div>
      </div>

      {}
      <div className="my-tickets-controls">
        <div className="my-tickets-sort">
          <label>Sortuj:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="my-tickets-select"
          >
            <option value="newest">Najnowsze</option>
            <option value="oldest">Najstarsze</option>
            <option value="priority">Priorytet</option>
            <option value="updated">Ostatnio zaktualizowane</option>
          </select>
        </div>
      </div>

      {}
      {sortedTickets.length === 0 ? (
        <div className="my-tickets-empty">
          <div className="my-tickets-empty-icon"><Icon name="inbox" size={64} /></div>
          <h3>Brak zgłoszeń</h3>
          <p>Nie masz jeszcze przypisanych żadnych zgłoszeń.</p>
          <button
            className="my-tickets-go-queue"
            onClick={() => navigate('/dashboard/queue')}
          >
            <Icon name="list" size={18} /> Przejdź do kolejki zgłoszeń
          </button>
        </div>
      ) : (
        <div className="my-tickets-table-wrapper">
          <table className="my-tickets-table">
            <thead>
              <tr>
                <th className="my-th-id">ID</th>
                <th className="my-th-title">Tytuł</th>
                <th className="my-th-status">Status</th>
                <th className="my-th-priority">Priorytet</th>
                <th className="my-th-date">Data utworzenia</th>
                <th className="my-th-actions">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {sortedTickets.map(ticket => (
                <MyTicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onView={() => navigate(`/dashboard/ticket/${ticket.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MyTicketRow({ ticket, onView }) {
  return (
    <tr className="my-ticket-row">
      <td className="my-td-id">
        <span className="my-ticket-id">#{ticket.id}</span>
      </td>
      <td className="my-td-title">
        <div className="my-ticket-title" onClick={onView}>
          {ticket.title}
        </div>
        <div className="my-ticket-preview">
          {ticket.description.substring(0, 80)}...
        </div>
      </td>
      <td className="my-td-status">
        <span className={`my-badge status-${ticket.status}`}>
          {getStatusLabel(ticket.status)}
        </span>
      </td>
      <td className="my-td-priority">
        <span className={`my-badge priority-${ticket.priority}`}>
          {getPriorityIcon(ticket.priority)}
        </span>
      </td>
      <td className="my-td-date">
        {new Date(ticket.createdAt).toLocaleDateString('pl-PL', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </td>
      <td className="my-td-actions">
        <button
          className="my-action-btn"
          onClick={onView}
          title="Zobacz szczegóły"
        >
          <Icon name="eye" size={16} />
        </button>
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
