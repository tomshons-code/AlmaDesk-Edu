import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { getPriorityIcon } from '../../components/Icon'
import '../../styles/components/CreateTicket.css'

export default function CreateTicket() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    location: '',
    department: '',
    laboratory: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        const data = await res.json()
        navigate(`/portal/ticket/${data.id}`)
      } else {
        setError('Nie udało się utworzyć zgłoszenia. Spróbuj ponownie.')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      setError('Błąd połączenia z serwerem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-ticket-page">
      <div className="create-ticket-header">
        <button
          className="create-ticket-back"
          onClick={() => navigate('/portal')}
        >
          ← Powrót
        </button>
        <h1>Nowe zgłoszenie</h1>
        <p>Opisz swój problem, a nasz zespół IT zajmie się nim tak szybko, jak to możliwe.</p>
      </div>

      <div className="create-ticket-content card">
        <form onSubmit={handleSubmit} className="create-ticket-form">
          {}
          <div className="form-field">
            <label className="form-label">
              <Icon name="folder" size={16} /> Kategoria problemu
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="hardware"><Icon name="monitor" size={14} /> Sprzęt (komputer, drukarka, monitor)</option>
              <option value="software"><Icon name="disc" size={14} /> Oprogramowanie</option>
              <option value="network"><Icon name="globe" size={14} /> Internet / Sieć</option>
              <option value="email"><Icon name="mail" size={14} /> Poczta e-mail</option>
              <option value="account"><Icon name="user" size={14} /> Konto / Dostępy</option>
              <option value="other"><Icon name="wrench" size={14} /> Inne</option>
            </select>
          </div>

          {}
          <div className="form-field">
            <label className="form-label">
              <Icon name="portal" size={16} /> Lokalizacja <small>(opcjonalnie)</small>
            </label>
            <div className="form-row-triple">
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="np. Budynek A, piętro 2"
                className="form-input"
              />
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="np. Wydział Informatyki"
                className="form-input"
              />
              <input
                type="text"
                name="laboratory"
                value={formData.laboratory}
                onChange={handleChange}
                placeholder="np. Lab. 201"
                className="form-input"
              />
            </div>
            <small className="form-hint">Podaj lokalizację, wydział lub laboratorium, aby ułatwić identyfikację problemu</small>
          </div>

          {}
          <div className="form-field">
            <label className="form-label">
              <Icon name="edit" size={16} /> Tytuł zgłoszenia
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="np. Brak dostępu do Wi-Fi w budynku A"
              className="form-input"
              required
            />
            <small className="form-hint">Krótki opis problemu (max 100 znaków)</small>
          </div>

          {}
          <div className="form-field">
            <label className="form-label">
              <Icon name="message" size={16} /> Szczegółowy opis
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Opisz szczegółowo problem, co się dzieje, kiedy wystąpił, jakie kroki już podjąłeś..."
              className="form-textarea"
              rows="8"
              required
            />
            <small className="form-hint">
              <Icon name="info" size={14} /> Wskazówka: Im więcej szczegółów podasz, tym szybciej będziemy mogli pomóc!
            </small>
          </div>

          {}
          <div className="form-field">
            <label className="form-label">
              <Icon name="zap" size={16} /> Priorytet
            </label>
            <div className="priority-options">
              <label className={`priority-option ${formData.priority === 'low' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="low"
                  checked={formData.priority === 'low'}
                  onChange={handleChange}
                />
                <div className="priority-content">
                  <span className="priority-icon">{getPriorityIcon('low')}</span>
                  <div>
                    <div className="priority-name">Niski</div>
                    <div className="priority-desc">Może poczekać</div>
                  </div>
                </div>
              </label>

              <label className={`priority-option ${formData.priority === 'medium' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="medium"
                  checked={formData.priority === 'medium'}
                  onChange={handleChange}
                />
                <div className="priority-content">
                  <span className="priority-icon">{getPriorityIcon('medium')}</span>
                  <div>
                    <div className="priority-name">Średni</div>
                    <div className="priority-desc">W miarę pilne</div>
                  </div>
                </div>
              </label>

              <label className={`priority-option ${formData.priority === 'high' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="high"
                  checked={formData.priority === 'high'}
                  onChange={handleChange}
                />
                <div className="priority-content">
                  <span className="priority-icon">{getPriorityIcon('high')}</span>
                  <div>
                    <div className="priority-name">Wysoki</div>
                    <div className="priority-desc">Pilne, blokuje pracę</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}

          {}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/portal')}
              disabled={loading}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Tworzenie...' : <><Icon name="plus" size={16} /> Utwórz zgłoszenie</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
