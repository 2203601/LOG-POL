import { useState, useEffect } from 'react'
import Nav from './Nav'
import { apiFetch } from './api'
import './Vehiculos.css'

const API = 'http://localhost:3001/api/vehiculos'

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function capColor(pct) {
  if (pct >= 90) return { cls: 'cf-dan', color: 'var(--re)' }
  if (pct >= 70) return { cls: 'cf-war', color: 'var(--am)' }
  return { cls: 'cf-ok', color: 'var(--bm)' }
}

function estadoPill(estado) {
  if (estado === 'Disponible') return <span className="pill p-disp"><span className="pdot" />Disponible</span>
  if (estado === 'En ruta')    return <span className="pill p-ruta"><span className="pdot" />En ruta</span>
  return <span className="pill p-serv"><span className="pdot" />{estado || 'Sin estado'}</span>
}

const EMPTY_NUEVO  = { patente: '', anio: '', marca: '', modelo: '', capacidad_kg: '', conductor_asignado: '', conductor_dni: '', estado: 'Disponible' }
const EMPTY_EDITAR = { _id: '', patente: '', anio: '', marca: '', modelo: '', capacidad_kg: '', conductor_asignado: '', conductor_dni: '', estado: 'Disponible' }

export default function Vehiculos() {
  const [vehiculos, setVehiculos]     = useState([])
  const [stats, setStats]             = useState({ total: 0, disponibles: 0, en_ruta: 0, fuera_servicio: 0 })
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tab, setTab]                 = useState('tabla')

  const [modalNuevo, setModalNuevo]   = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)

  const [formNuevo, setFormNuevo]     = useState(EMPTY_NUEVO)
  const [formEditar, setFormEditar]   = useState(EMPTY_EDITAR)
  const [detalle, setDetalle]         = useState(null)
  const [errorNuevo, setErrorNuevo]   = useState('')

  useEffect(() => {
    fetchVehiculos()
    fetchStats()
  }, [])

  async function fetchVehiculos() {
    const res = await apiFetch(API)
    const data = await res.json()
    setVehiculos(Array.isArray(data) ? data : [])
  }

  async function fetchStats() {
    const res = await apiFetch(`${API}/stats`)
    const data = await res.json()
    setStats(data)
  }

  async function submitNuevo() {
    if (!formNuevo.patente) { setErrorNuevo('La patente es requerida'); return }
    setErrorNuevo('')
    const res = await apiFetch(API, {
      method: 'POST',
      body: JSON.stringify({ ...formNuevo, anio: formNuevo.anio ? Number(formNuevo.anio) : undefined, capacidad_kg: formNuevo.capacidad_kg ? Number(formNuevo.capacidad_kg) : undefined })
    })
    if (!res.ok) { const d = await res.json(); setErrorNuevo(d.mensaje); return }
    setModalNuevo(false)
    setFormNuevo(EMPTY_NUEVO)
    fetchVehiculos()
    fetchStats()
  }

  async function submitEditar() {
    const res = await apiFetch(`${API}/${formEditar._id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...formEditar, anio: formEditar.anio ? Number(formEditar.anio) : undefined, capacidad_kg: formEditar.capacidad_kg ? Number(formEditar.capacidad_kg) : undefined })
    })
    if (res.ok) {
      setModalEditar(false)
      fetchVehiculos()
      fetchStats()
    }
  }

  function openEditar(v) {
    setFormEditar({ _id: v._id, patente: v.patente || '', anio: v.anio || '', marca: v.marca || '', modelo: v.modelo || '', capacidad_kg: v.capacidad_kg || '', conductor_asignado: v.conductor_asignado || '', conductor_dni: v.conductor_dni || '', estado: v.estado || 'Disponible' })
    setModalEditar(true)
  }

  function openDetalle(v) {
    setDetalle(v)
    setModalDetalle(true)
  }

  const filtrados = vehiculos.filter(v => {
    const matchQ = !search || v.patente?.toLowerCase().includes(search.toLowerCase()) || v.conductor_asignado?.toLowerCase().includes(search.toLowerCase())
    const matchS = !statusFilter || v.estado === statusFilter
    return matchQ && matchS
  })

  const hayAlerta = vehiculos.some(v => v.pct >= 80)

  const totalCarga = vehiculos.reduce((s, v) => s + (v.carga_actual || 0), 0)
  const totalCap   = vehiculos.reduce((s, v) => s + (v.capacidad_kg || 0), 0)
  const fleetPct   = totalCap ? Math.round((totalCarga / totalCap) * 100) : 0

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
            <div className="brand-sub">Gestión de Vehículos</div>
          </div>
        </div>
        <Nav />
      </div>

      <div className="body-wrap">
        {/* LEFT */}
        <div className="left-main">
          <div className="page-hd">
            <div>
              <div className="page-ttl">Flota de vehículos</div>
              <div className="page-sub">Administración de camiones y asignaciones · Mayo 2026</div>
            </div>
            <button className="btn-new" onClick={() => { setFormNuevo(EMPTY_NUEVO); setErrorNuevo(''); setModalNuevo(true) }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2 L8 14 M2 8 L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Nuevo vehículo
            </button>
          </div>

          {hayAlerta && (
            <div className="alert-bar">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M8 1 L15 14 H1 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <line x1="8" y1="6" x2="8" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="8" cy="12" r="0.7" fill="currentColor" />
              </svg>
              Uno o más vehículos superan el 80% de su capacidad de carga.
            </div>
          )}

          <div className="filter-row" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="srch-wrap">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#94A3B8" strokeWidth="1.4" />
                  <path d="M10 10 L13.5 13.5" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input placeholder="Buscar patente o conductor..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="sel-wrap">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Todos los estados</option>
                  <option>Disponible</option>
                  <option>En ruta</option>
                  <option>Fuera de servicio</option>
                </select>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4 L6 8 L10 4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
            <div className="tabs">
              <button className={`tab${tab === 'tabla' ? ' on' : ''}`} onClick={() => setTab('tabla')}>Lista</button>
              <button className={`tab${tab === 'cards' ? ' on' : ''}`} onClick={() => setTab('cards')}>Tarjetas</button>
            </div>
          </div>

          {tab === 'tabla' ? (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patente</th>
                    <th>Conductor</th>
                    <th>Capacidad máx.</th>
                    <th>Carga actual</th>
                    <th>Estado</th>
                    <th>Pedidos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(v => {
                    const { cls } = capColor(v.pct)
                    return (
                      <tr key={v._id}>
                        <td>
                          <div className="td-pat">{v.patente}</div>
                          <div style={{ fontSize: 11, color: 'var(--g400)' }}>{v.marca} {v.modelo} {v.anio ? `· ${v.anio}` : ''}</div>
                        </td>
                        <td>
                          {v.conductor_asignado
                            ? <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{v.conductor_asignado}</div>
                                {v.conductor_dni && <div style={{ fontSize: 11, color: 'var(--g400)' }}>DNI {v.conductor_dni}</div>}
                              </div>
                            : <span style={{ fontSize: 12, color: 'var(--g400)' }}>Sin asignar</span>}
                        </td>
                        <td style={{ fontSize: 13 }}>{v.capacidad_kg ? `${v.capacidad_kg.toLocaleString()} kg` : '—'}</td>
                        <td>
                          <div className="cap-wrap">
                            <div className="cap-txt">{v.carga_actual ? `${v.carga_actual.toLocaleString()} kg` : '0 kg'} <span style={{ color: 'var(--g400)' }}>({v.pct}%)</span></div>
                            <div className="cap-bar">
                              <div className={`cap-fill ${cls}`} style={{ width: `${Math.min(v.pct, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>{estadoPill(v.estado)}</td>
                        <td style={{ fontSize: 13 }}>{v.pedidos_count ?? 0}</td>
                        <td>
                          <div className="acts">
                            <button className="btn-icon" title="Ver detalle" onClick={() => openDetalle(v)}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" /></svg>
                            </button>
                            <button className="btn-icon" title="Editar" onClick={() => openEditar(v)}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2.5 L11.5 5 L4.5 12 L2 12.5 L2.5 10 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtrados.length === 0 && (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--g400)', padding: 32 }}>Sin resultados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flota-grid">
              {filtrados.map(v => {
                const { cls } = capColor(v.pct)
                return (
                  <div className="flota-card" key={v._id}>
                    <div className="fc-top">
                      <div>
                        <div className="fc-pat">{v.patente}</div>
                        <div className="fc-driver">{v.conductor_asignado || 'Sin conductor'}</div>
                      </div>
                      {estadoPill(v.estado)}
                    </div>
                    <div className="fc-cap">Capacidad: <span>{v.capacidad_kg ? `${v.capacidad_kg.toLocaleString()} kg` : '—'}</span></div>
                    <div className="cap-wrap">
                      <div className="cap-txt">{v.carga_actual || 0} kg cargados ({v.pct}%)</div>
                      <div className="cap-bar">
                        <div className={`cap-fill ${cls}`} style={{ width: `${Math.min(v.pct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="fc-actions">
                      <button className="fc-btn" onClick={() => openDetalle(v)}>Ver detalle</button>
                      <button className="fc-btn" onClick={() => openEditar(v)}>Editar</button>
                    </div>
                  </div>
                )
              })}
              {filtrados.length === 0 && <div style={{ color: 'var(--g400)', fontSize: 13, padding: 16 }}>Sin resultados</div>}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="rp-pill"><span className="rp-sdot" />Sistema en línea</div>
          <div>
            <div className="rp-title">Vehículos</div>
            <div className="rp-sub">Resumen de flota activa</div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="sc-lbl">Total flota</div>
              <div className="sc-val">{stats.total}</div>
              <div className="sc-tag">vehículos</div>
            </div>
            <div className="stat-card">
              <div className="sc-lbl">Disponibles</div>
              <div className="sc-val">{stats.disponibles}</div>
              <div className="sc-tag">listos</div>
            </div>
            <div className="stat-card">
              <div className="sc-lbl">En ruta</div>
              <div className="sc-val">{stats.en_ruta}</div>
              <div className="sc-tag">activos</div>
            </div>
            <div className="stat-card">
              <div className="sc-lbl">Fuera serv.</div>
              <div className="sc-val">{stats.fuera_servicio}</div>
              <div className="sc-tag">no operativos</div>
            </div>
          </div>

          <div className="rp-sep" />
          <div className="rp-lbl">Uso de flota total</div>
          <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>Capacidad utilizada</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{fleetPct}%</div>
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(fleetPct, 100)}%`, height: '100%', background: fleetPct >= 80 ? 'var(--re)' : fleetPct >= 60 ? 'var(--am)' : '#4ADE80', borderRadius: 3, transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>{totalCarga.toLocaleString()} / {totalCap.toLocaleString()} kg</div>
          </div>

          <div className="rp-sep" />
          <div className="rp-lbl">Filtrar por estado</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="filter-btn" onClick={() => setStatusFilter('Disponible')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: '#4ADE80' }} />Disponibles</div>
              <span className="fb-badge">{stats.disponibles}</span>
            </button>
            <button className="filter-btn" onClick={() => setStatusFilter('En ruta')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'var(--am)' }} />En ruta</div>
              <span className="fb-badge">{stats.en_ruta}</span>
            </button>
            <button className="filter-btn" onClick={() => setStatusFilter('Fuera de servicio')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'var(--re)' }} />Fuera de servicio</div>
              <span className="fb-badge">{stats.fuera_servicio}</span>
            </button>
            <button className="filter-btn" onClick={() => setStatusFilter('')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'rgba(255,255,255,.3)' }} />Todos</div>
            </button>
          </div>
          <button className="help-btn">?</button>
        </div>
      </div>

      {/* ═══ MODAL NUEVO ═══ */}
      <div className={`overlay${modalNuevo ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalNuevo(false)}>
        <div className="modal">
          <div className="modal-head">
            <span className="modal-ttl">Nuevo vehículo</span>
            <button className="modal-close" onClick={() => setModalNuevo(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="m-grid">
              <div>
                <label className="flbl">Patente *</label>
                <input className="finput" placeholder="Ej: AB123CD" value={formNuevo.patente} onChange={e => setFormNuevo(f => ({ ...f, patente: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="flbl">Año</label>
                <input className="finput" type="number" placeholder="Ej: 2020" value={formNuevo.anio} onChange={e => setFormNuevo(f => ({ ...f, anio: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Marca</label>
                <input className="finput" placeholder="Ej: Mercedes-Benz" value={formNuevo.marca} onChange={e => setFormNuevo(f => ({ ...f, marca: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Modelo</label>
                <input className="finput" placeholder="Ej: Accelo 815" value={formNuevo.modelo} onChange={e => setFormNuevo(f => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Capacidad (kg)</label>
                <input className="finput" type="number" placeholder="Ej: 5000" value={formNuevo.capacidad_kg} onChange={e => setFormNuevo(f => ({ ...f, capacidad_kg: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Estado</label>
                <select className="finput" value={formNuevo.estado} onChange={e => setFormNuevo(f => ({ ...f, estado: e.target.value }))}>
                  <option>Disponible</option>
                  <option>En ruta</option>
                  <option>Fuera de servicio</option>
                </select>
              </div>
              <div>
                <label className="flbl">Conductor asignado</label>
                <input className="finput" placeholder="Nombre del conductor" value={formNuevo.conductor_asignado} onChange={e => setFormNuevo(f => ({ ...f, conductor_asignado: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">DNI del conductor</label>
                <input className="finput" placeholder="Ej: 30123456" value={formNuevo.conductor_dni} onChange={e => setFormNuevo(f => ({ ...f, conductor_dni: e.target.value }))} />
              </div>
            </div>
            {errorNuevo && <div style={{ fontSize: 12, color: 'var(--re)', background: '#FFF0F0', padding: '8px 12px', borderRadius: 8, border: '1px solid #f5c0c0' }}>{errorNuevo}</div>}
          </div>
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalNuevo(false)}>Cancelar</button>
            <button className="btnok" onClick={submitNuevo}>Agregar vehículo</button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL EDITAR ═══ */}
      <div className={`overlay${modalEditar ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalEditar(false)}>
        <div className="modal">
          <div className="modal-head">
            <span className="modal-ttl">Editar vehículo · {formEditar.patente}</span>
            <button className="modal-close" onClick={() => setModalEditar(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="m-grid">
              <div>
                <label className="flbl">Patente</label>
                <input className="finput" value={formEditar.patente} onChange={e => setFormEditar(f => ({ ...f, patente: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="flbl">Año</label>
                <input className="finput" type="number" value={formEditar.anio} onChange={e => setFormEditar(f => ({ ...f, anio: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Marca</label>
                <input className="finput" value={formEditar.marca} onChange={e => setFormEditar(f => ({ ...f, marca: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Modelo</label>
                <input className="finput" value={formEditar.modelo} onChange={e => setFormEditar(f => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Capacidad (kg)</label>
                <input className="finput" type="number" value={formEditar.capacidad_kg} onChange={e => setFormEditar(f => ({ ...f, capacidad_kg: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Estado</label>
                <select className="finput" value={formEditar.estado} onChange={e => setFormEditar(f => ({ ...f, estado: e.target.value }))}>
                  <option>Disponible</option>
                  <option>En ruta</option>
                  <option>Fuera de servicio</option>
                </select>
              </div>
              <div>
                <label className="flbl">Conductor asignado</label>
                <input className="finput" value={formEditar.conductor_asignado} onChange={e => setFormEditar(f => ({ ...f, conductor_asignado: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">DNI del conductor</label>
                <input className="finput" value={formEditar.conductor_dni} onChange={e => setFormEditar(f => ({ ...f, conductor_dni: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalEditar(false)}>Cancelar</button>
            <button className="btnok" onClick={submitEditar}>Guardar cambios</button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL DETALLE ═══ */}
      <div className={`overlay${modalDetalle ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalDetalle(false)}>
        <div className="modal">
          <div className="modal-head">
            <span className="modal-ttl">Detalle · {detalle?.patente}</span>
            <button className="modal-close" onClick={() => setModalDetalle(false)}>✕</button>
          </div>
          {detalle && (
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-row"><span className="dr-k">Patente</span><span className="dr-v">{detalle.patente}</span></div>
                <div className="detail-row"><span className="dr-k">Marca / Modelo</span><span className="dr-v">{detalle.marca || '—'} {detalle.modelo || ''}</span></div>
                <div className="detail-row"><span className="dr-k">Año</span><span className="dr-v">{detalle.anio || '—'}</span></div>
                <div className="detail-row"><span className="dr-k">Capacidad</span><span className="dr-v">{detalle.capacidad_kg ? `${detalle.capacidad_kg.toLocaleString()} kg` : '—'}</span></div>
                <div className="detail-row"><span className="dr-k">Conductor</span><span className="dr-v">{detalle.conductor_asignado || 'Sin asignar'}</span></div>
                <div className="detail-row"><span className="dr-k">DNI conductor</span><span className="dr-v">{detalle.conductor_dni || '—'}</span></div>
                <div className="detail-row"><span className="dr-k">Estado</span><span className="dr-v">{estadoPill(detalle.estado)}</span></div>
                <div className="detail-row"><span className="dr-k">Fecha registro</span><span className="dr-v">{formatFecha(detalle.fecha_registro)}</span></div>
              </div>
              <div className="m-sep" />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Uso de capacidad</div>
              <div className="cap-preview-row">
                <span>{detalle.carga_actual || 0} kg / {detalle.capacidad_kg || 0} kg</span>
                <div className="cap-bar-lg">
                  <div className="cap-fill-lg" style={{ width: `${Math.min(detalle.pct || 0, 100)}%`, background: capColor(detalle.pct || 0).color }} />
                </div>
                <span style={{ fontWeight: 700 }}>{detalle.pct || 0}%</span>
              </div>
              <div className="m-sep" />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Historial reciente</div>
              {[
                { fecha: '30/04/2026', texto: 'Pedido #A3F12B entregado en Córdoba' },
                { fecha: '28/04/2026', texto: 'Asignado a ruta Rosario – Mendoza' },
                { fecha: '25/04/2026', texto: 'Revisión técnica completada' }
              ].map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                  <span style={{ color: 'var(--g400)', flexShrink: 0 }}>{h.fecha}</span>
                  <span style={{ color: 'var(--tx)' }}>{h.texto}</span>
                </div>
              ))}
            </div>
          )}
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalDetalle(false)}>Cerrar</button>
            <button className="btnok" onClick={() => { setModalDetalle(false); openEditar(detalle) }}>Editar vehículo</button>
          </div>
        </div>
      </div>
    </>
  )
}
