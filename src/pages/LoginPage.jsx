import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Btn, Input, Alert } from '../components/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(user.rol === 'admin' ? '/admin' : '/portal')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--gray-50)',
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: '#fff', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--gray-100)', padding: '2rem',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'var(--brand-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: '22px',
          }}>
            🐣
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>Pakarina Center</h1>
          <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '4px' }}>
            Ingresa a tu cuenta
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && <Alert type="error">{error}</Alert>}

          <Btn type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
            Ingresar
          </Btn>
        </form>

        <p style={{ fontSize: '11px', color: 'var(--gray-400)', textAlign: 'center', marginTop: '1.5rem' }}>
          Papás: usa tu email y número de WhatsApp como contraseña
        </p>
      </div>
    </div>
  )
}
