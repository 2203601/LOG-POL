import { useState, useEffect } from 'react'
import Nav from './Nav'
import './Pedidos.css'

const API  = 'http://localhost:3001/api/pedidos'
const VAPI = 'http://localhost:3001/api/vehiculos'

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function estadoPill(estado) {
  if (estado === 'Pendiente') return <span className="pill p-pend"><span className="pdot" />Pendiente</span>
  if (estado === 'En ruta')   return <span className="pill p-ruta"><span className="pdot" />En ruta</span>
  if (estado === 'Entregado') return <span className="pill p-entg"><span className="pdot" />Entregado</span>
  return <span className="pill p-ina"><span className="pdot" />{estado || '—'}</span>
}

const EMPTY_FORM = { cliente_nombre: '', destino: '', fecha_entrega_estimada: '', prioridad: 'Normal', vehiculo_id: '' }
const EMPTY_PROD = () => ({ descripcion: '', peso_unitario_kg: '', cantidad: 1 })

export default function Pedidos() {
  const [pedidos, setPedidos]         = useState([])
  const [vehiculos, setVehiculos]     = useState([])
  const [stats, setStats]             = useState({ total: 0, pendientes: 0, en_ruta: 0, entregados: 0 })
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modalNuevo, setModalNuevo]   = useState(false)
  const [modalAsignar, setModalAsignar] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)

  const [formNuevo, setFormNuevo]     = useState(EMPTY_FORM)
  const [productos, setProductos]     = useState([EMPTY_PROD()])
  const [errorNuevo, setErrorNuevo]   = useState('')

  const [asignarTarget, setAsignarTarget] = useState({ pedido: null, vehiculoId: '', capPct: 0 })
  const [detalle, setDetalle]         = useState(null)

  useEffect(() => {
    fetchPedidos()
    fetchStats()
    fetchVehiculos()
  }, [])

  async function fetchPedidos() {
    const res = await fetch(API)
    const data = await res.json()
    setPedidos(data)
  }

  async function fetchStats() {
    const res = await fetch(`${API}/stats`)
    const data = await res.json()
    setStats(data)
  }

  async function fetchVehiculos() {
    const res = await fetch(VAPI)
    const data = await res.json()
    setVehiculos(data)
  }

  const totalPeso = productos.reduce((s, p) => {
    const val = (parseFloat(p.peso_unitario_kg) || 0) * (parseInt(p.cantidad) || 0)
    return s + val
  }, 0)

  async function submitNuevo() {
    if (!formNuevo.cliente_nombre || !formNuevo.destino) { setErrorNuevo('Cliente y destino son requeridos'); return }
    setErrorNuevo('')
    const body = {
      ...formNuevo,
      vehiculo_id: formNuevo.vehiculo_id || undefined,
      peso_total_kg: totalPeso,
      productos: productos.filter(p => p.descripcion).map(p => ({
        descripcion: p.descripcion,
        cantidad: parseInt(p.cantidad) || 1,
        peso_unitario_kg: parseFloat(p.peso_unitario_kg) || 0
      }))
    }
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) { const d = await res.json(); setErrorNuevo(d.mensaje); return }
    setModalNuevo(false)
    setFormNuevo(EMPTY_FORM)
    setProductos([EMPTY_PROD()])
    fetchPedidos()
    fetchStats()
  }

  async function submitAsignar() {
    if (!asignarTarget.vehiculoId) return
    const res = await fetch(`${API}/${asignarTarget.pedido._id}/asignar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehiculo_id: asignarTarget.vehiculoId })
    })
    if (res.ok) {
      setModalAsignar(false)
      fetchPedidos()
      fetchStats()
    }
  }

  function openAsignar(p) {
    setAsignarTarget({ pedido: p, vehiculoId: '', capPct: 0 })
    setModalAsignar(true)
  }

  function addProducto() {
    setProductos(ps => [...ps, EMPTY_PROD()])
  }

  function removeProducto(i) {
    setProductos(ps => ps.filter((_, idx) => idx !== i))
  }

  function updateProducto(i, field, val) {
    setProductos(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }

  const asignarVehiculo = vehiculos.find(v => v._id === asignarTarget.vehiculoId)
  const asignarPct = asignarVehiculo && asignarVehiculo.capacidad_kg
    ? Math.round(((asignarVehiculo.carga_actual || 0) + (asignarTarget.pedido?.peso_total_kg || 0)) / asignarVehiculo.capacidad_kg * 100)
    : 0

  const filtrados = pedidos.filter(p => {
    const matchQ = !search || p.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) || p.destino?.toLowerCase().includes(search.toLowerCase())
    const matchS = !statusFilter || p.estado === statusFilter
    return matchQ && matchS
  })

  const hayAlerta = pedidos.some(p => p.estado === 'Pendiente' && !p.vehiculo_id)

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
            <div className="brand-sub">Gestión de Pedidos</div>
          </div>
        </div>
        <Nav />
      </div>

      <div className="body-wrap">
        {/* LEFT */}
        <div className="left-main">
          <div className="page-hd">
            <div>
              <div className="page-ttl">Pedidos de entrega</div>
              <div className="page-sub">Seguimiento y asignación de pedidos · Mayo 2026</div>
            </div>
            <button className="btn-new" onClick={() => { setFormNuevo(EMPTY_FORM); setProductos([EMPTY_PROD()]); setErrorNuevo(''); setModalNuevo(true) }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2 L8 14 M2 8 L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Nuevo pedido
            </button>
          </div>

          {hayAlerta && (
            <div className="alert-bar">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M8 1 L15 14 H1 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <line x1="8" y1="6" x2="8" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="8" cy="12" r="0.7" fill="currentColor" />
              </svg>
              Hay pedidos pendientes sin vehículo asignado.
            </div>
          )}

          <div className="filter-row">
            <div className="srch-wrap">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="#94A3B8" strokeWidth="1.4" />
                <path d="M10 10 L13.5 13.5" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input placeholder="Buscar por cliente o destino..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="sel-wrap">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Pendiente</option>
                <option>En ruta</option>
                <option>Entregado</option>
              </select>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4 L6 8 L10 4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Destino</th>
                  <th>Peso</th>
                  <th>Camión</th>
                  <th>Estado</th>
                  <th>Entrega est.</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const v = p.vehiculo_id
                  const vPct = v && v.capacidad_kg ? Math.round(((v.carga_actual || p.peso_total_kg || 0) / v.capacidad_kg) * 100) : 0
                  return (
                    <tr key={p._id}>
                      <td><div className="td-num">#{p._id.slice(-6).toUpperCase()}</div></td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.cliente_nombre || '—'}</div>
                        {p.prioridad && p.prioridad !== 'Normal' && <div style={{ fontSize: 11, color: 'var(--ad)' }}>{p.prioridad}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>{p.destino || '—'}</td>
                      <td style={{ fontSize: 13 }}>{p.peso_total_kg ? `${p.peso_total_kg} kg` : '—'}</td>
                      <td>
                        {v ? (
                          <div className="camion-cell">
                            <div className="camion-pat">{v.patente}</div>
                            {v.capacidad_kg && (
                              <div className="cap-wrap" style={{ minWidth: 90 }}>
                                <div className="cap-bar">
                                  <div className={`cap-fill ${vPct >= 90 ? 'cf-dan' : vPct >= 70 ? 'cf-war' : 'cf-ok'}`} style={{ width: `${Math.min(vPct, 100)}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="no-asig">Sin asignar</span>
                        )}
                      </td>
                      <td>{estadoPill(p.estado)}</td>
                      <td style={{ fontSize: 12, color: 'var(--g400)' }}>{formatFecha(p.fecha_entrega_estimada)}</td>
                      <td>
                        <div className="acts">
                          {p.estado === 'Pendiente' && !p.vehiculo_id && (
                            <button className="btn-asig" onClick={() => openAsignar(p)}>Asignar</button>
                          )}
                          <button className="btn-eye" title="Ver detalle" onClick={() => { setDetalle(p); setModalDetalle(true) }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtrados.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--g400)', padding: 32 }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="rp-pill"><span className="rp-sdot" />Sistema en línea</div>
          <div>
            <div className="rp-title">Pedidos</div>
            <div className="rp-sub">Resumen de órdenes activas</div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="sc-lbl">Total</div>
              <div className="sc-val">{stats.total}</div>
              <div className="sc-tag">pedidos</div>
            </div>
            <div className="stat-card">
              <div className="sc-lbl">Pendientes</div>
              <div className="sc-val">{stats.pendientes}</div>
              <div className="sc-tag">sin asignar</div>
            </div>
            <div className="stat-card">
              <div className="sc-lbl">En ruta</div>
              <div className="sc-val">{stats.en_ruta}</div>
              <div className="sc-tag">en tránsito</div>
            </div>
            <div className="stat-card">
              <div className="sc-lbl">Entregados</div>
              <div className="sc-val">{stats.entregados}</div>
              <div className="sc-tag">completados</div>
            </div>
          </div>

          <div className="rp-sep" />
          <div className="rp-lbl">Filtrar por estado</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="filter-btn" onClick={() => setStatusFilter('Pendiente')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'var(--bm)' }} />Pendientes</div>
              <span className="fb-badge">{stats.pendientes}</span>
            </button>
            <button className="filter-btn" onClick={() => setStatusFilter('En ruta')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'var(--am)' }} />En ruta</div>
              <span className="fb-badge">{stats.en_ruta}</span>
            </button>
            <button className="filter-btn" onClick={() => setStatusFilter('Entregado')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: '#4ADE80' }} />Entregados</div>
              <span className="fb-badge">{stats.entregados}</span>
            </button>
            <button className="filter-btn" onClick={() => setStatusFilter('')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'rgba(255,255,255,.3)' }} />Todos</div>
            </button>
          </div>
          <button className="help-btn">?</button>
        </div>
      </div>

      {/* ═══ MODAL NUEVO PEDIDO ═══ */}
      <div className={`overlay${modalNuevo ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalNuevo(false)}>
        <div className="modal" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-head">
            <span className="modal-ttl">Nuevo pedido</span>
            <button className="modal-close" onClick={() => setModalNuevo(false)}>✕</button>
          </div>
          <div className="modal-body" style={{ overflowY: 'auto' }}>
            <div className="m-grid">
              <div className="m-full">
                <label className="flbl">Cliente *</label>
                <input className="finput" placeholder="Nombre del cliente" value={formNuevo.cliente_nombre} onChange={e => setFormNuevo(f => ({ ...f, cliente_nombre: e.target.value }))} />
              </div>
              <div className="m-full">
                <label className="flbl">Destino *</label>
                <input className="finput" placeholder="Ciudad o dirección de destino" value={formNuevo.destino} onChange={e => setFormNuevo(f => ({ ...f, destino: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Fecha de entrega estimada</label>
                <input className="finput" type="date" value={formNuevo.fecha_entrega_estimada} onChange={e => setFormNuevo(f => ({ ...f, fecha_entrega_estimada: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Prioridad</label>
                <select className="finput" value={formNuevo.prioridad} onChange={e => setFormNuevo(f => ({ ...f, prioridad: e.target.value }))}>
                  <option>Normal</option>
                  <option>Alta</option>
                  <option>Urgente</option>
                </select>
              </div>
              <div className="m-full">
                <label className="flbl">Vehículo (opcional)</label>
                <select className="finput" value={formNuevo.vehiculo_id} onChange={e => setFormNuevo(f => ({ ...f, vehiculo_id: e.target.value }))}>
                  <option value="">Sin asignar (Pendiente)</option>
                  {vehiculos.filter(v => v.estado === 'Disponible').map(v => (
                    <option key={v._id} value={v._id}>{v.patente} — {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="m-sep" />
            <div className="m-sub">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M5 7 L9 7 M7 5 L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
              Productos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {productos.map((pr, i) => (
                <div className="prod-row" key={i}>
                  <input className="finput" placeholder="Descripción" value={pr.descripcion} onChange={e => updateProducto(i, 'descripcion', e.target.value)} style={{ flex: 3 }} />
                  <input className="finput" type="number" placeholder="Cant." value={pr.cantidad} onChange={e => updateProducto(i, 'cantidad', e.target.value)} style={{ flex: 1 }} />
                  <input className="finput" type="number" placeholder="Kg/u" value={pr.peso_unitario_kg} onChange={e => updateProducto(i, 'peso_unitario_kg', e.target.value)} style={{ flex: 1 }} />
                  <button className="btn-del" onClick={() => removeProducto(i)}>×</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="btn-add-prod" onClick={addProducto}>+ Agregar producto</button>
                <div className="peso-sum">Peso total: <strong>{totalPeso.toFixed(1)} kg</strong></div>
              </div>
            </div>
            {errorNuevo && <div style={{ fontSize: 12, color: 'var(--re)', background: '#FFF0F0', padding: '8px 12px', borderRadius: 8, border: '1px solid #f5c0c0' }}>{errorNuevo}</div>}
          </div>
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalNuevo(false)}>Cancelar</button>
            <button className="btnok" onClick={submitNuevo}>Crear pedido</button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL ASIGNAR ═══ */}
      <div className={`overlay${modalAsignar ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalAsignar(false)}>
        <div className="modal" style={{ width: 460 }}>
          <div className="modal-head">
            <span className="modal-ttl">Asignar vehículo · #{asignarTarget.pedido?._id.slice(-6).toUpperCase()}</span>
            <button className="modal-close" onClick={() => setModalAsignar(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div>
              <label className="flbl">Seleccionar vehículo disponible</label>
              <select className="finput" value={asignarTarget.vehiculoId} onChange={e => setAsignarTarget(t => ({ ...t, vehiculoId: e.target.value }))}>
                <option value="">— Elegir vehículo —</option>
                {vehiculos.filter(v => v.estado === 'Disponible').map(v => (
                  <option key={v._id} value={v._id}>{v.patente} — {v.conductor_asignado || 'Sin conductor'} ({v.capacidad_kg ? `${v.capacidad_kg} kg` : 'Cap. desconocida'})</option>
                ))}
              </select>
            </div>
            {asignarVehiculo && (
              <div style={{ background: 'var(--bp)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--bd)' }}>
                <div style={{ marginBottom: 8 }}>
                  Capacidad tras asignación: <strong>{asignarPct}%</strong>
                  {asignarPct > 100 && <span style={{ color: 'var(--re)', marginLeft: 6 }}>⚠ Excede la capacidad</span>}
                </div>
                <div className="cap-bar-lg">
                  <div className="cap-fill-lg" style={{ width: `${Math.min(asignarPct, 100)}%`, background: asignarPct >= 90 ? 'var(--re)' : asignarPct >= 70 ? 'var(--am)' : 'var(--bm)' }} />
                </div>
                <div style={{ color: 'var(--g400)', marginTop: 4 }}>
                  {asignarVehiculo.carga_actual || 0} kg actuales + {asignarTarget.pedido?.peso_total_kg || 0} kg pedido = {(asignarVehiculo.carga_actual || 0) + (asignarTarget.pedido?.peso_total_kg || 0)} kg / {asignarVehiculo.capacidad_kg} kg
                </div>
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalAsignar(false)}>Cancelar</button>
            <button className="btnok" onClick={submitAsignar} disabled={!asignarTarget.vehiculoId}>Confirmar asignación</button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL DETALLE ═══ */}
      <div className={`overlay${modalDetalle ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setModalDetalle(false)}>
        <div className="modal">
          <div className="modal-head">
            <span className="modal-ttl">Detalle pedido · {detalle && `#${detalle._id.slice(-6).toUpperCase()}`}</span>
            <button className="modal-close" onClick={() => setModalDetalle(false)}>✕</button>
          </div>
          {detalle && (
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { k: 'Cliente', v: detalle.cliente_nombre || '—' },
                  { k: 'Destino', v: detalle.destino || '—' },
                  { k: 'Peso total', v: detalle.peso_total_kg ? `${detalle.peso_total_kg} kg` : '—' },
                  { k: 'Estado', v: estadoPill(detalle.estado) }
                ].map(({ k, v }) => (
                  <div key={k} style={{ background: 'var(--g50)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--g400)', marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="m-sep" />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Info adicional</div>
              <div className="detail-section">
                <div className="detail-row"><span className="dr-k">Vehículo asignado</span><span className="dr-v">{detalle.vehiculo_id?.patente || 'Sin asignar'}</span></div>
                <div className="detail-row"><span className="dr-k">Conductor</span><span className="dr-v">{detalle.vehiculo_id?.conductor_asignado || '—'}</span></div>
                <div className="detail-row"><span className="dr-k">Prioridad</span><span className="dr-v">{detalle.prioridad || 'Normal'}</span></div>
                <div className="detail-row"><span className="dr-k">Entrega estimada</span><span className="dr-v">{formatFecha(detalle.fecha_entrega_estimada)}</span></div>
                <div className="detail-row"><span className="dr-k">Fecha de creación</span><span className="dr-v">{formatFecha(detalle.fecha_creacion)}</span></div>
              </div>
              <div className="m-sep" />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { step: 'Pedido creado', done: true },
                  { step: 'Vehículo asignado', done: !!detalle.vehiculo_id },
                  { step: 'En tránsito', done: detalle.estado === 'En ruta' || detalle.estado === 'Entregado' },
                  { step: 'Entregado', done: detalle.estado === 'Entregado' }
                ].map(({ step, done }) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: done ? '#D1F0E1' : 'var(--g200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {done
                        ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5 L4 7 L8 3" stroke="#1C6B3A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--g400)' }} />}
                    </div>
                    <span style={{ color: done ? 'var(--tx)' : 'var(--g400)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="modal-foot">
            <button className="btnc" onClick={() => setModalDetalle(false)}>Cerrar</button>
          </div>
        </div>
      </div>
    </>
  )
}
