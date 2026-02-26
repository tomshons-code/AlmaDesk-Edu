import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon, { getPriorityIcon } from '../../components/Icon'
import RatingWidget from '../../components/RatingWidget'
import '../../styles/components/TicketDetails.css'

export default function TicketDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')

  useEffect(() => {
    loadTicket()
    loadComments()
  }, [id])

  const loadTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setTicket(data)
      } else {
        console.error('Failed to load ticket:', res.status)
        navigate('/portal')
      }
    } catch (error) {
      console.error('Error loading ticket:', error)
      navigate('/portal')
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const handleRate = async (ticketId, rating, comment) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/rating`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comment })
      })

      if (res.ok) {
        await loadTicket()
        alert('Dziękujemy za ocenę!')
      } else {
        const error = await res.json()
        alert(error.error || 'Nie udało się wysłać oceny')
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      throw error
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/tickets/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ content: newComment })
      })

      if (res.ok) {
        const data = await res.json()
        setComments([...comments, data])
        setNewComment('')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = (commentId, content) => {
    setEditingCommentId(commentId)
    setEditingCommentContent(content)
  }

  const handleSaveEditComment = async (commentId) => {
    if (!editingCommentContent.trim()) return

    try {
      const res = await fetch(`/api/tickets/${id}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ content: editingCommentContent })
      })

      if (res.ok) {
        const updatedComment = await res.json()
        setComments(comments.map(c => c.id === commentId ? updatedComment : c))
        setEditingCommentId(null)
        setEditingCommentContent('')
      }
    } catch (error) {
      console.error('Error editing comment:', error)
    }
  }

  const handleCloseTicket = async () => {
    if (!confirm('Czy na pewno chcesz zamknąć zgłoszenie?')) return

    setClosing(true)
    try {
      const res = await fetch(`/api/tickets/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ status: 'closed' })
      })

      if (res.ok) {
        const data = await res.json()
        setTicket(data.ticket)
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.error || 'Nie udało się zamknąć zgłoszenia')
      }
    } catch (error) {
      console.error('Error closing ticket:', error)
      alert('Nie udało się zamknąć zgłoszenia')
    } finally {
      setClosing(false)
    }
  }

  const handleReopenTicket = async () => {
    if (!confirm('Czy na pewno chcesz ponownie otworzyć zgłoszenie?')) return

    setClosing(true)
    try {
      const res = await fetch(`/api/tickets/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ status: 'open' })
      })

      if (res.ok) {
        const data = await res.json()
        setTicket(data.ticket)
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.error || 'Nie udało się ponownie otworzyć zgłoszenia')
      }
    } catch (error) {
      console.error('Error reopening ticket:', error)
      alert('Nie udało się ponownie otworzyć zgłoszenia')
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="ticket-details-loading">
        <div className="spinner"></div>
        <p>Ładowanie szczegółów zgłoszenia...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="ticket-details-error">
        <Icon name="alert" size={48} color="var(--color-danger)" />
        <h2>Zgłoszenie nie zostało znalezione</h2>
        <button onClick={() => navigate('/portal')}>Wróć do listy</button>
      </div>
    )
  }

  return (
    <div className="ticket-details-page">
      {}
      <div className="ticket-details-header">
        <button
          className="ticket-details-back"
          onClick={() => navigate('/portal')}
        >
          ← Powrót do listy
        </button>
        <div className="ticket-details-title-section">
          <div className="ticket-details-id">Zgłoszenie #{ticket.id}</div>
          <h1 className="ticket-details-title">{ticket.title}</h1>
        </div>
      </div>

      <div className="ticket-details-grid">
        {}
        <div className="ticket-details-main">
          {}
          <div className={`ticket-status-banner status-${ticket.status}`}>
            <div className="status-banner-icon">
              {getStatusIcon(ticket.status)}
            </div>
            <div className="status-banner-content">
              <div className="status-banner-title">
                Status: {getStatusLabel(ticket.status)}
              </div>
              <div className="status-banner-description">
                {getStatusDescription(ticket.status)}
              </div>
            </div>
          </div>

          {}
          <div className="ticket-card">
            <h3 className="ticket-card-title">
              <Icon name="ticket" size={20} />
              <span>Opis problemu</span>
            </h3>
            <div className="ticket-description-content">
              {ticket.description}
            </div>
          </div>

          {}
          {ticket.status === 'CLOSED' && (
            <RatingWidget
              ticketId={ticket.id}
              currentRating={ticket.rating}
              onRate={handleRate}
              readOnly={!!ticket.rating}
            />
          )}

          {}
          <div className="ticket-card">
            <h3 className="ticket-card-title">
              <Icon name="list" size={20} />
              <span>Komentarze ({comments.length})</span>
            </h3>

            {}
            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="comments-empty">
                  <p>Brak komentarzy. Dodaj pierwszy!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isEditing={editingCommentId === comment.id}
                    editingContent={editingCommentContent}
                    onEdit={(commentId, content) => handleEditComment(commentId, content)}
                    onSave={(commentId) => handleSaveEditComment(commentId)}
                    onEditContentChange={(content) => setEditingCommentContent(content)}
                    onCancelEdit={() => setEditingCommentId(null)}
                  />
                ))
              )}
            </div>

            {}
            {ticket.status !== 'closed' && (
              <form onSubmit={handleAddComment} className="comment-form">
                <div className="comment-form-avatar">
                  {user?.name?.charAt(0)}
                </div>
                <div className="comment-form-input-wrapper">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Dodaj komentarz..."
                    className="comment-form-textarea"
                    rows="3"
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    className="comment-form-submit"
                    disabled={submitting || !newComment.trim()}
                  >
                    {submitting ? 'Wysyłanie...' : 'Dodaj komentarz'}
                  </button>
                </div>
              </form>
            )}

            {ticket.status === 'closed' && (
              <div className="comments-closed-notice">
                <Icon name="alert" size={18} />
                <span>Zgłoszenie jest zamknięte. Nie można dodawać komentarzy.</span>
              </div>
            )}
          </div>
        </div>

        {}
        <aside className="ticket-details-sidebar">
          {}
          <div className="ticket-sidebar-card">
            <h4 className="ticket-sidebar-title">
              <Icon name="info" size={18} />
              <span>Informacje</span>
            </h4>

            <div className="ticket-info-item">
              <span className="ticket-info-label">Status:</span>
              <span className={`ticket-badge status-${ticket.status}`}>
                {getStatusLabel(ticket.status)}
              </span>
            </div>

            <div className="ticket-info-item">
              <span className="ticket-info-label">Priorytet:</span>
              <span className={`ticket-badge priority-${ticket.priority}`}>
                {getPriorityIcon(ticket.priority)} {getPriorityLabel(ticket.priority)}
              </span>
            </div>

            <div className="ticket-info-item">
              <span className="ticket-info-label">Utworzono:</span>
              <span className="ticket-info-value">
                {new Date(ticket.createdAt).toLocaleString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {ticket.updatedAt && (
              <div className="ticket-info-item">
                <span className="ticket-info-label">Zaktualizowano:</span>
                <span className="ticket-info-value">
                  {new Date(ticket.updatedAt).toLocaleString('pl-PL', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}

            {ticket.assignedTo && (
              <div className="ticket-info-item">
                <span className="ticket-info-label">Przypisany do:</span>
                <div className="ticket-assignee">
                  <div className="ticket-assignee-avatar">
                    {ticket.assignedTo.charAt(0)}
                  </div>
                  <span>{ticket.assignedTo}</span>
                </div>
              </div>
            )}
          </div>

          {(user?.role === 'USER' && ticket.status !== 'closed') && (
            <div className="ticket-sidebar-card actions-card">
              <h4 className="ticket-sidebar-title">
                <Icon name="check" size={18} />
                <span>Akcje</span>
              </h4>
              <button
                className="ticket-close-btn"
                onClick={handleCloseTicket}
                disabled={closing}
              >
                {closing ? 'Zamykanie...' : 'Zamknij zgłoszenie'}
              </button>
              <p className="ticket-close-hint">
                Zamknij zgłoszenie, jeśli problem został rozwiązany.
              </p>
            </div>
          )}

          {(user?.role === 'USER' && ticket.status === 'closed') && (
            <div className="ticket-sidebar-card actions-card">
              <h4 className="ticket-sidebar-title">
                <Icon name="arrow" size={18} />
                <span>Akcje</span>
              </h4>
              <button
                className="ticket-reopen-btn"
                onClick={handleReopenTicket}
                disabled={closing}
              >
                {closing ? 'Otwieranie...' : 'Ponownie otwórz'}
              </button>
              <p className="ticket-close-hint">
                Ponownie otwórz zgłoszenie, jeśli pojawił się problem.
              </p>
            </div>
          )}

          {}
          <div className="ticket-sidebar-card">
            <h4 className="ticket-sidebar-title">
              <Icon name="clock" size={18} />
              <span>Historia</span>
            </h4>
            <div className="ticket-timeline">
              <TimelineItem
                title="Zgłoszenie utworzone"
                date={ticket.createdAt}
                user={user?.name}
              />
              {ticket.status !== 'open' && (
                <TimelineItem
                  title="Status zmieniony"
                  description={`Na: ${getStatusLabel(ticket.status)}`}
                  date={ticket.updatedAt}
                />
              )}
              {ticket.status === 'resolved' && (
                <TimelineItem
                  title="Zgłoszenie rozwiązane"
                  date={ticket.resolvedAt}
                />
              )}
            </div>
          </div>

          {}
          <div className="ticket-sidebar-card help-card">
            <h4 className="ticket-sidebar-title">
              <Icon name="info" size={18} />
              <span>Potrzebujesz pomocy?</span>
            </h4>
            <p>Jeśli masz dodatkowe pytania, skontaktuj się z nami:</p>
            <a href="mailto:helpdesk@university.edu" className="help-link">
              helpdesk@university.edu
            </a>
            <a href="tel:+48123456789" className="help-link">
              +48 123 456 789
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}

function CommentItem({ comment, isEditing, editingContent, onEdit, onSave, onEditContentChange, onCancelEdit }) {
  return (
    <div className="comment-item">
      <div className="comment-avatar">
        {comment.author?.charAt(0) || '?'}
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <div className="comment-header-left">
            <span className="comment-author">{comment.author || 'Użytkownik'}</span>
            {comment.isEdited && (
              <span className="comment-edited-badge">(edytowany)</span>
            )}
          </div>
          <div className="comment-header-right">
            {!isEditing && (
              <button
                className="comment-edit-btn"
                onClick={() => onEdit(comment.id, comment.content)}
                title="Edytuj komentarz"
              >
                <Icon name="edit" size={14} />
              </button>
            )}
            <span className="comment-date">
              {new Date(comment.createdAt).toLocaleString('pl-PL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {isEditing ? (
          <div className="comment-edit-form">
            <textarea
              value={editingContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="comment-edit-textarea"
              rows="3"
            />
            <div className="comment-edit-actions">
              <button
                className="comment-save-btn"
                onClick={() => onSave(comment.id)}
              >
                <Icon name="check" size={14} /> Zapisz
              </button>
              <button
                className="comment-cancel-btn"
                onClick={onCancelEdit}
              >
                <Icon name="x" size={14} /> Anuluj
              </button>
            </div>
          </div>
        ) : (
          <div className="comment-text">{comment.content}</div>
        )}
      </div>
    </div>
  )
}

function TimelineItem({ icon, title, description, date, user }) {
  return (
    <div className="timeline-item">
      <div className="timeline-icon">{icon}</div>
      <div className="timeline-content">
        <div className="timeline-title">{title}</div>
        {description && <div className="timeline-description">{description}</div>}
        {user && <div className="timeline-user">{user}</div>}
        {date && (
          <div className="timeline-date">
            {new Date(date).toLocaleString('pl-PL', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function getStatusLabel(status) {
  const labels = {
    open: 'Nowe',
    'in-progress': 'W trakcie realizacji',
    resolved: 'Rozwiązane',
    closed: 'Zamknięte'
  }
  return labels[status] || status
}

function getStatusIcon(status) {
  switch (status) {
    case 'open':
      return <Icon name="inbox" size={20} />
    case 'in-progress':
      return <Icon name="clock" size={20} />
    case 'resolved':
      return <Icon name="check" size={20} />
    case 'closed':
      return <Icon name="lock" size={20} />
    default:
      return <Icon name="info" size={20} />
  }
}

function getStatusDescription(status) {
  const descriptions = {
    open: 'Twoje zgłoszenie zostało przyjęte i oczekuje na przypisanie.',
    'in-progress': 'Nasz zespół pracuje nad rozwiązaniem problemu.',
    resolved: 'Problem został rozwiązany. Możesz zamknąć zgłoszenie.',
    closed: 'Zgłoszenie zostało zamknięte.'
  }
  return descriptions[status] || ''
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
