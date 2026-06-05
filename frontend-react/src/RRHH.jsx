import { useState, useEffect } from 'react'
import Nav from './Nav'
import { apiFetch, BASE_URL } from './api'
import './RRHH.css'

const API = `${BASE_URL}/api/usuarios`

function initials(nombre, apellido) {
  return ((nombre?.[0] || '') + (apellido?.[0] || '')).toUpperCase()
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatUltimoLogin(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const hoy = new Date()
  const esHoy = d.toDateString() === hoy.toDateString()
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return esHoy ? `Hoy · ${hora} hs` : formatFecha(iso)
}

function passScore(v) {
  return (v.length >= 8 ? 1 : 0) +
         (/[A-Z]/.test(v) ? 1 : 0) +
         (/[0-9]/.test(v) ? 1 : 0) +
         (/[^A-Za-z0-9]/.test(v) ? 1 : 0)
}

function rolPill(tipo) {
  if (tipo === 'Chofer') return <span className="pill p-cho"><span className="pdot" />Chofer</span>
  if (tipo === 'Recursos Humanos') return <span className="pill p-rh"><span className="pdot" />Recursos Humanos</span>
  return <span className="pill p-log"><span className="pdot" />Enc. de logística</span>
}

function avColor(tipo) {
  if (tipo === 'Chofer') return { background: '#D1F0E1', color: '#1C6B3A' }
  if (tipo === 'Recursos Humanos') return { background: 'var(--as)', color: 'var(--ad)' }
  return {}
}

const EMPTY_CREAR = { nombre: '', apellido: '', email: '', password: '', confirmar: '', tipo_usuario: 'Encargado de logística', dni: '' }
const EMPTY_EDITAR = { _id: '', nombre: '', apellido: '', email: '', tipo_usuario: '', activo: true, nuevaPassword: '' }

export default function RRHH() {
  const [usuarios, setUsuarios]   = useState([])
  const [stats, setStats]         = useState({ total: 0, activos: 0, choferes: 0, inactivos: 0 })
  const [search, setSearch]       = useState('')
  const [rolFilter, setRolFilter] = useState('')
  const [estFilter, setEstFilter] = useState('')

  const [modalCrear, setModalCrear]     = useState(false)
  const [modalEditar, setModalEditar]   = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [modalExito, setModalExito]     = useState(false)

  const [formCrear, setFormCrear]   = useState(EMPTY_CREAR)
  const [formEditar, setFormEditar] = useState(EMPTY_EDITAR)
  const [elimTarget, setElimTarget] = useState(null)
  const [loadingCrear, setLoadingCrear] = useState(false)
  const [errorCrear, setErrorCrear]     = useState('')

  useEffect(() => {
    fetchUsuarios()
    fetchStats()
  }, [])

  async function fetchUsuarios() {
    const res = await apiFetch(API)
    const data = await res.json()
    setUsuarios(Array.isArray(data) ? data : [])
  }

  async function fetchStats() {
    const res = await apiFetch(`${API}/stats`)
    const data = await res.json()
    setStats(data)
  }

  const filtrados = usuarios.filter(u => {
    const nombre = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase()
    const matchQ = !search || nombre.includes(search.toLowerCase()) || u.email.includes(search.toLowerCase())
    const matchR = !rolFilter || u.tipo_usuario === rolFilter
    const matchE = !estFilter || (estFilter === 'Activo' ? u.activo : !u.activo)
    return matchQ && matchR && matchE
  })

  async function submitCrear() {
    const { nombre, apellido, email, password, confirmar, tipo_usuario, dni } = formCrear
    if (!nombre || !apellido || !email || !password) { setErrorCrear('Completá todos los campos'); return }
    if (tipo_usuario === 'Chofer' && !dni) { setErrorCrear('El DNI es requerido para choferes'); return }
    if (password !== confirmar) { setErrorCrear('Las contraseñas no coinciden'); return }
    setErrorCrear('')
    setLoadingCrear(true)
    try {
      const res = await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify({ nombre, apellido, email, password, tipo_usuario, dni: dni || undefined })
      })
      if (!res.ok) { const d = await res.json(); setErrorCrear(d.mensaje); return }
      setModalCrear(false)
      setFormCrear(EMPTY_CREAR)
      await fetchUsuarios()
      await fetchStats()
      setModalExito(true)
    } finally {
      setLoadingCrear(false)
    }
  }

  async function submitEditar() {
    const { _id, nombre, apellido, email, tipo_usuario, activo, nuevaPassword } = formEditar
    const res = await apiFetch(`${API}/${_id}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre, apellido, email, tipo_usuario, activo, nuevaPassword: nuevaPassword || undefined })
    })
    if (res.ok) {
      setModalEditar(false)
      await fetchUsuarios()
      await fetchStats()
    }
  }

  async function submitEliminar() {
    await apiFetch(`${API}/${elimTarget._id}`, { method: 'DELETE' })
    setModalEliminar(false)
    await fetchUsuarios()
    await fetchStats()
  }

  function openEditar(u) {
    setFormEditar({ _id: u._id, nombre: u.nombre || '', apellido: u.apellido || '', email: u.email, tipo_usuario: u.tipo_usuario, activo: u.activo, nuevaPassword: '' })
    setModalEditar(true)
  }

  const score = passScore(formCrear.password)
  const barCls = score <= 1 ? 'war' : score <= 2 ? 'ok' : score <= 3 ? 'ok' : 'str'
  const passTxt = !formCrear.password
    ? 'Mín. 8 caracteres, mayúscula, número y carácter especial'
    : score === 4 ? 'Contraseña fuerte'
    : score === 3 ? 'Falta un carácter especial (ej: !@#$)'
    : score === 2 ? 'Contraseña débil'
    : 'Muy corta o simple'

  const byRol = (rol) => usuarios.filter(u => u.tipo_usuario === rol).length

  return (
    <>
      {/* HEADER */}
      <div className="header">
        <div className="brand">
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="14" width="22" height="10" rx="3" fill="white" />
              <circle cx="7" cy="24" r="3.5" fill="white" />
              <circle cx="21" cy="24" r="3.5" fill="white" />
              <rect x="2" y="5" width="13" height="10" rx="2" fill="rgba(255,255,255,.8)" />
            </svg>
            <div className="online-dot" />
          </div>
          <div>
            <div className="brand-name">Log-Pol</div>
            <div className="brand-sub">Recursos Humanos</div>
          </div>
        </div>
        <Nav />
      </div>

      <div className="body-wrap">
        {/* LEFT */}
        <div className="left-main">

          <div className="page-hd">
            <div>
              <div className="page-ttl">Cuentas de usuario</div>
              <div className="page-sub">Administración de accesos al sistema · Abril 2026</div>
            </div>
            <button className="btn-new" onClick={() => { setFormCrear(EMPTY_CREAR); setErrorCrear(''); setModalCrear(true) }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2 L8 14 M2 8 L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Crear cuenta
            </button>
          </div>

          {/* FILTERS */}
          <div className="filter-row">
            <div className="srch-wrap">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="#94A3B8" strokeWidth="1.4" />
                <path d="M10 10 L13.5 13.5" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="sel-wrap">
              <select value={rolFilter} onChange={e => setRolFilter(e.target.value)}>
                <option value="">Todos los roles</option>
                <option>Encargado de logística</option>
                <option>Chofer</option>
                <option>Recursos Humanos</option>
              </select>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4 L6 8 L10 4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="sel-wrap">
              <select value={estFilter} onChange={e => setEstFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4 L6 8 L10 4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>

          {/* TABLE */}
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 200 }}>Usuario</th>
                  <th style={{ width: 200 }}>Email</th>
                  <th style={{ width: 160 }}>Rol</th>
                  <th style={{ width: 100 }}>Estado</th>
                  <th style={{ width: 120 }}>Creado</th>
                  <th style={{ width: 130 }}>Último acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="av-cell">
                        <div className="av" style={u.activo ? avColor(u.tipo_usuario) : { background: 'var(--g200)', color: 'var(--g400)' }}>
                          {initials(u.nombre, u.apellido)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: u.activo ? 'var(--tx)' : 'var(--g400)' }}>
                            {u.nombre} {u.apellido}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--g400)' }}>{u.tipo_usuario}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: u.activo ? 'var(--tx)' : 'var(--g400)' }}>{u.email}</td>
                    <td>{rolPill(u.tipo_usuario)}</td>
                    <td>
                      {u.activo
                        ? <span className="pill p-act"><span className="pdot" />Activo</span>
                        : <span className="pill p-ina"><span className="pdot" />Inactivo</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--g400)' }}>{formatFecha(u.createdAt)}</td>
                    <td style={{ fontSize: 12, color: 'var(--g400)' }}>{formatUltimoLogin(u.ultimo_login)}</td>
                    <td>
                      <div className="acts">
                        <button className="btn-icon" title="Editar" onClick={() => openEditar(u)}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2.5 L11.5 5 L4.5 12 L2 12.5 L2.5 10 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                        </button>
                        <button className="btn-icon danger" title="Eliminar" onClick={() => { setElimTarget(u); setModalEliminar(true) }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4 L12 4 M5 4 L5 2 L9 2 L9 4 M5.5 4 L5.5 11 M8.5 4 L8.5 11 M3 4 L3.5 12 L10.5 12 L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--g400)', padding: 32 }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="rp-pill"><span className="rp-sdot" />Sistema en línea</div>
          <div>
            <div className="rp-title">Usuarios</div>
            <div className="rp-sub">Resumen de cuentas activas</div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="sc-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="7" cy="6" r="3.5" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" />
                  <path d="M1 17 C1 13.5 3.7 11 7 11" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="14" cy="9" r="3" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" />
                  <path d="M9 17 C9 14 11.2 12 14 12 C16.8 12 19 14 19 17" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div className="sc-lbl">Total usuarios</div>
              <div className="sc-val">{stats.total}</div>
              <div className="sc-tag">registrados</div>
            </div>
            <div className="stat-card">
              <div className="sc-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10 L8 15 L17 5" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="sc-lbl">Activos</div>
              <div className="sc-val">{stats.activos}</div>
              <div className="sc-tag">con acceso</div>
            </div>
            <div className="stat-card">
              <div className="sc-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="8" width="14" height="10" rx="2" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" />
                  <path d="M7 8 L7 5 C7 3.3 8.3 2 10 2 C11.7 2 13 3.3 13 5 L13 8" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div className="sc-lbl">Choferes</div>
              <div className="sc-val">{stats.choferes}</div>
              <div className="sc-tag">conductores</div>
            </div>
            <div className="stat-card">
              <div className="sc-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2 L18 17 H2 Z" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinejoin="round" />
                  <line x1="10" y1="8" x2="10" y2="12" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="10" cy="14.5" r="0.9" fill="rgba(255,255,255,.55)" />
                </svg>
              </div>
              <div className="sc-lbl">Inactivos</div>
              <div className="sc-val">{stats.inactivos}</div>
              <div className="sc-tag">sin acceso</div>
            </div>
          </div>

          <div className="rp-sep" />
          <div className="rp-lbl">Filtrar por rol</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="filter-btn" onClick={() => setRolFilter('Encargado de logística')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: '#60A5FA' }} />Enc. de logística</div>
              <span className="fb-badge">{byRol('Encargado de logística')}</span>
            </button>
            <button className="filter-btn" onClick={() => setRolFilter('Chofer')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: '#4ADE80' }} />Choferes</div>
              <span className="fb-badge">{byRol('Chofer')}</span>
            </button>
            <button className="filter-btn" onClick={() => setRolFilter('Recursos Humanos')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'var(--am)' }} />Recursos Humanos</div>
              <span className="fb-badge">{byRol('Recursos Humanos')}</span>
            </button>
            <button className="filter-btn" onClick={() => setRolFilter('')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'rgba(255,255,255,.3)' }} />Todos</div>
            </button>
          </div>
          <button className="help-btn">?</button>
        </div>
      </div>

      {/* ═══ MODAL CREAR ═══ */}
      <div className={`overlay${modalCrear ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalCrear(false)}>
        <div className="modal">
          <div className="modal-head">
            <span className="modal-ttl">Crear nueva cuenta</span>
            <button className="modal-close" onClick={() => setModalCrear(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div>
              <label className="flbl">Rol del usuario</label>
              <div className="rol-opts">
                {[
                  { val: 'Encargado de logística', name: 'Enc. logística', desc: 'Gestiona pedidos y camiones' },
                  { val: 'Chofer', name: 'Chofer', desc: 'Confirma y actualiza entregas' },
                  { val: 'Recursos Humanos', name: 'Recursos Humanos', desc: 'Administra cuentas de usuario' }
                ].map(r => (
                  <div
                    key={r.val}
                    className={`rol-opt${formCrear.tipo_usuario === r.val ? ' on' : ''}`}
                    onClick={() => setFormCrear(f => ({ ...f, tipo_usuario: r.val }))}
                  >
                    <div className="rol-name">{r.name}</div>
                    <div className="rol-desc">{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="m-sep" />
            <div className="m-grid">
              <div>
                <label className="flbl">Nombre</label>
                <input className="finput" placeholder="Nombre" value={formCrear.nombre} onChange={e => setFormCrear(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Apellido</label>
                <input className="finput" placeholder="Apellido" value={formCrear.apellido} onChange={e => setFormCrear(f => ({ ...f, apellido: e.target.value }))} />
              </div>
              <div className="m-full">
                <label className="flbl">Correo electrónico</label>
                <input className="finput" type="email" placeholder="usuario@polher.com" value={formCrear.email} onChange={e => setFormCrear(f => ({ ...f, email: e.target.value }))} />
              </div>
              {formCrear.tipo_usuario === 'Chofer' && (
                <div className="m-full">
                  <label className="flbl">DNI *</label>
                  <input className="finput" placeholder="Ej: 30123456" value={formCrear.dni} onChange={e => setFormCrear(f => ({ ...f, dni: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="m-sep" />
            <div className="m-grid">
              <div>
                <label className="flbl">Contraseña provisoria</label>
                <input className="finput" type="password" placeholder="Mín. 8 caracteres" value={formCrear.password} onChange={e => setFormCrear(f => ({ ...f, password: e.target.value }))} />
                <div className="pass-strength">
                  {[0, 1, 2].map(i => <div key={i} className={`ps-bar${i < score ? ' ' + barCls : ''}`} />)}
                </div>
                <div className="ps-txt" style={{ color: score === 4 ? 'var(--gr)' : score >= 2 ? 'var(--bm)' : score === 1 ? 'var(--ad)' : 'var(--g400)' }}>{passTxt}</div>
              </div>
              <div>
                <label className="flbl">Confirmar contraseña</label>
                <input className="finput" type="password" placeholder="Repetí la contraseña" value={formCrear.confirmar} onChange={e => setFormCrear(f => ({ ...f, confirmar: e.target.value }))} />
              </div>
            </div>
            {errorCrear && <div style={{ fontSize: 12, color: 'var(--re)', background: '#FFF0F0', padding: '8px 12px', borderRadius: 8, border: '1px solid #f5c0c0' }}>{errorCrear}</div>}
            <div className="info-box">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
                <line x1="7.5" y1="6" x2="7.5" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="7.5" cy="4.5" r="0.7" fill="currentColor" />
              </svg>
              <span>El usuario deberá cambiar su contraseña en el primer inicio de sesión.</span>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalCrear(false)}>Cancelar</button>
            <button className="btnok" onClick={submitCrear} disabled={loadingCrear}>{loadingCrear ? 'Creando...' : 'Crear cuenta'}</button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL EDITAR ═══ */}
      <div className={`overlay${modalEditar ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalEditar(false)}>
        <div className="modal">
          <div className="modal-head">
            <span className="modal-ttl">Editar cuenta · {formEditar.nombre} {formEditar.apellido}</span>
            <button className="modal-close" onClick={() => setModalEditar(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="m-grid">
              <div>
                <label className="flbl">Nombre</label>
                <input className="finput" value={formEditar.nombre} onChange={e => setFormEditar(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Apellido</label>
                <input className="finput" value={formEditar.apellido} onChange={e => setFormEditar(f => ({ ...f, apellido: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Correo electrónico</label>
                <input className="finput" type="email" value={formEditar.email} onChange={e => setFormEditar(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Rol</label>
                <select className="finput" value={formEditar.tipo_usuario} onChange={e => setFormEditar(f => ({ ...f, tipo_usuario: e.target.value }))}>
                  <option>Encargado de logística</option>
                  <option>Chofer</option>
                  <option>Recursos Humanos</option>
                </select>
              </div>
              <div>
                <label className="flbl">Estado de cuenta</label>
                <select className="finput" value={formEditar.activo ? 'Activo' : 'Inactivo'} onChange={e => setFormEditar(f => ({ ...f, activo: e.target.value === 'Activo' }))}>
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
              </div>
              <div>
                <label className="flbl">Restablecer contraseña (opcional)</label>
                <input className="finput" type="password" placeholder="Nueva contraseña provisoria" value={formEditar.nuevaPassword} onChange={e => setFormEditar(f => ({ ...f, nuevaPassword: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalEditar(false)}>Cancelar</button>
            <button className="btnok" onClick={submitEditar}>Guardar cambios</button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL ELIMINAR ═══ */}
      <div className={`overlay${modalEliminar ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalEliminar(false)}>
        <div className="modal" style={{ width: 420 }}>
          <div className="modal-head">
            <span className="modal-ttl">Eliminar cuenta</span>
            <button className="modal-close" onClick={() => setModalEliminar(false)}>✕</button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px' }}>
            <div className="confirm-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 6 L21 6 M8 6 L8 3 L16 3 L16 6 M8 10 L8 18 M12 10 L12 18 M16 10 L16 18 M5 6 L5.5 21 L18.5 21 L19 6" stroke="var(--ad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              ¿Eliminar cuenta de {elimTarget?.nombre} {elimTarget?.apellido}?
            </div>
            <div style={{ fontSize: 13, color: 'var(--g400)', lineHeight: 1.5, maxWidth: 300, margin: '0 auto' }}>
              La cuenta será marcada como inactiva y el usuario perderá acceso inmediato. Esta acción no elimina los registros históricos.
            </div>
          </div>
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalEliminar(false)}>Cancelar</button>
            <button className="btn-danger" onClick={submitEliminar}>Sí, eliminar cuenta</button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL ÉXITO ═══ */}
      <div className={`overlay${modalExito ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalExito(false)}>
        <div className="modal" style={{ width: 380 }}>
          <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ width: 56, height: 56, background: '#D1F0E1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M4 13 L10 19 L22 7" stroke="#1C6B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>¡Cuenta creada!</div>
            <div style={{ fontSize: 13, color: 'var(--g400)', lineHeight: 1.5, marginBottom: 20 }}>
              La cuenta fue creada exitosamente. El usuario deberá cambiar su contraseña en el primer acceso.
            </div>
            <button className="btnok" style={{ width: '100%' }} onClick={() => setModalExito(false)}>Entendido</button>
          </div>
        </div>
      </div>
    </>
  )
}
