import { useState, useEffect } from 'react'
import Nav from './Nav'
import { apiFetch, BASE_URL } from './api'
import './Reportes.css'

const API = `${BASE_URL}/api/reportes`

const TIPOS = [
  {
    id: 'pedidos',
    label: 'Pedidos',
    desc: 'Todos los pedidos del período con estado, cliente, destino y vehículo asignado',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="2" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7h8M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'entregas',
    label: 'Entregas',
    desc: 'Pedidos entregados con fecha, conductor y cumplimiento de plazos',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 11 L9 16 L18 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'vehiculos',
    label: 'Vehículos',
    desc: 'Utilización de flota: pedidos, peso transportado y estado por vehículo',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="1" y="9" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="5"  cy="17" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M17 13h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="4" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    id: 'rendimiento',
    label: 'Rendimiento',
    desc: 'Métricas por conductor: pedidos asignados, entregados y tasa de cumplimiento',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 17 L7 11 L11 14 L16 7 L19 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
]

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function descargarPDF(base64, nombre) {
  const bytes  = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reportes() {
  const [historial, setHistorial]     = useState([])
  const [stats, setStats]             = useState({ total: 0, hoy: 0 })
  const [tipo, setTipo]               = useState('pedidos')
  const [fechaDesde, setFechaDesde]   = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [fechaHasta, setFechaHasta]   = useState(new Date().toISOString().slice(0, 10))
  const [generando, setGenerando]     = useState(false)
  const [resultado, setResultado]     = useState(null)
  const [error, setError]             = useState('')

  useEffect(() => { fetchHistorial() }, [])

  async function fetchHistorial() {
    const [rH, rS] = await Promise.all([apiFetch(API), apiFetch(`${API}/stats`)])
    const dH = await rH.json(); const dS = await rS.json()
    setHistorial(Array.isArray(dH) ? dH : [])
    setStats(dS)
  }

  async function handleGenerar() {
    setError(''); setResultado(null); setGenerando(true)
    try {
      const res = await apiFetch(`${API}/generar`, {
        method: 'POST',
        body: JSON.stringify({ tipo, fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.mensaje || 'Error al generar'); return }
      setResultado(data)
      fetchHistorial()
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setGenerando(false)
    }
  }

  const tipoSeleccionado = TIPOS.find(t => t.id === tipo)

  return (
    <>
      {/* HEADER */}
      <div className="header">
        <div className="brand">
          <div className="brand-icon" style={{ background: '#8B5CF6' }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="3" y="2" width="20" height="22" rx="3" fill="white" opacity=".9" />
              <path d="M7 8h12M7 12h12M7 16h8" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="20" cy="20" r="5" fill="#8B5CF6" />
              <path d="M17.5 20 L19.5 22 L22.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="online-dot" />
          </div>
          <div>
            <div className="brand-name">Log-Pol</div>
            <div className="brand-sub">Reportes y exportaciones</div>
          </div>
        </div>
        <Nav />
      </div>

      <div className="body-wrap">
        {/* LEFT */}
        <div className="left-main">
          <div className="page-hd">
            <div>
              <div className="page-ttl">Generador de reportes</div>
              <div className="page-sub">Exportá datos del sistema en formato CSV</div>
            </div>
          </div>

          {/* TIPO */}
          <div className="rep-section-lbl">Tipo de reporte</div>
          <div className="tipo-grid">
            {TIPOS.map(t => (
              <button
                key={t.id}
                className={`tipo-card${tipo === t.id ? ' on' : ''}`}
                onClick={() => { setTipo(t.id); setResultado(null); setError('') }}
              >
                <div className={`tipo-icon${tipo === t.id ? ' on' : ''}`}>{t.icon}</div>
                <div className="tipo-label">{t.label}</div>
                <div className="tipo-desc">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* RANGO DE FECHAS */}
          <div className="rep-section-lbl">Período</div>
          <div className="fecha-row">
            <div className="fecha-item">
              <label className="flbl">Desde</label>
              <input className="finput" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            </div>
            <div className="fecha-sep">→</div>
            <div className="fecha-item">
              <label className="flbl">Hasta</label>
              <input className="finput" type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </div>
            <button className="btn-generar" onClick={handleGenerar} disabled={generando}>
              {generando ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 18" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 2 L7.5 10 M4 7 L7.5 10.5 L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12 L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Generar y descargar
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rep-error">{error}</div>
          )}

          {/* RESULTADO */}
          {resultado && (
            <div className="resultado-box">
              <div className="res-left">
                <div className="res-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12 L9 17 L20 6" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="res-title">Reporte generado</div>
                  <div className="res-sub">
                    {resultado.label} · {resultado.filas} fila{resultado.filas !== 1 ? 's' : ''} · {fechaDesde} al {fechaHasta}
                  </div>
                </div>
              </div>
              <button
                className="btn-download"
                onClick={() => descargarPDF(resultado.pdf, `reporte_${tipo}_${fechaDesde}_${fechaHasta}.pdf`)}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 2 L7.5 10 M4 7 L7.5 10.5 L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12 L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Descargar PDF
              </button>
            </div>
          )}

          {/* HISTORIAL */}
          <div className="rep-section-lbl" style={{ marginTop: 8 }}>Historial de reportes</div>
          {historial.length === 0 ? (
            <div className="rep-empty">Todavía no se generó ningún reporte</div>
          ) : (
            <div className="hist-table">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Período</th>
                    <th>Formato</th>
                    <th>Generado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(r => (
                    <tr key={r._id}>
                      <td>
                        <span className="hist-tipo">{r.tipo}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--g400)' }}>
                        {r.fecha_desde ? fmtFecha(r.fecha_desde) : '—'} → {r.fecha_hasta ? fmtFecha(r.fecha_hasta) : '—'}
                      </td>
                      <td>
                        <span className="hist-fmt">{r.formato || 'CSV'}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--g400)' }}>
                        {fmtFecha(r.generado_en)} {fmtHora(r.generado_en)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="rp-pill"><span className="rp-sdot" />Exportaciones</div>
          <div>
            <div className="rp-title">Reportes</div>
            <div className="rp-sub">Datos exportables del sistema</div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="sc-lbl">Total generados</div>
              <div className="sc-val">{stats.total}</div>
              <div className="sc-tag">reportes</div>
            </div>
            <div className="stat-card">
              <div className="sc-lbl">Hoy</div>
              <div className="sc-val">{stats.hoy}</div>
              <div className="sc-tag">generados hoy</div>
            </div>
          </div>

          <div className="rp-sep" />
          <div className="rp-lbl">Tipo seleccionado</div>
          <div className="rp-selected">
            <div className="rps-icon">{tipoSeleccionado?.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{tipoSeleccionado?.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4, lineHeight: 1.4 }}>
                {tipoSeleccionado?.desc}
              </div>
            </div>
          </div>

          <div className="rp-sep" />
          <div className="rp-lbl">Formatos disponibles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="fmt-row">
              <span className="fmt-badge fmt-pdf">PDF</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Listo para imprimir y compartir</span>
            </div>
          </div>

          <div className="rp-sep" />
          <div className="rp-lbl">Instrucciones</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
            1. Elegí el tipo de reporte<br />
            2. Seleccioná el período<br />
            3. Hacé clic en "Generar y descargar"<br />
            4. El archivo se descarga automáticamente
          </div>

          <button className="help-btn">?</button>
        </div>
      </div>
    </>
  )
}
