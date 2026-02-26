import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon, { getPriorityIcon } from '../../components/Icon'
import DashboardKPI from '../../components/DashboardKPI'
import { SkeletonCard, SkeletonTable } from '../../components/Skeleton'
import '../../styles/components/DashboardHome.css'

export default function DashboardHome() {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    unassigned: 0,
    myTickets: 0
  })
  const [loading, setLoading] = useState(true)
  const [recurringAlerts, setRecurringAlerts] = useState([])
  const [alertsDismissed, setAlertsDismissed] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    if (user && ['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      fetch('/api/stats/recurring-alerts?days=30&min=3', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.alerts?.length) setRecurringAlerts(data.alerts) })
        .catch(() => {})
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      const res = await fetch('/api/tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      const data = await res.json()
      setTickets(data)

      const calculated = {
        total: data.length,
        open: data.filter(t => t.status === 'open').length,
        inProgress: data.filter(t => t.status === 'in-progress').length,
        resolved: data.filter(t => t.status === 'resolved').length,
        unassigned: data.filter(t => !t.assignedTo).length,
        myTickets: data.filter(t => t.assignedTo === user?.login).length
      }
      setStats(calculated)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-home">
        <div className="dashboard-welcome">
          <div><h1>Ładowanie...</h1></div>
        </div>
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  const recentTickets = tickets.slice(0, 5)

  return (
    <div className="dashboard-home">
      {}
      <div className="dashboard-welcome">
        <div>
          <h1>Witaj, {user?.name}! <Icon name="home" size={28} /></h1>
          <p>Oto podsumowanie Twojej pracy</p>
        </div>
        <button
          className="dashboard-action-btn"
          onClick={() => navigate('/dashboard/queue')}
        >
          Zobacz kolejkę zgłoszeń →
        </button>
      </div>

      {}
      <div className="dashboard-kpi-section">
        <DashboardKPI />
      </div>

      {}
      {recurringAlerts.length > 0 && !alertsDismissed && ['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
        <div className="dashboard-alerts-section">
          <div className="dashboard-alerts-header">
            <h2><Icon name="alert" size={20} /> Powtarzające się problemy (ostatnie 30 dni)</h2>
            <button className="alerts-dismiss-btn" onClick={() => setAlertsDismissed(true)} title="Ukryj alerty">
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="dashboard-alerts-list">
            {recurringAlerts.slice(0, 4).map(alert => (
              <div key={alert.id} className={`dashboard-alert-card dashboard-alert-${alert.severity}`}>
                <div className="dashboard-alert-top">
                  <span className={`dashboard-alert-badge dashboard-alert-badge-${alert.severity}`}>
                    {alert.type === 'category' ? 'Kategoria' : alert.type === 'tag' ? 'Tag' : 'Priorytet'}
                  </span>
                  <strong className="dashboard-alert-label">{alert.label}</strong>
                  <span className="dashboard-alert-count">{alert.count} zgłosz. ({alert.percent}%)</span>
                </div>
                <p className="dashboard-alert-suggestion">{alert.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      <div className="dashboard-quick-actions-section">
        <h2><Icon name="zap" size={22} /> Szybkie akcje</h2>
        <div className="dashboard-quick-actions">
          <QuickActionCard
            icon={<Icon name="target" size={32} />}
            title="Przypisz do siebie"
            description="Weź zgłoszenie z kolejki"
            onClick={() => navigate('/dashboard/queue?action=assign')}
          />
          <QuickActionCard
            icon={<Icon name="search" size={32} />}
            title="Wyszukaj zgłoszenie"
            description="Znajdź po numerze lub słowie kluczowym"
            onClick={() => navigate('/dashboard/queue?search=true')}
          />
          <QuickActionCard
            icon={<Icon name="chart" size={32} />}
            title="Zobacz raporty"
            description="Statystyki i wydajność"
            onClick={() => navigate('/dashboard/reports')}
          />
          <QuickActionCard
            icon={<Icon name="ticket" size={32} />}
            title="Baza wiedzy"
            description="Rozwiązania częstych problemów"
            onClick={() => navigate('/knowledge-base')}
          />
        </div>
      </div>

      {}
      <div className="dashboard-recent-section">
        <div className="dashboard-section-header">
          <h2><Icon name="list" size={22} /> Ostatnie zgłoszenia</h2>
          <button
            className="dashboard-view-all-btn"
            onClick={() => navigate('/dashboard/queue')}
          >
            Zobacz wszystkie →
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <div className="dashboard-empty">
            <p>Brak zgłoszeń</p>
          </div>
        ) : (
          <div className="dashboard-tickets-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tytuł</th>
                  <th>Status</th>
                  <th>Priorytet</th>
                  <th>Przypisany do</th>
                  <th>Utworzono</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map(ticket => (
                  <tr key={ticket.id} onClick={() => navigate(`/dashboard/ticket/${ticket.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="ticket-id">#{ticket.id}</td>
                    <td className="ticket-title">{ticket.title}</td>
                    <td>
                      <span className={`status-badge ${ticket.status}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge ${ticket.priority}`}>
                        {getPriorityIcon(ticket.priority)}
                      </span>
                    </td>
                    <td className="ticket-assignee">
                      {ticket.assignedTo ? (
                        <div className="assignee-info">
                          <div className="assignee-avatar">
                            {ticket.assignedTo.charAt(0)}
                          </div>
                          <span>{ticket.assignedTo}</span>
                        </div>
                      ) : (
                        <span className="unassigned">Nieprzypisane</span>
                      )}
                    </td>
                    <td className="ticket-date">
                      {new Date(ticket.createdAt).toLocaleDateString('pl-PL')}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {}
      <div className="dashboard-activity-section">
        <h2><Icon name="bell" size={22} /> Ostatnia aktywność</h2>
        <div className="activity-feed">
          <ActivityItem
            icon={<Icon name="plus" size={20} />}
            title="Nowe zgłoszenie #1234"
            description="Jan Kowalski zgłosił problem z drukarką"
            time="5 min temu"
          />
          <ActivityItem
            icon={<Icon name="check" size={20} />}
            title="Zgłoszenie #1230 rozwiązane"
            description="Anna Nowak rozwiązała problem z Wi-Fi"
            time="23 min temu"
          />
          <ActivityItem
            icon={<Icon name="message" size={20} />}
            title="Nowy komentarz w #1228"
            description="Użytkownik odpowiedział na Twoje pytanie"
            time="1 godz. temu"
          />
        </div>
      </div>
    </div>
  )

  async function handleAssignToMe(ticketId) {
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
        loadDashboardData()
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
    }
  }
}

function StatCard({ icon, label, value, color, trend, isTime, onClick }) {
  return (
    <div
      className={`dashboard-stat-card ${onClick ? 'clickable' : ''}`}
      style={{ borderLeft: `4px solid ${color}` }}
      onClick={onClick}
    >
      <div className="stat-card-icon" style={{ color }}>{icon}</div>
      <div className="stat-card-content">
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {trend === 'urgent' && <span className="stat-card-trend urgent"><Icon name="alert" size={14} /> Wymaga uwagi</span>}
      </div>
    </div>
  )
}

function QuickActionCard({ icon, title, description, onClick }) {
  return (
    <div className="quick-action-card" onClick={onClick}>
      <div className="quick-action-icon">{icon}</div>
      <div className="quick-action-title">{title}</div>
      <div className="quick-action-description">{description}</div>
    </div>
  )
}

function ActivityItem({ icon, title, description, time }) {
  return (
    <div className="activity-item">
      <div className="activity-icon">{icon}</div>
      <div className="activity-content">
        <div className="activity-title">{title}</div>
        <div className="activity-description">{description}</div>
        <div className="activity-time">{time}</div>
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
