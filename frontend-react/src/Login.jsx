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
          <div className="footer-note">Administración de Proyectos de Software · UCC · Abr 2026</div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="right">
        <div className="status-pill"><span className="sdot" />Sistema en línea · Acceso seguro</div>

        <div>
          <div className="panel-title">Panel de control</div>
          <div className="panel-sub">Monitoreo en tiempo real de operaciones logísticas</div>
        </div>

        <div>
          <div className="section-lbl">Estado del sistema</div>
          <div className="status-rows">
            <div className="srow">
              <span className="srow-k">Servidor</span>
              <span className="srow-v"><span className="srow-dot" />Online</span>
            </div>
            <div className="srow">
              <span className="srow-k">Versión</span>
              <span className="srow-v">v2.4.1</span>
            </div>
            <div className="srow">
              <span className="srow-k">Última sincronización</span>
              <span className="srow-v">14:32 hs</span>
            </div>
          </div>
        </div>

        <div>
          <div className="section-lbl">Estadísticas operativas</div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="sc-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="1" y="9" width="14" height="6" rx="2" fill="rgba(255,255,255,.5)" />
                  <circle cx="4" cy="15" r="2" fill="rgba(255,255,255,.7)" />
                  <circle cx="12" cy="15" r="2" fill="rgba(255,255,255,.7)" />
                  <rect x="1" y="4" width="9" height="6" rx="1.5" fill="rgba(255,255,255,.35)" />
                </svg>
              </div>
              <div className="sc-lbl">Camiones activos</div>
              <div className="sc-val">24</div>
            </div>
            <div className="stat-card">
              <div className="sc-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 13 L7 8 L10 11 L14 5" stroke="rgba(255,255,255,.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 5 L14 5 L14 7" stroke="rgba(255,255,255,.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="sc-lbl">Entregas hoy</div>
              <div className="sc-val">142</div>
            </div>
            <div className="stat-card">
              <div className="sc-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="8" r="4" stroke="rgba(255,255,255,.6)" strokeWidth="1.8" />
                  <path d="M9 12 L9 16" stroke="rgba(255,255,255,.6)" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="9" cy="8" r="1.5" fill="rgba(255,255,255,.6)" />
                </svg>
              </div>
              <div className="sc-lbl">En ruta</div>
              <div className="sc-val">18</div>
            </div>
            <div className="stat-card">
              <div className="sc-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9 L7 13 L15 5" stroke="rgba(255,255,255,.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="sc-lbl">Tasa de éxito</div>
              <div className="sc-val">94%</div>
            </div>
          </div>
        </div>

        <div className="alert-card">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M9 2 L16 15 H2 Z" stroke="#1A3F6F" strokeWidth="1.8" strokeLinejoin="round" />
            <line x1="9" y1="7" x2="9" y2="11" stroke="#1A3F6F" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="9" cy="13" r="0.8" fill="#1A3F6F" />
          </svg>
          <div>
            <div className="alert-title">Mantenimiento programado</div>
            <div className="alert-body">Domingo 2:00–4:00 AM · El sistema estará temporalmente fuera de servicio</div>
          </div>
        </div>

        <button className="help-btn">?</button>
      </div>
    </div>
  )
}
