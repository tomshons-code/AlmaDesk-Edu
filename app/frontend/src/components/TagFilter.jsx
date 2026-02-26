import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'
import '../styles/components/TagFilter.css'

export default function TagFilter({ selectedTags = [], onTagsChange }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    loadTags()
  }, [])

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

      const handleScroll = () => setIsOpen(false)
      const handleResize = () => setIsOpen(false)

      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isOpen])

  const loadTags = async () => {
    try {
      const res = await fetch('/api/tags', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })
      if (!res.ok) {
        setLoadError(true)
        setTags([])
        return
      }

      const data = await res.json()
      setLoadError(false)
      setTags(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading tags:', error)
      setLoadError(true)
      setTags([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTag = (tagId) => {
    const newSelected = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId]
    onTagsChange(newSelected)
  }

  const handleClearAll = () => {
    onTagsChange([])
    setIsOpen(false)
  }

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  if (loading) {
    return null
  }

  if (loadError) {
    return (
      <div className="tag-filter-fallback">
        <Icon name="info" size={16} />
        <span>Filtr tagów chwilowo niedostępny</span>
      </div>
    )
  }

  if (tags.length === 0) {
    return null
  }

  const selectedTagsData = tags.filter(tag => selectedTags.includes(tag.id))

  return (
    <div className="tag-filter">
      <button
        ref={buttonRef}
        className="tag-filter-toggle"
        onClick={handleToggleDropdown}
        aria-expanded={isOpen}
      >
        <Icon name="tag" />
        <span>Tagi</span>
        {selectedTags.length > 0 && (
          <span className="tag-filter-count">{selectedTags.length}</span>
        )}
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="tag-filter-dropdown"
        >
          <div className="tag-filter-header">
            <span className="tag-filter-title">Filtruj po tagach</span>
            {selectedTags.length > 0 && (
              <button
                className="tag-filter-clear"
                onClick={handleClearAll}
              >
                Wyczyść
              </button>
            )}
          </div>

          <div className="tag-filter-list">
            {tags.map(tag => (
              <label key={tag.id} className="tag-filter-item">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.id)}
                  onChange={() => handleToggleTag(tag.id)}
                />
                <span
                  className="tag-filter-badge"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
                <span className="tag-filter-ticket-count">({tag.ticketCount})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {selectedTagsData.length > 0 && (
        <div className="tag-filter-selected">
          {selectedTagsData.map(tag => (
            <span
              key={tag.id}
              className="tag-filter-selected-badge"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                className="tag-filter-selected-remove"
                onClick={() => handleToggleTag(tag.id)}
                aria-label={`Usuń tag ${tag.name}`}
              >
                <Icon name="close" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
