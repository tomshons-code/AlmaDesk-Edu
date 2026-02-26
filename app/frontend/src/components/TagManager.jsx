import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Icon from './Icon'
import '../styles/components/TagManager.css'


export default function TagManager() {
  const { user } = useAuth()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6B7280')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const inputRef = useRef(null)

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canCreate = user?.role === 'AGENT' || user?.role === 'ADMIN' || isSuperAdmin

  const presetColors = [
    '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'
  ]

  useEffect(() => {
    loadTags()
  }, [])

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 3000)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  const token = () => localStorage.getItem('almadesk_token')

  const loadTags = async () => {
    try {
      const res = await fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTags(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error loading tags:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`
        },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor })
      })

      if (res.status === 409) {
        setError('Tag o takiej nazwie już istnieje')
        return
      }
      if (!res.ok) {
        setError('Nie udało się utworzyć tagu')
        return
      }

      setNewTagName('')
      setNewTagColor('#6B7280')
      setSuccessMsg('Tag utworzony pomyślnie')
      loadTags()
      inputRef.current?.focus()
    } catch (err) {
      setError('Błąd połączenia z serwerem')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (tagId, tagName) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć tag "${tagName}"? Zostanie odpięty od wszystkich zgłoszeń.`)) {
      return
    }

    try {
      const res = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` }
      })

      if (res.ok) {
        setSuccessMsg(`Tag "${tagName}" usunięty`)
        loadTags()
      } else {
        const data = await res.json()
        setError(data.error || 'Nie udało się usunąć tagu')
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem')
    }
  }

  if (loading) {
    return (
      <div className="tag-manager">
        <div className="tag-manager-loading">Ładowanie tagów...</div>
      </div>
    )
  }

  return (
    <div className="tag-manager">
      {}
      {canCreate && (
        <form className="tag-manager-form" onSubmit={handleCreate}>
          <div className="tag-manager-form-row">
            <input
              ref={inputRef}
              type="text"
              value={newTagName}
              onChange={(e) => { setNewTagName(e.target.value); setError('') }}
              placeholder="Nazwa nowego tagu..."
              className="tag-manager-input"
              maxLength={50}
              disabled={creating}
            />
            <div className="tag-manager-color-picker">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="tag-manager-color-input"
                title="Kolor tagu"
              />
            </div>
            <button
              type="submit"
              className="tag-manager-create-btn"
              disabled={creating || !newTagName.trim()}
            >
              <Icon name="plus" size={16} />
              {creating ? 'Tworzenie...' : 'Dodaj tag'}
            </button>
          </div>

          {}
          <div className="tag-manager-presets">
            <span className="tag-manager-presets-label">Szybki wybór koloru:</span>
            <div className="tag-manager-presets-row">
              {presetColors.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`tag-manager-preset-dot ${newTagColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewTagColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {}
          {newTagName.trim() && (
            <div className="tag-manager-preview">
              <span className="tag-manager-preview-label">Podgląd:</span>
              <span
                className="tag-manager-preview-badge"
                style={{ backgroundColor: newTagColor }}
              >
                {newTagName.trim()}
              </span>
            </div>
          )}
        </form>
      )}

      {}
      {error && (
        <div className="tag-manager-message error">
          <Icon name="x" size={16} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="tag-manager-message success">
          <Icon name="check" size={16} /> {successMsg}
        </div>
      )}

      {}
      <div className="tag-manager-list">
        <div className="tag-manager-list-header">
          <span>Wszystkie tagi ({tags.length})</span>
        </div>

        {tags.length === 0 ? (
          <div className="tag-manager-empty">
            <Icon name="tag" size={32} />
            <p>Brak tagów w systemie</p>
            <p className="tag-manager-empty-hint">Utwórz pierwszy tag powyżej</p>
          </div>
        ) : (
          <div className="tag-manager-grid">
            {tags.map(tag => (
              <div key={tag.id} className="tag-manager-item">
                <span
                  className="tag-manager-item-badge"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
                <span className="tag-manager-item-count">
                  {tag.ticketCount} {tag.ticketCount === 1 ? 'zgłoszenie' : 'zgłoszeń'}
                </span>
                {isSuperAdmin && (
                  <button
                    className="tag-manager-item-delete"
                    onClick={() => handleDelete(tag.id, tag.name)}
                    title="Usuń tag"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
