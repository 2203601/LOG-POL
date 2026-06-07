import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const RUTAS = {
  'Encargado de logística': '/pedidos',
  'Recursos Humanos': '/rrhh',
  'Chofer': '/seguimiento',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Completá todos los campos para continuar.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.mensaje || 'Credenciales incorrectas.')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      if (data.requiere_cambio_contrasena) {
        navigate('/cambiar-password')
      } else {
        navigate(RUTAS[data.usuario.tipo_usuario] || '/pedidos')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      {/* LEFT */}
      <div className="left">
        <div className="brand">
          <div className="brand-icon">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="2" y="13" width="20" height="9" rx="3" fill="white" />
              <circle cx="7" cy="22" r="3" fill="white" />
              <circle cx="19" cy="22" r="3" fill="white" />
              <rect x="2" y="5" width="12" height="9" rx="2" fill="rgba(255,255,255,.8)" />
            </svg>
            <div className="online-dot" />
          </div>
          <div>
            <div className="brand-name">Log-Pol</div>
            <div className="brand-sub">by POLHER S.A.</div>
          </div>
        </div>

        <div className="form-wrap">
          <div className="form-title">Acceso al sistema</div>
          <div className="form-sub">Ingresá con tu cuenta corporativa de POLHER</div>

          {error && (
            <div className="err-box">{error}</div>
          )}

          <form onSubmit={handleLogin}>
            <label className="flbl">Correo electrónico</label>
            <input
              className="finput"
              type="email"
              placeholder="ejemplo@polher.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <label className="flbl">Contraseña</label>
            <input
              className="finput"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <div className="opts-row">
              <label className="chk-lbl">
                <input type="checkbox" /> Mantener sesión activa
              </label>
              <button type="button" className="forgot">¿Olvidaste tu contraseña?</button>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar al sistema'}</button>
          </form>

          <div className="divider" />
        </div>
      </div>

    </div>
  )
}
