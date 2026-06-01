import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from './api'
import './CambiarPassword.css'

const RUTAS = {
  'Encargado de logística': '/pedidos',
  'Recursos Humanos': '/rrhh',
  'Chofer': '/seguimiento',
}

function passStrength(p) {
  const len = p.length >= 8
  const hasMay = /[A-Z]/.test(p)
  const hasNum = /[0-9]/.test(p)
  return len + hasMay + hasNum
}

export default function CambiarPassword() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = passStrength(nueva)
  const strengthLabel = ['', 'Débil', 'Regular', 'Segura'][strength] || ''
  const strengthClass = ['', 'war', 'war', 'str'][strength] || ''

  async function handleSubmit(e) {
    e.preventDefault()
    if (nueva.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/usuarios/${usuario.id}/cambiar-password`, {
        method: 'POST',
        body: JSON.stringify({ nuevaPassword: nueva }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.mensaje); return }
      const ruta = RUTAS[usuario.tipo_usuario] || '/pedidos'
      navigate(ruta)
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cp-page">
      <div className="cp-card">
        <div className="cp-header">
          <div className="cp-brand-icon">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="2" y="13" width="20" height="9" rx="3" fill="white" />
              <circle cx="7" cy="22" r="3" fill="white" />
              <circle cx="19" cy="22" r="3" fill="white" />
              <rect x="2" y="5" width="12" height="9" rx="2" fill="rgba(255,255,255,.8)" />
            </svg>
          </div>
          <div>
            <div className="cp-brand-name">Log-Pol</div>
            <div className="cp-brand-sub">by POLHER S.A.</div>
          </div>
        </div>

        <div className="cp-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="14" width="20" height="14" rx="4" fill="#1A3F6F" />
            <path d="M10 14v-4a6 6 0 0 1 12 0v4" stroke="#1A3F6F" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="16" cy="21" r="2.5" fill="white" />
          </svg>
        </div>

        <div className="cp-title">Cambiá tu contraseña</div>
        <div className="cp-sub">Es tu primer acceso al sistema. Elegí una nueva contraseña para continuar.</div>

        <div className="cp-user-badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="4.5" r="2.5" stroke="#2563A8" strokeWidth="1.3" />
            <path d="M1.5 12C1.5 9.5 4 7.5 7 7.5s5.5 2 5.5 4.5" stroke="#2563A8" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {usuario.email}
        </div>

        <form onSubmit={handleSubmit} className="cp-form">
          {error && <div className="cp-error">{error}</div>}

          <div className="cp-field">
            <label className="flbl">Nueva contraseña</label>
            <input
              className="finput"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={nueva}
              onChange={e => setNueva(e.target.value)}
            />
            {nueva && (
              <>
                <div className="pass-strength">
                  {[1,2,3].map(i => (
                    <div key={i} className={`ps-bar${i <= strength ? ' ' + strengthClass : ''}`} />
                  ))}
                </div>
                <div className="ps-txt">{strengthLabel}</div>
              </>
            )}
          </div>

          <div className="cp-field">
            <label className="flbl">Confirmar contraseña</label>
            <input
              className="finput"
              type="password"
              placeholder="Repetí la contraseña"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
            />
          </div>

          <button type="submit" className="cp-btn" disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
