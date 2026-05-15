const express  = require('express')
const Pedido   = require('../models/Pedido')
const Entrega  = require('../models/Entrega')
const Vehiculo = require('../models/Vehiculo')
const Reporte  = require('../models/Reporte')

const router = express.Router()

// ── helpers CSV ──────────────────────────────────────────
function toCSV(headers, rows) {
  const esc = v => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  rows.forEach(r => lines.push(r.map(esc).join(',')))
  return lines.join('\r\n')
}

function fmtFecha(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── GET /api/reportes  (historial) ───────────────────────
router.get('/', async (req, res) => {
  try {
    const reportes = await Reporte.find()
      .sort({ generado_en: -1 })
      .limit(50)
      .lean()
    res.json(reportes)
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener reportes' })
  }
})

// ── GET /api/reportes/stats ───────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const total = await Reporte.countDocuments()
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const hoy_count = await Reporte.countDocuments({ generado_en: { $gte: hoy } })
    res.json({ total, hoy: hoy_count })
  } catch {
    res.status(500).json({ mensaje: 'Error' })
  }
})

// ── POST /api/reportes/generar ────────────────────────────
router.post('/generar', async (req, res) => {
  const { tipo, fecha_desde, fecha_hasta } = req.body
  if (!tipo) return res.status(400).json({ mensaje: 'Tipo de reporte requerido' })

  const desde = fecha_desde ? new Date(fecha_desde) : new Date(0)
  const hasta = fecha_hasta ? new Date(fecha_hasta + 'T23:59:59') : new Date()

  try {
    let csv = ''
    let label = ''

    if (tipo === 'pedidos') {
      label = 'Pedidos'
      const pedidos = await Pedido.find({
        fecha_creacion: { $gte: desde, $lte: hasta }
      }).populate('vehiculo_id', 'patente conductor_asignado').sort({ fecha_creacion: -1 }).lean()

      csv = toCSV(
        ['ID', 'Cliente', 'Destino', 'Estado', 'Prioridad', 'Peso (kg)', 'Vehículo', 'Conductor', 'Fecha creación', 'Entrega estimada'],
        pedidos.map(p => [
          p._id.toString().slice(-6).toUpperCase(),
          p.cliente_nombre,
          p.destino,
          p.estado,
          p.prioridad || 'Normal',
          p.peso_total_kg || 0,
          p.vehiculo_id?.patente || '',
          p.vehiculo_id?.conductor_asignado || '',
          fmtFecha(p.fecha_creacion),
          fmtFecha(p.fecha_entrega_estimada)
        ])
      )
    }

    else if (tipo === 'entregas') {
      label = 'Entregas'
      const pedidos = await Pedido.find({
        estado: 'Entregado',
        updatedAt: { $gte: desde, $lte: hasta }
      }).populate('vehiculo_id', 'patente conductor_asignado').sort({ updatedAt: -1 }).lean()

      const ids = pedidos.map(p => p._id)
      const entregas = await Entrega.find({ pedido_id: { $in: ids } }).lean()
      const entregaMap = {}
      entregas.forEach(e => { entregaMap[e.pedido_id.toString()] = e })

      csv = toCSV(
        ['ID', 'Cliente', 'Destino', 'Peso (kg)', 'Conductor', 'Vehículo', 'Fecha entrega', 'Dentro del plazo'],
        pedidos.map(p => {
          const e = entregaMap[p._id.toString()]
          const fechaEntrega = e?.fecha_entrega || p.updatedAt
          const aTiempo = p.fecha_entrega_estimada
            ? new Date(fechaEntrega) <= new Date(p.fecha_entrega_estimada) ? 'Sí' : 'No'
            : 'Sin fecha'
          return [
            p._id.toString().slice(-6).toUpperCase(),
            p.cliente_nombre,
            p.destino,
            p.peso_total_kg || 0,
            p.vehiculo_id?.conductor_asignado || '',
            p.vehiculo_id?.patente || '',
            fmtFecha(fechaEntrega),
            aTiempo
          ]
        })
      )
    }

    else if (tipo === 'vehiculos') {
      label = 'Vehículos'
      const vehiculos = await Vehiculo.find().lean()
      const pedidosPorVehiculo = await Pedido.aggregate([
        { $match: { vehiculo_id: { $exists: true }, fecha_creacion: { $gte: desde, $lte: hasta } } },
        { $group: { _id: '$vehiculo_id', total: { $sum: 1 }, entregados: { $sum: { $cond: [{ $eq: ['$estado', 'Entregado'] }, 1, 0] } }, peso: { $sum: '$peso_total_kg' } } }
      ])
      const aggMap = {}
      pedidosPorVehiculo.forEach(a => { aggMap[a._id.toString()] = a })

      csv = toCSV(
        ['Patente', 'Marca', 'Modelo', 'Año', 'Capacidad (kg)', 'Conductor', 'Estado', 'Pedidos período', 'Entregados', 'Peso transportado (kg)'],
        vehiculos.map(v => {
          const agg = aggMap[v._id.toString()] || { total: 0, entregados: 0, peso: 0 }
          return [v.patente, v.marca || '', v.modelo || '', v.anio || '', v.capacidad_kg || '', v.conductor_asignado || '', v.estado || '', agg.total, agg.entregados, agg.peso || 0]
        })
      )
    }

    else if (tipo === 'rendimiento') {
      label = 'Rendimiento conductores'
      const pedidos = await Pedido.find({
        fecha_creacion: { $gte: desde, $lte: hasta }
      }).populate('vehiculo_id', 'conductor_asignado patente').lean()

      const porConductor = {}
      pedidos.forEach(p => {
        const nombre = p.vehiculo_id?.conductor_asignado || 'Sin asignar'
        if (!porConductor[nombre]) porConductor[nombre] = { total: 0, entregados: 0, retrasados: 0, peso: 0 }
        porConductor[nombre].total++
        porConductor[nombre].peso += p.peso_total_kg || 0
        if (p.estado === 'Entregado') porConductor[nombre].entregados++
        if (p.estado === 'En ruta' && p.fecha_entrega_estimada && new Date(p.fecha_entrega_estimada) < new Date()) {
          porConductor[nombre].retrasados++
        }
      })

      csv = toCSV(
        ['Conductor', 'Total pedidos', 'Entregados', 'En ruta retrasados', 'Peso total (kg)', 'Tasa de entrega (%)'],
        Object.entries(porConductor).map(([nombre, d]) => [
          nombre, d.total, d.entregados, d.retrasados, d.peso,
          d.total > 0 ? Math.round((d.entregados / d.total) * 100) : 0
        ])
      )
    }

    else {
      return res.status(400).json({ mensaje: 'Tipo de reporte inválido' })
    }

    // Guardar en historial
    const reporte = await Reporte.create({
      usuario_id: req.usuario.id,
      tipo: label,
      fecha_desde: desde,
      fecha_hasta: hasta,
      formato: 'CSV',
      generado_en: new Date()
    })

    res.json({ reporte_id: reporte._id, csv, label, filas: csv.split('\r\n').length - 1 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al generar reporte' })
  }
})

module.exports = router
