import { useState } from 'react'
import Icon from './Icon'
import '../styles/components/RegisterTicketModal.css'

const SOURCE_OPTIONS = [
  { value: 'PHONE',   label: 'Telefon',      icon: 'phone'   },
  { value: 'CHAT',    label: 'Czat',         icon: 'chat'    },
  { value: 'WALK_IN', label: 'Osobiście',    icon: 'walk-in' },
  { value: 'EMAIL',   label: 'E-mail',       icon: 'mail'    },
  { value: 'TEAMS',   label: 'Teams',        icon: 'teams'   },
]

const CATEGORY_OPTIONS = [
  { value: 'hardware',       label: 'Sprzęt' },
  { value: 'software',       label: 'Oprogramowanie' },
  { value: 'network',        label: 'Sieć' },
  { value: 'account',        label: 'Konto / Dostępy' },
  { value: 'email',          label: 'Poczta e-mail' },
  { value: 'printer',        label: 'Drukarka' },
  { value: 'infrastructure', label: 'Infrastruktura' },
  { value: 'other',          label: 'Inne' },
]

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Niski' },
  { value: 'medium',   label: 'Średni' },
  { value: 'high',     label: 'Wysoki' },
  { value: 'critical', label: 'Krytyczny' },
]

export default function RegisterTicketModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    clientLogin: '',
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    source: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSourceSelect = (value) => {
    setFormData(prev => ({ ...prev, source: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.source) {
      setError('Wybierz kanał zgłoszenia.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/tickets/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('almadesk_token')}`
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(data)
        onCreated?.(data)
      } else {
        setError(data.error || 'Nie udało się zarejestrować zgłoszenia.')
      }
    } catch {
      setError('Błąd połączenia z serwerem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rmodal-overlay" onClick={onClose}>
      <div className="rmodal-box" onClick={e => e.stopPropagation()}>
        <div className="rmodal-header">
          <h2><Icon name="phone" size={22} /> Rejestracja zgłoszenia</h2>
          <button className="rmodal-close" onClick={onClose}><Icon name="x" size={20} /></button>
        </div>

        {success ? (
          <div className="rmodal-success">
            <Icon name="check" size={40} color="var(--color-success)" />
            <h3>Zgłoszenie #{success.id} zarejestrowane!</h3>
            <p><strong>{success.title}</strong></p>
            <p className="rmodal-success-meta">
              Klient: <strong>{success.createdBy}</strong> &nbsp;|&nbsp;
              Kanał: <strong>{SOURCE_OPTIONS.find(s => s.value === formData.source)?.label}</strong>
            </p>
            <div className="rmodal-success-actions">
              <button className="rmodal-btn-primary" onClick={onClose}>Zamknij</button>
            </div>
          </div>
        ) : (
          <form className="rmodal-form" onSubmit={handleSubmit}>
            {}
            <div className="rmodal-field">
              <label className="rmodal-label">Kanał zgłoszenia *</label>
              <div className="rmodal-source-grid">
                {SOURCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rmodal-source-btn ${formData.source === opt.value ? 'active' : ''}`}
                    onClick={() => handleSourceSelect(opt.value)}
                  >
                    <Icon name={opt.icon} size={22} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className="rmodal-field">
              <label className="rmodal-label">Login klienta *</label>
              <input
                className="rmodal-input"
                type="text"
                name="clientLogin"
                value={formData.clientLogin}
                onChange={handleChange}
                placeholder="np. jan.kowalski"
                required
              />
              <small className="rmodal-hint">Login użytkownika w systemie, w imieniu którego rejestrujesz zgłoszenie</small>
            </div>

            {}
            <div className="rmodal-field">
              <label className="rmodal-label">Tytuł zgłoszenia *</label>
              <input
                className="rmodal-input"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Krótki opis problemu"
                required
              />
            </div>

            {}
            <div className="rmodal-field">
              <label className="rmodal-label">Opis *</label>
              <textarea
                className="rmodal-textarea"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Szczegółowy opis problemu zgłoszonego przez klienta..."
                rows={5}
                required
              />
            </div>

            {}
            <div className="rmodal-row">
              <div className="rmodal-field">
                <label className="rmodal-label">Kategoria</label>
                <select className="rmodal-select" name="category" value={formData.category} onChange={handleChange}>
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="rmodal-field">
                <label className="rmodal-label">Priorytet</label>
                <select className="rmodal-select" name="priority" value={formData.priority} onChange={handleChange}>
                  {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {error && <div className="rmodal-error"><Icon name="alert" size={16} /> {error}</div>}

            <div className="rmodal-actions">
              <button type="button" className="rmodal-btn-secondary" onClick={onClose} disabled={loading}>
                Anuluj
              </button>
              <button type="submit" className="rmodal-btn-primary" disabled={loading}>
                {loading ? <><Icon name="loader" size={16} /> Rejestrowanie...</> : <><Icon name="check" size={16} /> Zarejestruj</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
