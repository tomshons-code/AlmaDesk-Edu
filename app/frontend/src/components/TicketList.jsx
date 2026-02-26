import Icon from './Icon'
import '../styles/components/TicketList.css'

export default function TicketList({ tickets }) {
  if (tickets.length === 0) {
    return (
      <div className="ticket-list-empty">
        <div className="ticket-list-empty-icon">
          <Icon name="inbox" size={64} color="var(--color-text-tertiary)" />
        </div>
        <p>Brak zgłoszeń. Utwórz pierwsze zgłoszenie!</p>
      </div>
    )
  }

  return (
    <div className="ticket-list">
      {tickets.map(ticket => (
        <div key={ticket.id} className="ticket-item">
          <div className="ticket-item-header">
            <h3 className="ticket-item-title">{ticket.title}</h3>
            <div className="ticket-item-badges">
              <span className={`ticket-badge ticket-badge-status ${ticket.status}`}>
                {getStatusLabel(ticket.status)}
              </span>
              <span className={`ticket-badge ticket-badge-priority ${ticket.priority}`}>
                {getPriorityLabel(ticket.priority)}
              </span>
            </div>
          </div>

          <p className="ticket-item-description">{ticket.description}</p>

          <div className="ticket-item-footer">
            <span className="ticket-item-id">#{ticket.id}</span>
            <span className="ticket-item-date">
              <Icon name="clock" size={14} />
              <span>{new Date(ticket.createdAt).toLocaleString('pl-PL')}</span>
            </span>
          </div>
        </div>
      ))}
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
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
    critical: 'Krytyczny'
  }
  return labels[priority] || priority
}
