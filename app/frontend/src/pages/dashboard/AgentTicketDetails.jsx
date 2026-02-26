import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon, { getPriorityIcon } from '../../components/Icon'
import TemplateQuickInsert from '../../components/TemplateQuickInsert'
import TemplateSuggestions from '../../components/TemplateSuggestions'
import RatingWidget from '../../components/RatingWidget'
import CustomSelect from '../../components/CustomSelect'
import CreateUserModal from '../../components/CreateUserModal'
import TicketTagManager from '../../components/TicketTagManager'
import '../../styles/components/AgentTicketDetails.css'
import '../../styles/components/RegisterTicketModal.css'

export default function AgentTicketDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')
  const [users, setUsers] = useState([])
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [userExists, setUserExists] = useState(true)

  useEffect(() => {
    loadTicket()
    loadComments()
    loadAttachments()
    loadUsers()
  }, [id])

  useEffect(() => {
    if (ticket?.createdBy) {
      checkUserExists(ticket.createdBy)
    }
  }, [ticket?.createdBy])

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
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Error loading ticket:', error)
      navigate('/dashboard')
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

  const loadAttachments = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}/attachments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setAttachments(data)
      }
    } catch (error) {
      console.error('Error loading attachments:', error)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await fetch(`/api/tickets/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        const data = await res.json()
        setTicket(data.ticket)
      }
    } catch (error) {
      console.error('Error changing status:', error)
    }
  }

  const handlePriorityChange = async (newPriority) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ priority: newPriority })
      })

      if (res.ok) {
        const data = await res.json()
        setTicket(data)
      }
    } catch (error) {
      console.error('Error changing priority:', error)
    }
  }

  const handleCategoryChange = async (newCategory) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ category: newCategory })
      })

      if (res.ok) {
        const data = await res.json()
        setTicket(data)
      }
    } catch (error) {
      console.error('Error changing category:', error)
    }
  }

  const handleAssignChange = async (assignTo) => {
    try {
      const res = await fetch(`/api/tickets/${id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ assignTo })
      })

      if (res.ok) {
        const data = await res.json()
        setTicket(data.ticket)
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const checkUserExists = async (email) => {
    if (!email) {
      setUserExists(true)
      return
    }

    try {
      const res = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUserExists(data.exists)
      } else {
        setUserExists(true)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUserExists(true)
    }
  }

  const handleAssignToMe = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ assignTo: user?.login })
      })

      if (res.ok) {
        const data = await res.json()
        setTicket(data.ticket)
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
    }
  }

  const handleArchive = async () => {
    const isArchiving = !ticket.isArchived
    const confirmMessage = isArchiving
      ? 'Czy na pewno chcesz zarchiwizować to zgłoszenie?'
      : 'Czy na pewno chcesz przywrócić to zgłoszenie z archiwum?'

    if (!confirm(confirmMessage)) return

    try {
      const res = await fetch(`/api/tickets/${id}/archive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({ archive: isArchiving })
      })

      if (res.ok) {
        await loadTicket()
        alert(isArchiving ? 'Zgłoszenie zarchiwizowane' : 'Zgłoszenie przywrócone z archiwum')
      } else {
        const error = await res.json()
        alert(error.error || 'Błąd podczas archiwizacji')
      }
    } catch (error) {
      console.error('Error archiving ticket:', error)
      alert('Błąd podczas archiwizacji')
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles(files)
  }

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadAttachments = async () => {
    if (selectedFiles.length === 0) return

    const formData = new FormData()
    selectedFiles.forEach(file => {
      formData.append('files', file)
    })

    try {
      const res = await fetch(`/api/tickets/${id}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: formData
      })

      if (res.ok) {
        setSelectedFiles([])
        loadAttachments()
      }
    } catch (error) {
      console.error('Error uploading attachments:', error)
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
        body: JSON.stringify({
          content: newComment,
          isInternal: isInternalComment
        })
      })

      if (res.ok) {
        const data = await res.json()
        setComments([...comments, data])
        setNewComment('')
        setIsInternalComment(false)

        await uploadAttachments()
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

  const handleInsertTemplate = (content) => {
    setNewComment(newComment + (newComment ? '\n\n' : '') + content)
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Czy na pewno chcesz usunąć ten załącznik?')) return

    try {
      const res = await fetch(`/api/tickets/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })

      if (res.ok) {
        loadAttachments()
      }
    } catch (error) {
      console.error('Error deleting attachment:', error)
    }
  }

  if (loading) {
    return (
      <div className="agent-ticket-loading">
        <div className="spinner"></div>
        <p>Ładowanie szczegółów zgłoszenia...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="agent-ticket-error">
        <h2><Icon name="alert" size={24} /> Zgłoszenie nie zostało znalezione</h2>
        <button onClick={() => navigate('/dashboard')}>Wróć do dashboardu</button>
      </div>
    )
  }

  return (
    <div className="agent-ticket-page">
      {}
      <div className="agent-ticket-header">
        <div className="agent-ticket-header-left">
          <button
            className="agent-ticket-back"
            onClick={() => navigate('/dashboard')}
          >
            ← Powrót do dashboardu
          </button>
          <div className="agent-ticket-title-section">
            <div className="agent-ticket-id">Zgłoszenie #{ticket.id}</div>
            <h1 className="agent-ticket-title">{ticket.title}</h1>
          </div>
        </div>
        <div className="agent-ticket-actions">
          {(ticket.status === 'closed' || ticket.status === 'resolved') && (
            <button
              className={`action-btn ${ticket.isArchived ? 'unarchive-btn' : 'archive-btn'}`}
              onClick={handleArchive}
              title={ticket.isArchived ? 'Przywróć z archiwum' : 'Archiwizuj zgłoszenie'}
            >
              <Icon name={ticket.isArchived ? "inbox" : "archive"} size={18} />
              <span>{ticket.isArchived ? 'Przywróć' : 'Archiwizuj'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="agent-ticket-grid">
        {}
        <div className="agent-ticket-main">
          {}
          <div className="agent-ticket-card">
            <h3 className="agent-card-title"><Icon name="edit" size={20} /> Opis problemu</h3>
            <div className="agent-ticket-description">
              {ticket.description}
            </div>
          </div>

          {}
          {ticket.rating && (
            <div className="agent-ticket-card">
              <h3 className="agent-card-title">
                <Icon name="star" size={20} /> Ocena klienta
              </h3>
              <div className="rating-display">
                <RatingWidget
                  ticketId={ticket.id}
                  currentRating={ticket.rating}
                  readOnly={true}
                />
                {ticket.ratingComment && (
                  <div className="rating-comment-display">
                    <p className="rating-comment-label">Komentarz:</p>
                    <p className="rating-comment-text">{ticket.ratingComment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {}
          <div className="agent-ticket-card">
            <h3 className="agent-card-title">
              <Icon name="message" size={20} /> Komentarze ({comments.length})
            </h3>

            <div className="agent-comments-list">
              {comments.length === 0 ? (
                <div className="agent-comments-empty">
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

            <form onSubmit={handleAddComment} className="agent-comment-form">
              <div className="agent-comment-form-avatar">
                {user?.name?.charAt(0)}
              </div>
              <div className="agent-comment-form-input-wrapper">
                {}
                {!isInternalComment && ticket && (
                  <TemplateSuggestions
                    category={ticket.category}
                    keywords={[ticket.title, ticket.description].filter(Boolean).join(' ')}
                    onInsert={handleInsertTemplate}
                  />
                )}
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Dodaj komentarz do zgłoszenia..."
                  className="agent-comment-form-textarea"
                  rows="3"
                  disabled={submitting}
                />

                {}
                {selectedFiles.length > 0 && (
                  <div className="agent-selected-files">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="agent-selected-file">
                        <Icon name="file" size={14} />
                        <span className="agent-selected-file-name">{file.name}</span>
                        <span className="agent-selected-file-size">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="agent-selected-file-remove"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="agent-comment-form-footer">
                  <div className="agent-comment-form-left">
                    <label className="agent-comment-internal-checkbox">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        disabled={submitting}
                      />
                      <Icon name="lock" size={14} />
                      <span>Wewnętrzny</span>
                    </label>
                    <TemplateQuickInsert
                      onInsert={handleInsertTemplate}
                      category={ticket?.category}
                    />
                    <label className="agent-comment-file-upload">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        disabled={submitting}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                        style={{ display: 'none' }}
                      />
                      <Icon name="paperclip" size={16} />
                      <span>Załącz pliki</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="agent-comment-form-submit"
                    disabled={submitting || !newComment.trim()}
                  >
                    {submitting ? 'Wysyłanie...' : 'Dodaj komentarz'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {}
        <aside className="agent-ticket-sidebar">
          {}
          <div className="agent-sidebar-card">
            <h4 className="agent-sidebar-title">
              <Icon name="info" size={18} />
              <span>Informacje</span>
            </h4>

            <div className="agent-info-item">
              <span className="agent-info-label">Status:</span>
              <CustomSelect
                value={ticket.status}
                onChange={handleStatusChange}
                maxHeight="50rem"
                options={[
                  { value: 'open', label: 'Nowe' },
                  { value: 'in-progress', label: 'W trakcie' },
                  { value: 'resolved', label: 'Rozwiązane' },
                  { value: 'closed', label: 'Zamknięte' }
                ]}
              />
            </div>

            <div className="agent-info-item">
              <span className="agent-info-label">Priorytet:</span>
              <CustomSelect
                value={ticket.priority}
                onChange={handlePriorityChange}
                maxHeight="50rem"
                options={[
                  { value: 'low', label: '🟢 Niski' },
                  { value: 'medium', label: '🟡 Średni' },
                  { value: 'high', label: '🟠 Wysoki' },
                  { value: 'critical', label: '🔴 Krytyczny' }
                ]}
              />
            </div>

            <div className="agent-info-item">
              <span className="agent-info-label">Kategoria:</span>
              <CustomSelect
                value={ticket.category}
                onChange={handleCategoryChange}
                maxHeight="15rem"
                options={[
                  { value: 'hardware', label: 'Sprzęt' },
                  { value: 'software', label: 'Oprogramowanie' },
                  { value: 'network', label: 'Sieć' },
                  { value: 'account', label: 'Konto' },
                  { value: 'other', label: 'Inne' }
                ]}
              />
            </div>

            <div className="agent-info-item">
              <span className="agent-info-label">Zgłaszający:</span>
              <span className="agent-info-value">
                {ticket.createdBy}
                {!userExists && (
                  <button
                    className="btn-create-user"
                    onClick={() => setShowCreateUserModal(true)}
                    title="Utwórz użytkownika dla tego emaila"
                  >
                    <Icon name="user-plus" size={14} />
                    Utwórz użytkownika
                  </button>
                )}
              </span>
            </div>

            <div className="agent-info-item">
              <span className="agent-info-label">Kanał:</span>
              <span className="agent-info-value">
                <span className={`source-badge source-${ticket.source || 'portal'}`}>
                  <Icon name={{
                    portal: 'portal', email: 'mail', phone: 'phone',
                    chat: 'chat', 'walk-in': 'walk-in', teams: 'teams'
                  }[ticket.source] || 'portal'} size={13} />
                  {{
                    portal: 'Portal', email: 'E-mail', phone: 'Telefon',
                    chat: 'Czat', 'walk-in': 'Osobiście', teams: 'Teams'
                  }[ticket.source] || 'Portal'}
                </span>
              </span>
            </div>

            {ticket.location && (
              <div className="agent-info-item">
                <span className="agent-info-label">Lokalizacja:</span>
                <span className="agent-info-value">{ticket.location}</span>
              </div>
            )}

            {ticket.department && (
              <div className="agent-info-item">
                <span className="agent-info-label">Wydział:</span>
                <span className="agent-info-value">{ticket.department}</span>
              </div>
            )}

            {ticket.laboratory && (
              <div className="agent-info-item">
                <span className="agent-info-label">Laboratorium:</span>
                <span className="agent-info-value">{ticket.laboratory}</span>
              </div>
            )}

            <div className="agent-info-item">
              <span className="agent-info-label">Utworzono:</span>
              <span className="agent-info-value">
                {new Date(ticket.createdAt).toLocaleString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="agent-info-item">
              <span className="agent-info-label">Przypisany do:</span>
              <CustomSelect
                value={ticket.assignedTo || ''}
                onChange={handleAssignChange}
                maxHeight="12rem"
                options={[
                  { value: '', label: 'Nieprzypisane' },
                  ...users.map(u => ({ value: u.login, label: u.name || u.login }))
                ]}
              />
            </div>
          </div>

          {}
          <div className="agent-sidebar-card">
            <h4 className="agent-sidebar-title">
              <Icon name="tag" size={18} /> Tagi
            </h4>
            <TicketTagManager
              ticketId={ticket.id}
              currentTags={ticket.tags || []}
              onTagsUpdated={loadTicket}
            />
          </div>

          {}
          <div className="agent-sidebar-card">
            <h4 className="agent-sidebar-title"><Icon name="clock" size={18} /> Historia</h4>
            <div className="agent-timeline">
              <TimelineItem
                icon={<Icon name="plus" size={16} />}
                title="Zgłoszenie utworzone"
                date={ticket.createdAt}
                user={ticket.createdBy}
              />
              {ticket.assignedTo && (
                <TimelineItem
                  icon={<Icon name="target" size={16} />}
                  title="Przypisano do"
                  description={ticket.assignedTo}
                  date={ticket.updatedAt}
                />
              )}
              {ticket.status === 'resolved' && (
                <TimelineItem
                  icon={<Icon name="check" size={16} />}
                  title="Rozwiązane"
                  date={ticket.resolvedAt}
                />
              )}
            </div>
          </div>

          {}
          {attachments.length > 0 && (
            <div className="agent-sidebar-card">
              <h4 className="agent-sidebar-title">
                <Icon name="paperclip" size={18} /> Załączniki ({attachments.length})
              </h4>
              <div className="agent-attachments-list">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="agent-attachment-item">
                    <div className="agent-attachment-info">
                      <Icon name="file" size={16} />
                      <div className="agent-attachment-details">
                        <span className="agent-attachment-name">{attachment.filename}</span>
                        <span className="agent-attachment-size">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <div className="agent-attachment-actions">
                      <a
                        href={`/api/tickets/attachments/${attachment.id}/download`}
                        download
                        className="agent-attachment-download"
                        title="Pobierz"
                      >
                        <Icon name="download" size={14} />
                      </a>
                      <button
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        className="agent-attachment-delete"
                        title="Usuń"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {}
          <div className="agent-sidebar-card quick-actions-card">
            <h4 className="agent-sidebar-title"><Icon name="zap" size={18} /> Szybkie akcje</h4>
            <button className="agent-sidebar-action">
              <Icon name="mail" size={16} /> Wyślij email
            </button>
            <button className="agent-sidebar-action">
              <Icon name="arrow" size={16} /> Skopiuj link
            </button>
            <button className="agent-sidebar-action">
              <Icon name="list" size={16} /> Szablon odpowiedzi
            </button>
          </div>
        </aside>
      </div>

      {}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        email={ticket?.createdBy}
        ticketId={ticket?.id}
        onSuccess={() => {
          setUserExists(true)
          loadTicket()
        }}
      />
    </div>
  )
}

function CommentItem({ comment, isEditing, editingContent, onEdit, onSave, onEditContentChange, onCancelEdit }) {
  return (
    <div className={`agent-comment-item ${comment.isInternal ? 'internal' : ''}`}>
      <div className="agent-comment-avatar">
        {comment.author?.charAt(0) || '?'}
      </div>
      <div className="agent-comment-content">
        <div className="agent-comment-header">
          <div className="agent-comment-author-row">
            <span className="agent-comment-author">{comment.author || 'Użytkownik'}</span>
            {comment.isInternal && (
              <span className="agent-comment-internal-badge">
                <Icon name="lock" size={12} /> Wewnętrzny
              </span>
            )}
            {comment.isEdited && (
              <span className="agent-comment-edited-badge">
                (edytowany)
              </span>
            )}
          </div>
          <div className="agent-comment-actions">
            {!isEditing && (
              <button
                className="agent-comment-edit-btn"
                onClick={() => onEdit(comment.id, comment.content)}
                title="Edytuj komentarz"
              >
                <Icon name="edit" size={14} />
              </button>
            )}
            <span className="agent-comment-date">
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
          <div className="agent-comment-edit-form">
            <textarea
              value={editingContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="agent-comment-edit-textarea"
              rows="3"
            />
            <div className="agent-comment-edit-actions">
              <button
                className="agent-comment-save-btn"
                onClick={() => onSave(comment.id)}
              >
                <Icon name="check" size={14} /> Zapisz
              </button>
              <button
                className="agent-comment-cancel-btn"
                onClick={onCancelEdit}
              >
                <Icon name="x" size={14} /> Anuluj
              </button>
            </div>
          </div>
        ) : (
          <div className="agent-comment-text">{comment.content}</div>
        )}
      </div>
    </div>
  )
}

function TimelineItem({ icon, title, description, date, user }) {
  return (
    <div className="agent-timeline-item">
      <div className="agent-timeline-icon">{icon}</div>
      <div className="agent-timeline-content">
        <div className="agent-timeline-title">{title}</div>
        {description && <div className="agent-timeline-description">{description}</div>}
        {user && <div className="agent-timeline-user">{user}</div>}
        {date && (
          <div className="agent-timeline-date">
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

function getCategoryLabel(category) {
  const labels = {
    hardware: 'Sprzęt',
    software: 'Oprogramowanie',
    network: 'Sieć',
    account: 'Konto',
    other: 'Inne'
  }
  return labels[category] || category
}
