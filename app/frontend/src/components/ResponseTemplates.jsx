import React, { useState, useEffect } from 'react'
import templatesAPI from '../api/templates'
import Icon from './Icon'
import '../styles/components/ResponseTemplates.css'

export default function ResponseTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: null,
    isPublic: true
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await templatesAPI.getAll()
      setTemplates(data)
    } catch (err) {
      console.error('Error loading templates:', err)
      setError('Nie udało się wczytać szablonów')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: null,
      isPublic: true
    })
    setEditingId(null)
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      setError('Tytuł i treść są wymagane')
      return
    }

    try {
      setError(null)
      if (editingId) {
        const updated = await templatesAPI.update(editingId, formData)
        setTemplates(templates.map(t => t.id === editingId ? updated : t))
      } else {
        const created = await templatesAPI.create(formData)
        setTemplates([created, ...templates])
      }
      resetForm()
    } catch (err) {
      console.error('Error saving template:', err)
      setError('Błąd przy zapisywaniu szablonu')
    }
  }

  const handleEdit = (template) => {
    setFormData({
      title: template.title,
      content: template.content,
      category: template.category || null,
      isPublic: template.isPublic
    })
    setEditingId(template.id)
    setIsCreating(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć ten szablon?')) return

    try {
      await templatesAPI.delete(id)
      setTemplates(templates.filter(t => t.id !== id))
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Błąd przy usuwaniu szablonu')
    }
  }

  const categories = [
    'HARDWARE',
    'SOFTWARE',
    'NETWORK',
    'ACCOUNT',
    'EMAIL',
    'PRINTER',
    'ACCESS',
    'INFRASTRUCTURE',
    'OTHER'
  ]

  return (
    <div className="response-templates">
      <div className="templates-header">
        <h3>Szablony odpowiedzi</h3>
        {!isCreating && (
          <button
            className="btn-create-template"
            onClick={() => setIsCreating(true)}
          >
            <Icon name="plus" size={16} /> Nowy szablon
          </button>
        )}
      </div>

      {error && <div className="templates-error">{error}</div>}

      {isCreating && (
        <div className="template-form">
          <h4>{editingId ? 'Edytuj szablon' : 'Nowy szablon'}</h4>

          <div className="form-group">
            <label>Tytuł szablonu *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="np. Akceptacja zgłoszenia"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Kategoria (opcjonalnie - do filtrowania w szablonach)</label>
            <select
              value={formData.category || ''}
              onChange={(e) => {
                const val = e.target.value
                setFormData({ ...formData, category: val ? val.toUpperCase() : null })
              }}
              className="form-select"
            >
              <option value="">--Uniwersalny (widoczny w każdej kategorii)--</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Treść szablonu *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Wpisz treść szablonu..."
              className="form-textarea"
              rows="6"
            />
          </div>

          <div className="form-checkbox">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
            />
            <label htmlFor="isPublic">Udostępnij wszystkim agentom</label>
          </div>

          <div className="form-actions">
            <button
              className="btn-save"
              onClick={handleSave}
            >
              <Icon name="check" size={14} /> Zapisz
            </button>
            <button
              className="btn-cancel"
              onClick={resetForm}
            >
              <Icon name="x" size={14} /> Anuluj
            </button>
          </div>
        </div>
      )}

      {loading && <div className="templates-loading">Wczytywanie szablonów...</div>}

      {!loading && templates.length === 0 && !isCreating && (
        <div className="templates-empty">Brak szablonów. Utwórz pierwszy!</div>
      )}

      {!loading && templates.length > 0 && (
        <div className="templates-list">
          {templates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-card-header">
                <h4>{template.title}</h4>
                <div className="template-card-badges">
                  {template.category && (
                    <span className="badge-category">{template.category}</span>
                  )}
                  {!template.isPublic && (
                    <span className="badge-private">Prywatny</span>
                  )}
                </div>
              </div>

              <div className="template-card-content">
                {template.content}
              </div>

              <div className="template-card-footer">
                <span className="template-author">
                  Autor: {template.createdBy?.name || 'Nieznany'}
                </span>
                <div className="template-card-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(template)}
                    title="Edytuj"
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(template.id)}
                    title="Usuń"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
