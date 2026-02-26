
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import '../styles/components/Toast.css'

const ToastContext = createContext(null)

let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const confirmResolveRef = useRef(null)

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter
    const toast = { id, message, type, removing: false }
    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
  }, [])

  const toast = useCallback(Object.assign(
    (message, type, duration) => addToast(message, type, duration),
    {
      success: (msg, dur) => addToast(msg, 'success', dur),
      error: (msg, dur) => addToast(msg, 'error', dur ?? 6000),
      warning: (msg, dur) => addToast(msg, 'warning', dur),
      info: (msg, dur) => addToast(msg, 'info', dur),
    }
  ), [addToast])

  const confirm = useCallback((message, title = 'Potwierdzenie') => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmState({ message, title })
    })
  }, [])

  const handleConfirmResponse = useCallback((result) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result)
      confirmResolveRef.current = null
    }
    setConfirmState(null)
  }, [])

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type}${t.removing ? ' toast-removing' : ''}`}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-icon">{getIcon(t.type)}</span>
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" aria-label="Zamknij">&times;</button>
          </div>
        ))}
      </div>

      {}
      {confirmState && (
        <div className="confirm-overlay" onClick={() => handleConfirmResponse(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">{confirmState.title}</h3>
            <p className="confirm-message">{confirmState.message}</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-btn-cancel"
                onClick={() => handleConfirmResponse(false)}
              >
                Anuluj
              </button>
              <button
                className="confirm-btn confirm-btn-ok"
                onClick={() => handleConfirmResponse(true)}
                autoFocus
              >
                Potwierdź
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

function getIcon(type) {
  switch (type) {
    case 'success': return '\u2713'
    case 'error': return '\u2717'
    case 'warning': return '\u26A0'
    case 'info': return '\u2139'
    default: return '\u2139'
  }
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
