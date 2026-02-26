import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import '../../styles/components/ChangeRequests.css'

export default function ChangeRequestForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    justification: '',
    impactAnalysis: '',
    riskAssessment: '',
    rollbackPlan: '',
    priority: 'MEDIUM',
    category: 'NORMAL',
    estimatedDuration: ''
  })

  useEffect(() => {
    if (id) {
      loadChangeRequest()
    }
  }, [id])

  const loadChangeRequest = async () => {
    try {
      const res = await fetch(`/api/change-requests/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        }
      })

      if (!res.ok) {
        throw new Error('Nie można załadować wniosku')
      }

      const data = await res.json()

      if (data.status !== 'DRAFT' || data.requestedById !== user?.id) {
        setError('Nie możesz edytować tego wniosku')
        setTimeout(() => navigate('/dashboard/change-requests'), 2000)
        return
      }

      setFormData({
        title: data.title || '',
        description: data.description || '',
        justification: data.justification || '',
        impactAnalysis: data.impactAnalysis || '',
        riskAssessment: data.riskAssessment || '',
        rollbackPlan: data.rollbackPlan || '',
        priority: data.priority || 'MEDIUM',
        category: data.category || 'NORMAL',
        estimatedDuration: data.estimatedDuration || ''
      })
    } catch (error) {
      console.error('Error loading change request:', error)
      setError('Błąd ładowania wniosku: ' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Tytuł jest wymagany')
      return false
    }
    if (!formData.description.trim()) {
      setError('Opis jest wymagany')
      return false
    }
    if (!formData.justification.trim()) {
      setError('Uzasadnienie jest wymagane')
      return false
    }
    return true
  }

  const handleSaveDraft = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const url = id
        ? `/api/change-requests/${id}`
        : '/api/change-requests'

      const method = id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Błąd zapisywania szkicu')
      }

      const data = await res.json()
      setSuccess('Szkic zapisany pomyślnie!')

      setTimeout(() => {
        navigate(`/dashboard/change-requests/${data.id}`)
      }, 1500)
    } catch (error) {
      console.error('Error saving draft:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const saveUrl = id
        ? `/api/change-requests/${id}`
        : '/api/change-requests'

      const saveMethod = id ? 'PUT' : 'POST'

      const saveRes = await fetch(saveUrl, {
        method: saveMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify(formData)
      })

      if (!saveRes.ok) {
        const errorData = await saveRes.json()
        throw new Error(errorData.error || 'Błąd zapisywania wniosku')
      }

      const savedData = await saveRes.json()
      const changeId = savedData.id

      const submitRes = await fetch(`/api/change-requests/${changeId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify({
          newStatus: 'SUBMITTED',
          comment: 'Wniosek o zmianę został złożony'
        })
      })

      if (!submitRes.ok) {
        const errorData = await submitRes.json()
        throw new Error(errorData.error || 'Błąd wysyłania wniosku')
      }

      setSuccess('Wniosek został zgłoszony pomyślnie!')

      setTimeout(() => {
        navigate(`/dashboard/change-requests/${changeId}`)
      }, 1500)
    } catch (error) {
      console.error('Error submitting change request:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="change-request-form-page">
      <div className="page-header">
        <button
          className="btn-back"
          onClick={() => navigate('/dashboard/change-requests')}
        >
          <Icon name="arrow-left" size={18} />
          Powrót
        </button>
        <div className="page-title">
          <Icon name="git-branch" size={28} />
          <h1>{id ? 'Edytuj wniosek o zmianę' : 'Nowy wniosek o zmianę'}</h1>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <Icon name="alert-circle" size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <Icon name="check-circle" size={20} />
          {success}
        </div>
      )}

      <div className="form-container">
        <div className="form-section">
          <h2>Podstawowe informacje</h2>

          <div className="form-group">
            <label htmlFor="title">
              Tytuł zmiany <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Krótki, opisowy tytuł zmiany"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Szczegółowy opis <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Dokładny opis planowanej zmiany, jej zakres i cele"
              rows={5}
              required
            />
            <small>Co dokładnie ma zostać zmienione?</small>
          </div>

          <div className="form-group">
            <label htmlFor="justification">
              Uzasadnienie biznesowe <span className="required">*</span>
            </label>
            <textarea
              id="justification"
              name="justification"
              value={formData.justification}
              onChange={handleChange}
              placeholder="Dlaczego ta zmiana jest potrzebna? Jakie problemy rozwiązuje?"
              rows={4}
              required
            />
            <small>Uzasadnienie dla kierownictwa i interesariuszy</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priorytet</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="PLANNING">Planowanie</option>
                <option value="LOW">Niski</option>
                <option value="MEDIUM">Średni</option>
                <option value="HIGH">Wysoki</option>
                <option value="CRITICAL">Krytyczny</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">Kategoria</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="STANDARD">Standardowa</option>
                <option value="NORMAL">Normalna</option>
                <option value="MAJOR">Główna</option>
                <option value="EMERGENCY">Awaryjna</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="estimatedDuration">Szacowany czas (minuty)</label>
              <input
                type="number"
                id="estimatedDuration"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleChange}
                placeholder="60"
                min="1"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Analiza wpływu i ryzyka</h2>

          <div className="form-group">
            <label htmlFor="impactAnalysis">
              Analiza wpływu
            </label>
            <textarea
              id="impactAnalysis"
              name="impactAnalysis"
              value={formData.impactAnalysis}
              onChange={handleChange}
              placeholder="Na jakie systemy, procesy i użytkowników wpłynie ta zmiana?"
              rows={4}
            />
            <small>Opisz potencjalny wpływ na organizację</small>
          </div>

          <div className="form-group">
            <label htmlFor="riskAssessment">
              Ocena ryzyka
            </label>
            <textarea
              id="riskAssessment"
              name="riskAssessment"
              value={formData.riskAssessment}
              onChange={handleChange}
              placeholder="Jakie są potencjalne zagrożenia związane z tą zmianą?"
              rows={4}
            />
            <small>Zidentyfikuj możliwe problemy i ich skutki</small>
          </div>

          <div className="form-group">
            <label htmlFor="rollbackPlan">
              Plan wycofania (rollback)
            </label>
            <textarea
              id="rollbackPlan"
              name="rollbackPlan"
              value={formData.rollbackPlan}
              onChange={handleChange}
              placeholder="Jak cofnąć zmiany w przypadku problemów?"
              rows={4}
            />
            <small>Krok po kroku, jak przywrócić poprzedni stan</small>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard/change-requests')}
            disabled={loading}
          >
            <Icon name="x" size={18} />
            Anuluj
          </button>

          <div className="form-actions-right">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              <Icon name="save" size={18} />
              {loading ? 'Zapisywanie...' : 'Zapisz szkic'}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              <Icon name="send" size={18} />
              {loading ? 'Wysyłanie...' : 'Zgłoś wniosek'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
