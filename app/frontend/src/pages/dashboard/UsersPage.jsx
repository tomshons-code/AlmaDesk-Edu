import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { useAuth } from '../../contexts/AuthContext'
import '../../styles/components/UsersPage.css'

export default function UsersPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [agentRatings, setAgentRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'ratings') {
      fetchAgentRatings()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgentRatings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch('/api/users/agent-ratings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAgentRatings(data.agents || [])
      }
    } catch (error) {
      console.error('Error fetching agent ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('almadesk_token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        if (userId === user?.id) {
          alert('Twoja rola została zaktualizowana. Zostaniesz wylogowany - zaloguj się ponownie.')
          logout()
          navigate('/login')
        } else {
          alert('Rola użytkownika zaktualizowana pomyślnie!')
          fetchUsers()
          setEditingUser(null)
        }
      } else {
        alert('Błąd podczas aktualizacji roli')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Błąd podczas aktualizacji roli')
    }
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'role-badge-super-admin'
      case 'ADMIN': return 'role-badge-admin'
      case 'AGENT': return 'role-badge-agent'
      case 'KLIENT': return 'role-badge-user'
      default: return 'role-badge-user'
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'ADMIN': return 'Administrator'
      case 'AGENT': return 'Agent'
      case 'KLIENT': return 'Klient'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="users-page">
        <div className="users-loading">
          <Icon name="loader" size={32} />
          <p>Ładowanie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>
          <Icon name="users" size={28} />
          Zarządzanie użytkownikami
        </h1>
        <p className="users-subtitle">
          Zarządzaj uprawnieniami użytkowników i przeglądaj oceny agentów
        </p>
      </div>

      {}
      <div className="users-tabs">
        <button
          className={`users-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Icon name="users" size={18} />
          Użytkownicy
        </button>
        <button
          className={`users-tab ${activeTab === 'ratings' ? 'active' : ''}`}
          onClick={() => setActiveTab('ratings')}
        >
          <Icon name="star" size={18} />
          Oceny agentów
        </button>
      </div>

      {}
      {activeTab === 'users' && (
        <>
          <p className="users-note">
            ℹ️ Po zmianie roli, użytkownik musi zalogować się ponownie aby zobaczyć zmiany
          </p>

          <div className="users-list">
            <div className="users-table">
              <div className="users-table-header">
                <div className="users-col-name">Użytkownik</div>
                <div className="users-col-email">Email</div>
                <div className="users-col-role">Rola</div>
                <div className="users-col-actions">Akcje</div>
              </div>

              {users.map(user => (
                <div key={user.id} className="users-table-row">
                  <div className="users-col-name">
                    <div className="user-avatar">
                      <Icon name="user" size={20} />
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-login">@{user.login}</div>
                    </div>
                  </div>

                  <div className="users-col-email">
                    {user.email || '-'}
                  </div>

                  <div className="users-col-role">
                    {editingUser === user.id ? (
                      <select
                        className="role-select"
                        defaultValue={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        onBlur={() => setEditingUser(null)}
                        autoFocus
                      >
                        <option value="KLIENT">Klient (użytkownik końcowy)</option>
                        <option value="AGENT">Agent</option>
                        <option value="ADMIN">Administrator</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    ) : (
                      <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    )}
                  </div>

                  <div className="users-col-actions">
                    <button
                      className="btn-edit-role"
                      onClick={() => setEditingUser(user.id)}
                      title="Zmień rolę"
                    >
                      <Icon name="edit" size={16} />
                      Zmień rolę
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="users-empty">
                <Icon name="users" size={48} />
                <p>Brak użytkowników w systemie</p>
              </div>
            )}
          </div>
        </>
      )}

      {}
      {activeTab === 'ratings' && (
        <div className="agent-ratings-list">
          <div className="agent-ratings-table">
            <div className="agent-ratings-header">
              <div className="ratings-col-agent">Agent</div>
              <div className="ratings-col-stats">Statystyki</div>
              <div className="ratings-col-rating">Średnia ocena</div>
              <div className="ratings-col-distribution">Rozkład ocen</div>
            </div>

            {agentRatings.map((item) => (
              <div key={item.agent.id} className="agent-ratings-row">
                <div className="ratings-col-agent">
                  <div className="agent-avatar">
                    <Icon name="user" size={20} />
                  </div>
                  <div className="agent-info">
                    <div className="agent-name">{item.agent.name}</div>
                    <div className="agent-role">
                      <span className={`role-badge ${getRoleBadgeClass(item.agent.role)}`}>
                        {getRoleLabel(item.agent.role)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ratings-col-stats">
                  <div className="stat-item">
                    <Icon name="inbox" size={14} />
                    <span>{item.stats.assignedTickets} przypisanych</span>
                  </div>
                  <div className="stat-item">
                    <Icon name="check-circle" size={14} />
                    <span>{item.stats.resolvedTickets} rozwiązanych</span>
                  </div>
                  <div className="stat-item">
                    <Icon name="message" size={14} />
                    <span>{item.stats.totalRatings} ocen</span>
                  </div>
                </div>

                <div className="ratings-col-rating">
                  {item.stats.averageRating !== null ? (
                    <div className="average-rating">
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={star}
                            name="star"
                            size={16}
                            color={star <= Math.round(item.stats.averageRating) ? '#fbbf24' : '#d1d5db'}
                          />
                        ))}
                      </div>
                      <div className="rating-value">{item.stats.averageRating.toFixed(2)} / 5.00</div>
                    </div>
                  ) : (
                    <span className="no-rating">Brak ocen</span>
                  )}
                </div>

                <div className="ratings-col-distribution">
                  {item.stats.averageRating !== null ? (
                    <div className="rating-bars">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="rating-bar-row">
                          <span className="rating-label">{rating}★</span>
                          <div className="rating-bar">
                            <div
                              className={`rating-bar-fill rating-${rating}`}
                              style={{
                                width: `${item.stats.totalRatings > 0 ? (item.stats.ratingDistribution[rating] / item.stats.totalRatings) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="rating-count">{item.stats.ratingDistribution[rating]}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="no-data">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {agentRatings.length === 0 && (
            <div className="users-empty">
              <Icon name="star" size={48} />
              <p>Brak danych o ocenach agentów</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
