import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'
import '../styles/components/TicketTagManager.css'


export default function TicketTagManager({ ticketId, currentTags = [], onTagsUpdated }) {
  const [allTags, setAllTags] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      loadAllTags()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e) => {
        if (
          buttonRef.current && !buttonRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)
        ) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const token = () => localStorage.getItem('almadesk_token')
  const currentTagIds = currentTags.map(t => t.id)

  const loadAllTags = async () => {
    try {
      const res = await fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAllTags(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error loading tags:', err)
    }
  }

  const handleAssignTag = async (tagId) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tags/${ticketId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`
        },
        body: JSON.stringify({ tagId })
      })

      if (res.ok || res.status === 409) {
        onTagsUpdated?.()
      }
    } catch (err) {
      console.error('Error assigning tag:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTag = async (tagId) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tags/${ticketId}/remove/${tagId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` }
      })

      if (res.ok) {
        onTagsUpdated?.()
      }
    } catch (err) {
      console.error('Error removing tag:', err)
    } finally {
      setLoading(false)
    }
  }

  const availableTags = allTags.filter(t => !currentTagIds.includes(t.id))

  return (
    <div className="ticket-tag-manager">
      {}
      <div className="ticket-tag-list">
        {currentTags.length === 0 ? (
          <span className="ticket-tag-empty">Brak tagów</span>
        ) : (
          currentTags.map(tag => (
            <span
              key={tag.id}
              className="ticket-tag-badge"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                className="ticket-tag-remove"
                onClick={() => handleRemoveTag(tag.id)}
                disabled={loading}
                title={`Usuń tag ${tag.name}`}
              >
                <Icon name="x" size={10} />
              </button>
            </span>
          ))
        )}
      </div>

      {}
      <div className="ticket-tag-add-wrapper">
        <button
          ref={buttonRef}
          className="ticket-tag-add-btn"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
        >
          <Icon name="plus" size={14} />
          <span>Dodaj tag</span>
        </button>

        {isOpen && (
          <div ref={dropdownRef} className="ticket-tag-dropdown">
            <div className="ticket-tag-dropdown-header">Dostępne tagi</div>
            {availableTags.length === 0 ? (
              <div className="ticket-tag-dropdown-empty">
                {allTags.length === 0
                  ? 'Brak tagów w systemie'
                  : 'Wszystkie tagi przypisane'}
              </div>
            ) : (
              <div className="ticket-tag-dropdown-list">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    className="ticket-tag-dropdown-item"
                    onClick={() => { handleAssignTag(tag.id); setIsOpen(false) }}
                    disabled={loading}
                  >
                    <span
                      className="ticket-tag-dropdown-badge"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                    <span className="ticket-tag-dropdown-count">({tag.ticketCount})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
