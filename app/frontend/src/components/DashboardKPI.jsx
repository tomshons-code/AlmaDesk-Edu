import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardStats } from '../api/stats'
import Icon from './Icon'
import '../styles/components/DashboardKPI.css'

export default function DashboardKPI() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStats()

    const interval = setInterval(() => {
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await getDashboardStats()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Load stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-kpi-wrapper">
        <div className="loading-state">Ładowanie statystyk...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-kpi-wrapper">
        <div className="alert alert-error">
          {error}
          <button onClick={loadStats} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const isUser = stats.role === 'USER'
  const isAgent = stats.role === 'AGENT' || stats.role === 'SUPER_ADMIN'

  return (
    <div className="dashboard-kpi-wrapper">
      <div className="dashboard-kpi-header">
        <h2>
          <Icon name="dashboard" size={28} />
          Panel KPI
        </h2>
      </div>

      {}
      <div className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon">
            <Icon name="ticket" size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{stats.totalTickets}</div>
            <div className="kpi-label">Wszystkie zgłoszenia</div>
          </div>
        </div>

        <div className="kpi-card kpi-info">
          <div className="kpi-icon">
            <Icon name="alert-circle" size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{stats.openTickets}</div>
            <div className="kpi-label">Otwarte</div>
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-icon">
            <Icon name="clock" size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{stats.inProgressTickets}</div>
            <div className="kpi-label">W trakcie</div>
          </div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-icon">
            <Icon name="check-circle" size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{stats.resolvedTickets}</div>
            <div className="kpi-label">Rozwiązane</div>
          </div>
        </div>

        {isAgent && (
          <>
            <div className="kpi-card kpi-accent">
              <div className="kpi-icon">
                <Icon name="user" size={32} />
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{stats.assignedToMe}</div>
                <div className="kpi-label">Przypisane do mnie</div>
              </div>
            </div>

            <div className="kpi-card kpi-secondary">
              <div className="kpi-icon">
                <Icon name="inbox" size={32} />
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{stats.unassignedTickets}</div>
                <div className="kpi-label">Nieprzypisane</div>
              </div>
            </div>
          </>
        )}

        {isUser && (
          <div className="kpi-card kpi-secondary">
            <div className="kpi-icon">
              <Icon name="archive" size={32} />
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{stats.closedTickets}</div>
              <div className="kpi-label">Zamknięte</div>
            </div>
          </div>
        )}
      </div>

      {}
      <div className="stats-details">
        {}
        <div className="stats-card">
          <h3>
            <Icon name="activity" size={20} />
            Według priorytetu
          </h3>
          <div className="stats-bars">
            <div className="stat-bar">
              <span className="stat-bar-label">
                <span className="priority-badge priority-critical">Krytyczny</span>
              </span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill critical"
                  style={{ width: `${(stats.byPriority.critical / stats.totalTickets * 100) || 0}%` }}
                />
              </div>
              <span className="stat-bar-value">{stats.byPriority.critical || 0}</span>
            </div>

            <div className="stat-bar">
              <span className="stat-bar-label">
                <span className="priority-badge priority-high">Wysoki</span>
              </span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill high"
                  style={{ width: `${(stats.byPriority.high / stats.totalTickets * 100) || 0}%` }}
                />
              </div>
              <span className="stat-bar-value">{stats.byPriority.high || 0}</span>
            </div>

            <div className="stat-bar">
              <span className="stat-bar-label">
                <span className="priority-badge priority-medium">Średni</span>
              </span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill medium"
                  style={{ width: `${(stats.byPriority.medium / stats.totalTickets * 100) || 0}%` }}
                />
              </div>
              <span className="stat-bar-value">{stats.byPriority.medium || 0}</span>
            </div>

            <div className="stat-bar">
              <span className="stat-bar-label">
                <span className="priority-badge priority-low">Niski</span>
              </span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill low"
                  style={{ width: `${(stats.byPriority.low / stats.totalTickets * 100) || 0}%` }}
                />
              </div>
              <span className="stat-bar-value">{stats.byPriority.low || 0}</span>
            </div>
          </div>
        </div>

        {}
        <div className="stats-card">
          <h3>
            <Icon name="tag" size={20} />
            Według kategorii
          </h3>
          <div className="category-stats">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="category-stat-item">
                <span className="category-name">{getCategoryName(category)}</span>
                <span className="category-count">{count}</span>
              </div>
            ))}
            {Object.keys(stats.byCategory).length === 0 && (
              <p className="empty-text">Brak danych</p>
            )}
          </div>
        </div>

        {}
        {isAgent && (
          <div className="stats-card">
            <h3>
              <Icon name="trending-up" size={20} />
              Podsumowanie
            </h3>
            <div className="summary-stats">
              <div className="summary-item">
                <Icon name="calendar" size={18} />
                <div>
                  <div className="summary-value">{stats.todayCreated}</div>
                  <div className="summary-label">Dzisiaj utworzone</div>
                </div>
              </div>
              <div className="summary-item">
                <Icon name="check" size={18} />
                <div>
                  <div className="summary-value">{stats.todayResolved}</div>
                  <div className="summary-label">Dzisiaj rozwiązane</div>
                </div>
              </div>
              <div className="summary-item">
                <Icon name="clock" size={18} />
                <div>
                  <div className="summary-value">{stats.avgResolutionTimeHours}h</div>
                  <div className="summary-label">Śr. czas rozwiązania</div>
                </div>
              </div>
              <div className="summary-item">
                <Icon name="trending-up" size={18} />
                <div>
                  <div className="summary-value">{stats.recentTickets}</div>
                  <div className="summary-label">Ostatnie 7 dni</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {}
        {isUser && (
          <div className="stats-card">
            <h3>
              <Icon name="info" size={20} />
              Podsumowanie
            </h3>
            <div className="summary-stats">
              <div className="summary-item">
                <Icon name="trending-up" size={18} />
                <div>
                  <div className="summary-value">{stats.recentTickets}</div>
                  <div className="summary-label">Ostatnie 7 dni</div>
                </div>
              </div>
              <div className="summary-item">
                <Icon name="clock" size={18} />
                <div>
                  <div className="summary-value">{stats.inProgressTickets + stats.openTickets}</div>
                  <div className="summary-label">Oczekuje na rozwiązanie</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getCategoryName(category) {
  const names = {
    HARDWARE: 'Sprzęt',
    SOFTWARE: 'Oprogramowanie',
    NETWORK: 'Sieć',
    ACCOUNT: 'Konta',
    EMAIL: 'Email',
    PRINTER: 'Drukarki',
    ACCESS: 'Dostęp',
    INFRASTRUCTURE: 'Infrastruktura',
    OTHER: 'Inne'
  }
  return names[category] || category
}
