import { useState, useEffect } from 'react'
import {
  getCategoryMappings,
  getCategories,
  getOrganizationalUnits,
  createCategoryMapping,
  updateCategoryMapping,
  deleteCategoryMapping
} from '../api/category-mappings'
import '../styles/components/CategoryMappings.css'

export default function CategoryMappings() {
  const [mappings, setMappings] = useState([])
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    category: '',
    organizationalUnitId: '',
    description: '',
    isActive: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [mappingsData, categoriesData, unitsData] = await Promise.all([
        getCategoryMappings(),
        getCategories(),
        getOrganizationalUnits()
      ])
      setMappings(mappingsData)
      setCategories(categoriesData)
      setUnits(unitsData)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category || !formData.organizationalUnitId) {
      setError('Kategoria i jednostka organizacyjna są wymagane')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      await createCategoryMapping(formData)

      setSuccess('Mapowanie zostało utworzone pomyślnie')
      setFormData({
        category: '',
        organizationalUnitId: '',
        description: '',
        isActive: true
      })
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (mapping) => {
    try {
      await updateCategoryMapping(mapping.id, {
        isActive: !mapping.isActive
      })
      setSuccess('Status mapowania został zmieniony')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć to mapowanie?')) {
      return
    }

    try {
      await deleteCategoryMapping(id)
      setSuccess('Mapowanie zostało usunięte')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const getCategoryLabel = (categoryValue) => {
    const cat = categories.find(c => c.value === categoryValue)
    return cat ? cat.label : categoryValue
  }

  if (loading) {
    return (
      <div className="category-mappings-container">
        <div className="loading-state">Ładowanie mapowań kategorii...</div>
      </div>
    )
  }

  return (
    <div className="category-mappings-container">
      <div className="category-mappings-header">
        <div>
          <h2>Mapowanie Kategorii na Jednostki</h2>
          <p className="category-mappings-description">
            Przypisz kategorie zgłoszeń do jednostek organizacyjnych.
            Agenci będą widzieć tylko zgłoszenia z kategorii przypisanych do ich jednostki.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Anuluj' : '+ Dodaj mapowanie'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}

      {showForm && (
        <div className="mapping-form-card">
          <h3>Nowe mapowanie kategorii</h3>
          <form onSubmit={handleSubmit} className="mapping-form">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="category">Kategoria zgłoszenia *</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">-- Wybierz kategorię --</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="unit">Jednostka organizacyjna *</label>
                <select
                  id="unit"
                  value={formData.organizationalUnitId}
                  onChange={(e) => setFormData({ ...formData, organizationalUnitId: e.target.value })}
                  required
                >
                  <option value="">-- Wybierz jednostkę --</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} {unit.code ? `(${unit.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="description">Opis (opcjonalny)</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Dodatkowy opis mapowania..."
              />
            </div>

            <div className="form-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>Aktywne mapowanie</span>
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false)
                  setFormData({
                    category: '',
                    organizationalUnitId: '',
                    description: '',
                    isActive: true
                  })
                }}
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Zapisywanie...' : 'Dodaj mapowanie'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mappings-table-container">
        {mappings.length === 0 ? (
          <div className="empty-state">
            <p>Brak mapowań kategorii.</p>
            <p>Dodaj pierwsze mapowanie, aby ograniczyć widoczność zgłoszeń dla agentów.</p>
          </div>
        ) : (
          <table className="mappings-table">
            <thead>
              <tr>
                <th>Kategoria</th>
                <th>Jednostka organizacyjna</th>
                <th>Opis</th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map(mapping => (
                <tr key={mapping.id} className={!mapping.isActive ? 'inactive' : ''}>
                  <td>
                    <span className="category-badge">
                      {getCategoryLabel(mapping.category)}
                    </span>
                  </td>
                  <td>
                    <div className="unit-info">
                      <div className="unit-name">{mapping.organizationalUnit.name}</div>
                      {mapping.organizationalUnit.code && (
                        <div className="unit-code">{mapping.organizationalUnit.code}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="description-text">
                      {mapping.description || '—'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`status-toggle ${mapping.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(mapping)}
                      title={mapping.isActive ? 'Kliknij aby dezaktywować' : 'Kliknij aby aktywować'}
                    >
                      {mapping.isActive ? '✓ Aktywne' : '✕ Nieaktywne'}
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(mapping.id)}
                        title="Usuń mapowanie"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="info-box">
        <h4>ℹ️ Jak działa mapowanie kategorii?</h4>
        <ul>
          <li><strong>Super Admin</strong> - widzi wszystkie zgłoszenia niezależnie od mapowań</li>
          <li><strong>Agent z przypisaną jednostką + mapowania istnieją</strong> - widzi tylko zgłoszenia z kategorii przypisanych do swojej jednostki</li>
          <li><strong>Agent bez mapowań dla swojej jednostki</strong> - widzi wszystkie zgłoszenia (domyślne zachowanie)</li>
          <li><strong>Użytkownik (USER)</strong> - widzi tylko swoje zgłoszenia</li>
        </ul>
      </div>
    </div>
  )
}
