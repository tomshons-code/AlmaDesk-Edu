import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const { completeSSOLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    completeSSOLogin(token).then(() => {
      navigate('/', { replace: true })
    })
  }, [searchParams, completeSSOLogin, navigate])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Trwa logowanie...</h2>
      <p>Za chwilę nastąpi przekierowanie.</p>
    </div>
  )
}
