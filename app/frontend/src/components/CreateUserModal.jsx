import { useState } from 'react'
import Icon from './Icon'
import '../styles/components/CreateUserModal.css'

export default function CreateUserModal({ isOpen, onClose, email, ticketId, onSuccess }) {
  const [formData, setFormData] = useState({
    email: email || '',
    firstName: '',
    lastName: '',
    department: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('almadesk_token')
      const res = await fetch('/api/users/quick-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          department: formData.department,
          ticketId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      if (onSuccess) {
        onSuccess(data.user)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      email: email || '',
      firstName: '',
      lastName: '',
      department: ''
    })
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Icon name="user-plus" size={24} />
            Utwórz nowego użytkownika
          </h2>
          <button className="modal-close" onClick={handleClose} type="button">
            <Icon name="close" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled
              className="form-input"
              placeholder="email@example.com"
            />
            <small className="form-help">Email z zgłoszenia (nie można zmienić)</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">
                Imię <span className="required">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="form-input"
                placeholder="Jan"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">
                Nazwisko <span className="required">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="form-input"
                placeholder="Kowalski"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="department">Dział</label>
            <input
              id="department"
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="form-input"
              placeholder="Np. IT, HR, Sprzedaż... (opcjonalnie)"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="form-error">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-info">
            <Icon name="info" size={16} />
            <span>Użytkownik zostanie utworzony z rolą <strong>KLIENT</strong> i automatycznie przypisany do tego zgłoszenia.</span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Icon name="loader" size={16} />
                  Tworzenie...
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  Utwórz użytkownika
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
