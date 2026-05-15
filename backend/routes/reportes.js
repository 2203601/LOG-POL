const express  = require('express')
const PDFDocument = require('pdfkit')
const Pedido   = require('../models/Pedido')
const Entrega  = require('../models/Entrega')
const Vehiculo = require('../models/Vehiculo')
const Reporte  = require('../models/Reporte')

const router = express.Router()

// ── helpers ──────────────────────────────────────────────
function fmtFecha(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function bufferToPDF(pdfDoc) {
  return new Promise((resolve, reject) => {
    const chunks = []
    pdfDoc.on('data', c => chunks.push(c))
    pdfDoc.on('end',  () => resolve(Buffer.concat(chunks)))
    pdfDoc.on('error', reject)
  })
}

function buildPDF(label, periodo, headers, rows) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' })
  const promise = bufferToPDF(doc)

  const W = doc.page.width - 80   // usable width
  const colW = W / headers.length
  const ROW_H = 20
  const HDR_H = 22

  // ── portada / encabezado ──
  doc.rect(0, 0, doc.page.width, 56).fill('#1A3F6F')
  doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
    .text('LOG-POL', 40, 16)
  doc.fillColor('rgba(255,255,255,0.7)').fontSize(10).font('Helvetica')
    .text(`Reporte de ${label}  ·  Período: ${periodo}`, 40, 38)

  // generado en
  doc.fillColor('#94A3B8').fontSize(8)
    .text(`Generado el ${fmtFecha(new Date())}`, doc.page.width - 200, 44, { width: 160, align: 'right' })

  doc.moveDown(3)

  // ── tabla: encabezados ──
  let y = doc.y
  doc.rect(40, y, W, HDR_H).fill('#2563A8')
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
  headers.forEach((h, i) => {
    doc.text(h, 44 + i * colW, y + 6, { width: colW - 4, ellipsis: true })
  })

  y += HDR_H

  // ── tabla: filas ──
  rows.forEach((row, ri) => {
    if (y + ROW_H > doc.page.height - 40) {
      doc.addPage()
      y = 40
      // repetir encabezado en nueva página
      doc.rect(40, y, W, HDR_H).fill('#2563A8')
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
      headers.forEach((h, i) => {
        doc.text(h, 44 + i * colW, y + 6, { width: colW - 4, ellipsis: true })
      })
      y += HDR_H
    }

    const fill = ri % 2 === 0 ? '#F8F9FA' : '#FFFFFF'
    doc.rect(40, y, W, ROW_H).fill(fill)
    doc.fillColor('#1E293B').fontSize(8).font('Helvetica')
    row.forEach((cell, i) => {
      const txt = cell == null ? '' : String(cell)
      doc.text(txt, 44 + i * colW, y + 5, { width: colW - 4, ellipsis: true })
    })

    // borde inferior suave
    doc.moveTo(40, y + ROW_H).lineTo(40 + W, y + ROW_H)
      .strokeColor('#E2E8F0').lineWidth(0.5).stroke()

    y += ROW_H
  })

  // borde exterior de la tabla
  doc.rect(40, 72, W, HDR_H + rows.length * ROW_H)
    .strokeColor('#E2E8F0').lineWidth(0.8).stroke()

  // total de filas
  doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
    .text(`${rows.length} registro${rows.length !== 1 ? 's' : ''}`, 40, y + 8)

  doc.end()
  return promise
}

// ── GET /api/reportes  (historial) ───────────────────────
router.get('/', async (req, res) => {
  try {
    const reportes = await Reporte.find()
      .sort({ generado_en: -1 }).limit(50).lean()
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
  const periodo = `${fmtFecha(desde)} – ${fmtFecha(hasta)}`

  try {
    let label = ''
    let headers = []
    let rows = []

    if (tipo === 'pedidos') {
      label = 'Pedidos'
      const pedidos = await Pedido.find({
        fecha_creacion: { $gte: desde, $lte: hasta }
      }).populate('vehiculo_id', 'patente conductor_asignado').sort({ fecha_creacion: -1 }).lean()

      headers = ['ID', 'Cliente', 'Destino', 'Estado', 'Prioridad', 'Peso (kg)', 'Vehículo', 'Conductor', 'F. Creación', 'Entrega est.']
      rows = pedidos.map(p => [
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

      headers = ['ID', 'Cliente', 'Destino', 'Peso (kg)', 'Conductor', 'Vehículo', 'F. Entrega', 'A tiempo']
      rows = pedidos.map(p => {
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
    }

    else if (tipo === 'vehiculos') {
      label = 'Vehículos'
      const vehiculos = await Vehiculo.find().lean()
      const agg = await Pedido.aggregate([
        { $match: { vehiculo_id: { $exists: true }, fecha_creacion: { $gte: desde, $lte: hasta } } },
        { $group: { _id: '$vehiculo_id', total: { $sum: 1 }, entregados: { $sum: { $cond: [{ $eq: ['$estado', 'Entregado'] }, 1, 0] } }, peso: { $sum: '$peso_total_kg' } } }
      ])
      const aggMap = {}
      agg.forEach(a => { aggMap[a._id.toString()] = a })

      headers = ['Patente', 'Marca', 'Modelo', 'Año', 'Cap. (kg)', 'Conductor', 'Estado', 'Pedidos', 'Entregados', 'Peso (kg)']
      rows = vehiculos.map(v => {
        const a = aggMap[v._id.toString()] || { total: 0, entregados: 0, peso: 0 }
        return [v.patente, v.marca || '', v.modelo || '', v.anio || '', v.capacidad_kg || '', v.conductor_asignado || '', v.estado || '', a.total, a.entregados, a.peso || 0]
      })
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

      headers = ['Conductor', 'Total pedidos', 'Entregados', 'Retrasados', 'Peso total (kg)', 'Tasa (%)']
      rows = Object.entries(porConductor).map(([nombre, d]) => [
        nombre, d.total, d.entregados, d.retrasados, d.peso,
        d.total > 0 ? Math.round((d.entregados / d.total) * 100) : 0
      ])
    }

    else {
      return res.status(400).json({ mensaje: 'Tipo de reporte inválido' })
    }

    const pdfBuffer = await buildPDF(label, periodo, headers, rows)
    const pdfBase64 = pdfBuffer.toString('base64')

    const reporte = await Reporte.create({
      usuario_id: req.usuario.id,
      tipo: label,
      fecha_desde: desde,
      fecha_hasta: hasta,
      formato: 'PDF',
      generado_en: new Date()
    })

    res.json({ reporte_id: reporte._id, pdf: pdfBase64, label, filas: rows.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al generar reporte' })
  }
})

module.exports = router
