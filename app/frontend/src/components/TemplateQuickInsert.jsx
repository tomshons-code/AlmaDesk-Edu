import React, { useState, useEffect } from 'react'
import templatesAPI from '../api/templates'
import Icon from './Icon'
import '../styles/components/TemplateQuickInsert.css'

export default function TemplateQuickInsert({ onInsert, category = null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchTemplates = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await templatesAPI.getAll(category)
        setTemplates(data)
      } catch (err) {
        console.error('Error loading templates:', err)
        setError('Nie udało się wczytać szablonów')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [isOpen, category])

  const handleSelectTemplate = (template) => {
    onInsert(template.content)
    setIsOpen(false)
  }

  return (
    <div className="template-quick-insert">
      <button
        type="button"
        className="template-insert-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Wstaw szablon odpowiedzi"
      >
        <Icon name="template" size={16} />
        <span>Szablony</span>
      </button>

      {isOpen && (
        <div className="template-dropdown">
          {loading && <div className="template-loading">Wczytywanie...</div>}
          {error && <div className="template-error">{error}</div>}
          {!loading && !error && templates.length === 0 && (
            <div className="template-empty">Brak dostępnych szablonów</div>
          )}
          {!loading && !error && templates.length > 0 && (
            <ul className="template-list">
              {templates.map(template => (
                <li key={template.id} className="template-item">
                  <button
                    type="button"
                    className="template-item-btn"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <span className="template-item-title">{template.title}</span>
                    {(template.category || !template.isPublic) && (
                      <div className="template-item-badges">
                        {template.category && (
                          <span className="template-item-category">{template.category}</span>
                        )}
                        {!template.isPublic && (
                          <span className="template-item-private">Prywatny</span>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
