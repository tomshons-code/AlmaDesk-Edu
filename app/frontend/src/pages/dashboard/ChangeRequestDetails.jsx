import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import '../../styles/components/ChangeRequests.css'

export default function ChangeRequestDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [changeRequest, setChangeRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusComment, setStatusComment] = useState('')

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignToId, setAssignToId] = useState('')
  const [users, setUsers] = useState([])

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')

  useEffect(() => {
    loadChangeRequest()
    loadUsers()
  }, [id])

  const loadChangeRequest = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/change-requests/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })

      if (!res.ok) throw new Error('Nie można załadować wniosku')

      const data = await res.json()
      setChangeRequest(data)
    } catch (error) {
      console.error('Error loading change request:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      const data = await res.json()
      setUsers(data.filter(u => ['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(u.role)))
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleStatusChange = async () => {
    if (!statusComment.trim()) {
      alert('Komentarz jest wymagany')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/change-requests/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ newStatus, comment: statusComment })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Błąd zmiany statusu')
      }

      await loadChangeRequest()
      setShowStatusModal(false)
      setStatusComment('')
      setNewStatus('')
    } catch (error) {
      alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!assignToId) {
      alert('Wybierz użytkownika')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/change-requests/${id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ assignToId: parseInt(assignToId) })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Błąd przypisywania')
      }

      await loadChangeRequest()
      setShowAssignModal(false)
      setAssignToId('')
    } catch (error) {
      alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (!scheduledStart || !scheduledEnd) {
      alert('Podaj datę początkową i końcową')
      return
    }

    if (new Date(scheduledStart) >= new Date(scheduledEnd)) {
      alert('Data zakończenia musi być późniejsza niż data rozpoczęcia')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/change-requests/${id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ scheduledStart, scheduledEnd })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Błąd planowania')
      }

      await loadChangeRequest()
      setShowScheduleModal(false)
      setScheduledStart('')
      setScheduledEnd('')
    } catch (error) {
      alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Czy na pewno chcesz usunąć ten szkic?')) return

    try {
      const res = await fetch(`/api/change-requests/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Błąd usuwania')
      }

      navigate('/dashboard/change-requests')
    } catch (error) {
      alert(error.message)
    }
  }

  const getAvailableTransitions = (currentStatus) => {
    const transitions = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED'],
      APPROVED: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['IMPLEMENTED', 'FAILED'],
      IMPLEMENTED: ['VERIFIED', 'FAILED'],
      VERIFIED: ['CLOSED'],
      FAILED: ['SCHEDULED']
    }
    return transitions[currentStatus] || []
  }

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

  if (loading) {
    return (
      <div className="loading-state">
        <Icon name="loader" size={32} />
        Ładowanie...
      </div>
    )
  }

  if (error || !changeRequest) {
    return (
      <div className="error-state">
        <Icon name="alert-circle" size={48} />
        <p>{error || 'Nie znaleziono wniosku'}</p>
        <button onClick={() => navigate('/dashboard/change-requests')}>
          Powrót do listy
        </button>
      </div>
    )
  }

  const canEdit = changeRequest.status === 'DRAFT' && changeRequest.requestedById === user?.id
  const canDelete = changeRequest.status === 'DRAFT' && changeRequest.requestedById === user?.id
  const availableTransitions = getAvailableTransitions(changeRequest.status)

  return (
    <div className="change-request-details-page">
      <div className="page-header">
        <button
          className="btn-back"
          onClick={() => navigate('/dashboard/change-requests')}
        >
          <Icon name="arrow-left" size={18} />
          Powrót
        </button>
        <div className="header-content">
          <div className="page-title">
            <Icon name="git-branch" size={28} />
            <h1>Wniosek o zmianę #{changeRequest.id}</h1>
          </div>
          <div className="header-actions">
            {canEdit && (
              <button
                className="btn btn-outline"
                onClick={() => navigate(`/dashboard/change-requests/${id}/edit`)}
              >
                <Icon name="edit" size={18} />
                Edytuj
              </button>
            )}
            {canDelete && (
              <button
                className="btn btn-danger"
                onClick={handleDelete}
              >
                <Icon name="trash" size={18} />
                Usuń
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="details-layout">
        <div className="details-main">
          <div className="details-card">
            <div className="card-header">
              <h2>{changeRequest.title}</h2>
              <span className={`status-badge status-${changeRequest.status.toLowerCase()}`}>
                {getStatusLabel(changeRequest.status)}
              </span>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <label>Priorytet</label>
                <span className={`priority-badge priority-${changeRequest.priority.toLowerCase()}`}>
                  {getPriorityLabel(changeRequest.priority)}
                </span>
              </div>

              <div className="detail-item">
                <label>Kategoria</label>
                <span>{changeRequest.category}</span>
              </div>

              <div className="detail-item">
                <label>Wnioskodawca</label>
                <span>{changeRequest.requestedBy?.name || 'N/A'}</span>
              </div>

              <div className="detail-item">
                <label>Przypisany do</label>
                <span>{changeRequest.assignedTo?.name || 'Nie przypisano'}</span>
              </div>

              <div className="detail-item">
                <label>Zatwierdzony przez</label>
                <span>{changeRequest.approvedBy?.name || '-'}</span>
              </div>

              <div className="detail-item">
                <label>Szacowany czas</label>
                <span>{changeRequest.estimatedDuration ? `${changeRequest.estimatedDuration} min` : '-'}</span>
              </div>
            </div>

            <div className="section">
              <h3>Opis</h3>
              <p className="text-content">{changeRequest.description}</p>
            </div>

            <div className="section">
              <h3>Uzasadnienie</h3>
              <p className="text-content">{changeRequest.justification}</p>
            </div>

            {changeRequest.impactAnalysis && (
              <div className="section">
                <h3>Analiza wpływu</h3>
                <p className="text-content">{changeRequest.impactAnalysis}</p>
              </div>
            )}

            {changeRequest.riskAssessment && (
              <div className="section">
                <h3>Ocena ryzyka</h3>
                <p className="text-content">{changeRequest.riskAssessment}</p>
              </div>
            )}

            {changeRequest.rollbackPlan && (
              <div className="section">
                <h3>Plan wycofania (rollback)</h3>
                <p className="text-content">{changeRequest.rollbackPlan}</p>
              </div>
            )}

            {(changeRequest.scheduledStart || changeRequest.scheduledEnd) && (
              <div className="section">
                <h3>Harmonogram</h3>
                <div className="schedule-info">
                  <div>
                    <strong>Początek:</strong> {formatDate(changeRequest.scheduledStart)}
                  </div>
                  <div>
                    <strong>Koniec:</strong> {formatDate(changeRequest.scheduledEnd)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {}
          {changeRequest.auditLogs && changeRequest.auditLogs.length > 0 && (
            <div className="details-card">
              <h2>Historia zmian</h2>
              <div className="audit-log">
                {changeRequest.auditLogs.map((log, index) => (
                  <div key={index} className="audit-entry">
                    <div className="audit-header">
                      <span className="audit-user">
                        <Icon name="user" size={14} />
                        {log.performedBy?.name || 'System'}
                      </span>
                      <span className="audit-date">{formatDate(log.createdAt)}</span>
                    </div>
                    <div className="audit-action">
                      <strong>{log.action}</strong>
                      {log.oldValue && log.newValue && (
                        <span className="audit-change">
                          {' '}{log.oldValue} → {log.newValue}
                        </span>
                      )}
                    </div>
                    {log.comment && (
                      <div className="audit-comment">{log.comment}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="details-sidebar">
          {}
          {availableTransitions.length > 0 && (
            <div className="sidebar-card">
              <h3>Workflow</h3>
              <div className="workflow-actions">
                {availableTransitions.map(status => (
                  <button
                    key={status}
                    className="btn btn-workflow"
                    onClick={() => {
                      setNewStatus(status)
                      setShowStatusModal(true)
                    }}
                  >
                    <Icon name="arrow-right" size={16} />
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {}
          <div className="sidebar-card">
            <h3>Akcje</h3>
            <div className="quick-actions">
              {changeRequest.status === 'APPROVED' && (
                <button
                  className="btn btn-outline"
                  onClick={() => setShowAssignModal(true)}
                >
                  <Icon name="user-check" size={16} />
                  Przypisz implementera
                </button>
              )}

              {['APPROVED', 'SCHEDULED'].includes(changeRequest.status) && (
                <button
                  className="btn btn-outline"
                  onClick={() => setShowScheduleModal(true)}
                >
                  <Icon name="calendar" size={16} />
                  Zaplanuj realizację
                </button>
              )}
            </div>
          </div>

          {}
          <div className="sidebar-card">
            <h3>Informacje</h3>
            <div className="info-list">
              <div className="info-item">
                <label>Data utworzenia</label>
                <span>{formatDate(changeRequest.createdAt)}</span>
              </div>
              <div className="info-item">
                <label>Ostatnia aktualizacja</label>
                <span>{formatDate(changeRequest.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Zmień status na: {getStatusLabel(newStatus)}</h2>
              <button onClick={() => setShowStatusModal(false)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Komentarz *</label>
                <textarea
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  rows={4}
                  placeholder="Opis zmiany statusu..."
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowStatusModal(false)}
              >
                Anuluj
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStatusChange}
                disabled={actionLoading}
              >
                {actionLoading ? 'Zapisywanie...' : 'Zmień status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Przypisz implementera</h2>
              <button onClick={() => setShowAssignModal(false)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Wybierz użytkownika</label>
                <select
                  value={assignToId}
                  onChange={(e) => setAssignToId(e.target.value)}
                >
                  <option value="">-- Wybierz --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAssignModal(false)}
              >
                Anuluj
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAssign}
                disabled={actionLoading}
              >
                {actionLoading ? 'Przypisywanie...' : 'Przypisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Zaplanuj okno realizacji</h2>
              <button onClick={() => setShowScheduleModal(false)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Data i czas rozpoczęcia</label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Data i czas zakończenia</label>
                <input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowScheduleModal(false)}
              >
                Anuluj
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSchedule}
                disabled={actionLoading}
              >
                {actionLoading ? 'Zapisywanie...' : 'Zaplanuj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
