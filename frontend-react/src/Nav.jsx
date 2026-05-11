import { NavLink, useNavigate } from 'react-router-dom'
import './Nav.css'

const LINKS = {
  'Encargado de logística': [
    { to: '/pedidos',      label: 'Pedidos' },
    { to: '/vehiculos',    label: 'Vehículos' },
    { to: '/seguimiento',  label: 'Seguimiento' },
  ],
  'Recursos Humanos': [
    { to: '/rrhh',         label: 'Usuarios' },
    { to: '/seguimiento',  label: 'Seguimiento' },
  ],
  'Chofer': [
    { to: '/seguimiento',  label: 'Mis entregas' },
  ],
}

export default function Nav() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const links = LINKS[usuario.tipo_usuario] || []

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/login')
  }

  return (
    <div className="nav-area">

      {/* IZQUIERDA */}
      <div className="nav-left">
        {links.length > 0 && (
          <nav className="nav-links">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => 'nav-lnk' + (isActive ? ' active' : '')}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      {/* DERECHA */}
      <div className="nav-right">
        <div className="user-pill">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5.5" r="3" stroke="#94A3B8" strokeWidth="1.4" />
            <path d="M2 13.5 C2 11 4.7 9 8 9 C11.3 9 14 11 14 13.5" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {usuario.email || usuario.tipo_usuario || 'Usuario'}
        </div>

        <button className="btn-logout" onClick={logout} title="Cerrar sesión">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 11l3-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Salir
        </button>
      </div>

    </div>
  )
}