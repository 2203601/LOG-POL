import { useState, useEffect, useCallback } from 'react'
import Nav from './Nav'
import { apiFetch, BASE_URL } from './api'
import './Seguimiento.css'

const API  = `${BASE_URL}/api/seguimiento`

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function tiempoEnRuta(hs) {
  if (hs < 1)  return 'Menos de 1 hora'
  if (hs < 24) return `${hs}h en ruta`
  const dias = Math.floor(hs / 24)
  const resHs = hs % 24
  return resHs > 0 ? `${dias}d ${resHs}h en ruta` : `${dias}d en ruta`
}

function AlertaBadge({ alerta }) {
  if (alerta === 'retrasado') return <span className="badge b-ret">Retrasado</span>
  if (alerta === 'urgente')   return <span className="badge b-urg">Urgente</span>
  if (alerta === 'en-tiempo') return <span className="badge b-ok">En tiempo</span>
  return <span className="badge b-nd">Sin fecha</span>
}

function PrioridadBadge({ prioridad }) {
  if (prioridad === 'Urgente') return <span className="badge b-ret">{prioridad}</span>
  if (prioridad === 'Alta')    return <span className="badge b-urg">{prioridad}</span>
  return null
}

export default function Seguimiento() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esLogistica = usuario.tipo_usuario === 'Encargado de logística'

  const [vista, setVista]       = useState('en-ruta')
  const [pedidos, setPedidos]   = useState([])
  const [stats, setStats]       = useState({ en_ruta: 0, entregados_hoy: 0, retrasados: 0, urgentes: 0 })
  const [search, setSearch]     = useState('')
  const [alertaFilter, setAlertaFilter] = useState('')
  const [detalle, setDetalle]   = useState(null)
  const [confirmando, setConfirmando] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [entregando, setEntregando] = useState(null)
  const [toast, setToast]       = useState(null)

  const fetchTodo = useCallback(async () => {
    setLoading(true)
    try {
      const estado = vista === 'en-ruta' ? 'En ruta' : 'Entregado'
      const [rPedidos, rStats] = await Promise.all([
        apiFetch(`${API}?estado=${encodeURIComponent(estado)}`),
        apiFetch(`${API}/stats`)
      ])
      const dPedidos = await rPedidos.json()
      const dStats   = await rStats.json()
      setPedidos(Array.isArray(dPedidos) ? dPedidos : [])
      setStats(dStats)
    } finally {
      setLoading(false)
    }
  }, [vista])

  useEffect(() => {
    fetchTodo()
    const id = setInterval(fetchTodo, 60_000)
    return () => clearInterval(id)
  }, [fetchTodo])

  function showToast(msg, tipo = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  async function marcarEntregado(pedidoId) {
    setEntregando(pedidoId)
    try {
      const res = await apiFetch(`${API}/${pedidoId}/entregar`, { method: 'PUT' })
      if (res.ok) {
        showToast('Entrega registrada correctamente')
        setConfirmando(null)
        setDetalle(null)
        await fetchTodo()
      } else {
        const d = await res.json()
        showToast(d.mensaje || 'Error al registrar entrega', 'err')
      }
    } finally {
      setEntregando(null)
    }
  }

  const filtrados = pedidos.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.cliente_nombre?.toLowerCase().includes(q) ||
                   p.destino?.toLowerCase().includes(q) ||
                   p.vehiculo_id?.patente?.toLowerCase().includes(q) ||
                   p.vehiculo_id?.conductor_asignado?.toLowerCase().includes(q)
    const matchA = !alertaFilter || p.alerta === alertaFilter
    return matchQ && matchA
  })

  const retrasados = pedidos.filter(p => p.alerta === 'retrasado').length
  const urgentes   = pedidos.filter(p => p.alerta === 'urgente').length

  return (
    <>
      {/* HEADER */}
      <div className="header">
        <div className="brand">
          <div className="brand-icon" style={{ background: '#3B82F6' }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="1" y="9" width="18" height="11" rx="2.5" fill="white" />
              <circle cx="6"  cy="20" r="3" fill="white" />
              <circle cx="17" cy="20" r="3" fill="white" />
              <rect x="14" y="4" width="11" height="8" rx="2" fill="rgba(255,255,255,.75)" />
              <path d="M25 9 L25 14 Q25 16 23 16 L19 16" stroke="white" strokeWidth="1.2" />
            </svg>
            <div className="online-dot" />
          </div>
          <div>
            <div className="brand-name">Log-Pol</div>
            <div className="brand-sub">Seguimiento de entregas</div>
          </div>
        </div>
        <Nav />
      </div>

      <div className="body-wrap">
        {/* LEFT */}
        <div className="left-main">

          <div className="page-hd">
            <div>
              <div className="page-ttl">Seguimiento de entregas</div>
              <div className="page-sub">
                {loading ? 'Cargando...' : vista === 'en-ruta'
                  ? `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} en ruta · actualiza cada 60s`
                  : `${pedidos.length} entrega${pedidos.length !== 1 ? 's' : ''} registrada${pedidos.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="seg-tabs">
                <button className={`seg-tab${vista === 'en-ruta' ? ' on' : ''}`} onClick={() => { setVista('en-ruta'); setAlertaFilter(''); setSearch('') }}>
                  En ruta
                  {stats.en_ruta > 0 && <span className="seg-tab-count">{stats.en_ruta}</span>}
                </button>
                <button className={`seg-tab${vista === 'entregados' ? ' on' : ''}`} onClick={() => { setVista('entregados'); setAlertaFilter(''); setSearch('') }}>
                  Entregados
                  {stats.entregados_hoy > 0 && <span className="seg-tab-count">{stats.entregados_hoy}</span>}
                </button>
              </div>
              <button className="btn-refresh" onClick={fetchTodo} title="Actualizar">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M13 7.5A5.5 5.5 0 1 1 7.5 2H10M10 2L8 4.5M10 2L12.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>

          {/* ALERTS STRIP */}
          {vista === 'en-ruta' && (retrasados > 0 || urgentes > 0) && (
            <div className="alert-strip">
              {retrasados > 0 && (
                <div className="alert-item a-red">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1 L13.5 13 H0.5 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <line x1="7" y1="5.5" x2="7" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="7" cy="11" r="0.7" fill="currentColor" />
                  </svg>
                  <strong>{retrasados}</strong> pedido{retrasados > 1 ? 's' : ''} fuera de plazo
                </div>
              )}
              {urgentes > 0 && (
                <div className="alert-item a-amber">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                    <line x1="7" y1="4.5" x2="7" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="7" cy="9.5" r="0.7" fill="currentColor" />
                  </svg>
                  <strong>{urgentes}</strong> pedido{urgentes > 1 ? 's' : ''} con entrega en menos de 24h
                </div>
              )}
            </div>
          )}

          {/* FILTERS */}
          <div className="filter-row">
            <div className="srch-wrap">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="#94A3B8" strokeWidth="1.4" />
                <path d="M10 10 L13.5 13.5" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Buscar cliente, destino, patente, conductor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {vista === 'en-ruta' && (
              <div className="seg-tabs">
                {[
                  { val: '',           label: 'Todos',      count: pedidos.length },
                  { val: 'retrasado',  label: 'Retrasados', count: retrasados },
                  { val: 'urgente',    label: 'Urgentes',   count: urgentes },
                  { val: 'en-tiempo',  label: 'En tiempo',  count: pedidos.filter(p => p.alerta === 'en-tiempo').length },
                ].map(t => (
                  <button
                    key={t.val}
                    className={`seg-tab${alertaFilter === t.val ? ' on' : ''}`}
                    onClick={() => setAlertaFilter(t.val)}
                  >
                    {t.label}
                    {t.count > 0 && <span className="seg-tab-count">{t.count}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CARDS */}
          {loading ? (
            <div className="seg-empty">
              <div className="seg-empty-ico">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="#CBD5E1" strokeWidth="2" />
                  <path d="M16 10 L16 16 L20 20" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              Cargando pedidos...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="seg-empty">
              <div className="seg-empty-ico">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect x="3" y="16" width="26" height="13" rx="3" stroke="#CBD5E1" strokeWidth="2" />
                  <circle cx="9"  cy="29" r="4" stroke="#CBD5E1" strokeWidth="2" />
                  <circle cx="23" cy="29" r="4" stroke="#CBD5E1" strokeWidth="2" />
                  <rect x="3" y="7" width="16" height="10" rx="2" stroke="#CBD5E1" strokeWidth="2" />
                </svg>
              </div>
              {pedidos.length === 0
                ? 'No hay pedidos en ruta en este momento'
                : 'Ningún pedido coincide con los filtros'}
            </div>
          ) : (
            <div className="cards-list">
              {filtrados.map(p => {
                const v = p.vehiculo_id
                const alertaCls = p.alerta === 'retrasado' ? 'card-red' : p.alerta === 'urgente' ? 'card-amber' : 'card-ok'
                return (
                  <div className={`seg-card ${alertaCls}`} key={p._id}>
                    {/* TOP ROW */}
                    <div className="sc-top">
                      <div className="sc-id">#{p._id.slice(-6).toUpperCase()}</div>
                      <div className="sc-badges">
                        <AlertaBadge alerta={p.alerta} />
                        <PrioridadBadge prioridad={p.prioridad} />
                      </div>
                      <div className="sc-tiempo">{tiempoEnRuta(p.tiempo_en_ruta_hs)}</div>
                    </div>

                    {/* MAIN INFO */}
                    <div className="sc-main">
                      <div className="sc-cliente">{p.cliente_nombre || '—'}</div>
                      <div className="sc-destino">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M6 1 C3.2 1 1 3.2 1 6 C1 9 6 11.5 6 11.5 C6 11.5 11 9 11 6 C11 3.2 8.8 1 6 1Z" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                        {p.destino || '—'}
                      </div>
                    </div>

                    {/* DETAILS GRID */}
                    <div className="sc-details">
                      <div className="scd-item">
                        <div className="scd-lbl">Vehículo</div>
                        <div className="scd-val">{v?.patente || '—'}</div>
                        <div className="scd-sub">{v?.marca} {v?.modelo}</div>
                      </div>
                      <div className="scd-item">
                        <div className="scd-lbl">Conductor</div>
                        <div className="scd-val">{v?.conductor_asignado || '—'}</div>
                        {v?.conductor_dni && <div className="scd-sub">DNI {v.conductor_dni}</div>}
                      </div>
                      <div className="scd-item">
                        <div className="scd-lbl">Peso</div>
                        <div className="scd-val">{p.peso_total_kg ? `${p.peso_total_kg} kg` : '—'}</div>
                        {p.productos?.length > 0 && <div className="scd-sub">{p.productos.length} producto{p.productos.length > 1 ? 's' : ''}</div>}
                      </div>
                      {vista === 'en-ruta' ? (
                        <div className="scd-item">
                          <div className="scd-lbl">Entrega estimada</div>
                          <div className={`scd-val${p.alerta === 'retrasado' ? ' txt-red' : p.alerta === 'urgente' ? ' txt-amber' : ''}`}>
                            {formatFecha(p.fecha_entrega_estimada)}
                          </div>
                          {p.fecha_entrega_estimada && <div className="scd-sub">{formatHora(p.fecha_entrega_estimada)} hs</div>}
                        </div>
                      ) : (
                        <div className="scd-item">
                          <div className="scd-lbl">Entregado el</div>
                          <div className="scd-val" style={{ color: '#15803D' }}>
                            {p.entrega?.fecha_entrega ? formatFecha(p.entrega.fecha_entrega) : formatFecha(p.updatedAt)}
                          </div>
                          {(p.entrega?.fecha_entrega || p.updatedAt) && (
                            <div className="scd-sub">{formatHora(p.entrega?.fecha_entrega || p.updatedAt)} hs</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="sc-actions">
                      <button className="btn-detalle" onClick={() => setDetalle(p)}>
                        Ver detalle
                      </button>
                      {vista === 'en-ruta' && !esLogistica && (
                        <button
                          className="btn-entregar"
                          onClick={() => setConfirmando(p)}
                          disabled={entregando === p._id}
                        >
                          {entregando === p._id ? 'Registrando...' : '✓ Marcar entregado'}
                        </button>
                      )}
                      {vista === 'entregados' && (
                        <span className="badge b-ok" style={{ padding: '6px 14px', fontSize: 12 }}>✓ Entregado</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="rp-pill"><span className="rp-sdot" />En vivo</div>
          <div>
            <div className="rp-title">Seguimiento</div>
            <div className="rp-sub">Estado de entregas activas</div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="sc-lbl">En ruta</div>
              <div className="sc-val">{stats.en_ruta}</div>
              <div className="sc-tag">pedidos activos</div>
            </div>
            <div className="stat-card">
              <div className="sc-lbl">Entregados hoy</div>
              <div className="sc-val">{stats.entregados_hoy}</div>
              <div className="sc-tag">completados</div>
            </div>
            <div className="stat-card" style={{ background: stats.retrasados > 0 ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.08)' }}>
              <div className="sc-lbl">Retrasados</div>
              <div className="sc-val" style={{ color: stats.retrasados > 0 ? '#FCA5A5' : '#fff' }}>{stats.retrasados}</div>
              <div className="sc-tag">fuera de plazo</div>
            </div>
            <div className="stat-card" style={{ background: stats.urgentes > 0 ? 'rgba(245,158,11,.2)' : 'rgba(255,255,255,.08)' }}>
              <div className="sc-lbl">Urgentes</div>
              <div className="sc-val" style={{ color: stats.urgentes > 0 ? '#FCD34D' : '#fff' }}>{stats.urgentes}</div>
              <div className="sc-tag">en menos de 24h</div>
            </div>
          </div>

          <div className="rp-sep" />
          <div className="rp-lbl">Filtrar por estado</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="filter-btn" onClick={() => setAlertaFilter('retrasado')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: '#EF4444' }} />Retrasados</div>
              <span className="fb-badge" style={{ background: '#EF4444', color: '#fff' }}>{retrasados}</span>
            </button>
            <button className="filter-btn" onClick={() => setAlertaFilter('urgente')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'var(--am)' }} />Urgentes</div>
              <span className="fb-badge">{urgentes}</span>
            </button>
            <button className="filter-btn" onClick={() => setAlertaFilter('en-tiempo')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: '#4ADE80' }} />En tiempo</div>
              <span className="fb-badge" style={{ background: '#4ADE80', color: '#14532D' }}>
                {pedidos.filter(p => p.alerta === 'en-tiempo').length}
              </span>
            </button>
            <button className="filter-btn" onClick={() => setAlertaFilter('')}>
              <div className="filter-btn-left"><span className="fbdot" style={{ background: 'rgba(255,255,255,.3)' }} />Todos</div>
            </button>
          </div>

          <button className="help-btn">?</button>
        </div>
      </div>

      {/* ═══ MODAL DETALLE ═══ */}
      <div className={`overlay${detalle ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setDetalle(null)}>
        <div className="modal" style={{ width: 520 }}>
          <div className="modal-head">
            <span className="modal-ttl">
              Detalle · #{detalle?._id.slice(-6).toUpperCase()}
            </span>
            <button className="modal-close" onClick={() => setDetalle(null)}>✕</button>
          </div>
          {detalle && (
            <div className="modal-body">
              <div className="det-badges">
                <AlertaBadge alerta={detalle.alerta} />
                {detalle.prioridad && detalle.prioridad !== 'Normal' && (
                  <PrioridadBadge prioridad={detalle.prioridad} />
                )}
              </div>

              <div className="det-grid">
                {[
                  { k: 'Cliente',     v: detalle.cliente_nombre || '—' },
                  { k: 'Destino',     v: detalle.destino || '—' },
                  { k: 'Peso total',  v: detalle.peso_total_kg ? `${detalle.peso_total_kg} kg` : '—' },
                  { k: 'En ruta',     v: tiempoEnRuta(detalle.tiempo_en_ruta_hs) },
                  { k: 'Vehículo',    v: detalle.vehiculo_id?.patente || '—' },
                  { k: 'Conductor',   v: detalle.vehiculo_id?.conductor_asignado || '—' },
                  { k: 'Entrega est.',v: detalle.fecha_entrega_estimada ? `${formatFecha(detalle.fecha_entrega_estimada)} ${formatHora(detalle.fecha_entrega_estimada)} hs` : '—' },
                  { k: 'Prioridad',   v: detalle.prioridad || 'Normal' },
                ].map(({ k, v }) => (
                  <div key={k} className="det-item">
                    <div className="det-k">{k}</div>
                    <div className="det-v">{v}</div>
                  </div>
                ))}
              </div>

              {detalle.productos?.length > 0 && (
                <>
                  <div className="m-sep" />
                  <div className="m-sub">Productos ({detalle.productos.length})</div>
                  <div className="prod-list">
                    {detalle.productos.map((pr, i) => (
                      <div key={i} className="prod-item-det">
                        <span className="pi-desc">{pr.descripcion}</span>
                        <span className="pi-cant">{pr.cantidad} u.</span>
                        <span className="pi-peso">{pr.peso_unitario_kg ? `${pr.peso_unitario_kg} kg/u` : '—'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="m-sep" />
              <div className="m-sub">Timeline</div>
              <div className="timeline">
                {[
                  { label: 'Pedido creado',      done: true,                             fecha: detalle.fecha_creacion },
                  { label: 'Vehículo asignado',  done: !!detalle.vehiculo_id,            fecha: null },
                  { label: 'En tránsito',        done: detalle.estado === 'En ruta',     fecha: null },
                  { label: 'Entregado',          done: detalle.estado === 'Entregado',   fecha: null },
                ].map(({ label, done, fecha }) => (
                  <div key={label} className="tl-row">
                    <div className={`tl-dot${done ? ' done' : ''}`}>
                      {done && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4 L3 5.5 L6.5 2.5" stroke="#1C6B3A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="tl-content">
                      <span className={`tl-label${done ? ' tl-done' : ''}`}>{label}</span>
                      {fecha && <span className="tl-fecha">{formatFecha(fecha)} {formatHora(fecha)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="modal-foot">
            <button className="btnc" onClick={() => setDetalle(null)}>Cerrar</button>
            {detalle && detalle.estado !== 'Entregado' && !esLogistica && (
              <button
                className="btnok"
                style={{ background: '#22C55E', color: '#fff' }}
                onClick={() => { setDetalle(null); setConfirmando(detalle) }}
              >
                Marcar entregado
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MODAL CONFIRMAR ENTREGA ═══ */}
      <div className={`overlay${confirmando ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setConfirmando(null)}>
        <div className="modal" style={{ width: 420 }}>
          <div className="modal-head">
            <span className="modal-ttl">Confirmar entrega</span>
            <button className="modal-close" onClick={() => setConfirmando(null)}>✕</button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px' }}>
            <div style={{ width: 56, height: 56, background: '#D1F0E1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M4 13 L10 19 L22 7" stroke="#1C6B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              ¿Confirmar entrega del pedido #{confirmando?._id.slice(-6).toUpperCase()}?
            </div>
            <div style={{ fontSize: 13, color: 'var(--g400)', lineHeight: 1.5, maxWidth: 300, margin: '0 auto' }}>
              <strong>{confirmando?.cliente_nombre}</strong> — {confirmando?.destino}
            </div>
            <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 8 }}>
              Esta acción no se puede deshacer.
            </div>
          </div>
          <div className="modal-foot">
            <button className="btnc" onClick={() => setConfirmando(null)}>Cancelar</button>
            <button
              className="btnok"
              style={{ background: '#22C55E', color: '#fff' }}
              onClick={() => marcarEntregado(confirmando._id)}
              disabled={entregando === confirmando?._id}
            >
              {entregando === confirmando?._id ? 'Registrando...' : 'Confirmar entrega'}
            </button>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`toast${toast.tipo === 'err' ? ' toast-err' : ''}`}>
          {toast.tipo !== 'err'
            ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8 L6.5 11.5 L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          }
          {toast.msg}
        </div>
      )}
    </>
  )
}
