const express = require('express')
const Pedido    = require('../models/Pedido')
const Vehiculo  = require('../models/Vehiculo')
const Entrega   = require('../models/Entrega')
const Conductor = require('../models/Conductor')
const Producto  = require('../models/Producto')

const router = express.Router()

function alertaTiempo(pedido) {
  if (!pedido.fecha_entrega_estimada) return 'sin-fecha'
  const diffHs = (new Date(pedido.fecha_entrega_estimada) - Date.now()) / 3_600_000
  if (diffHs < 0)  return 'retrasado'
  if (diffHs < 24) return 'urgente'
  return 'en-tiempo'
}

async function enriquecerPedidos(pedidos) {
  const ids = pedidos.map(p => p._id)

  const [productos, entregas] = await Promise.all([
    Producto.find({ pedido_id: { $in: ids } }).lean(),
    Entrega.find({ pedido_id: { $in: ids } }).lean()
  ])

  const prodMap = {}
  productos.forEach(pr => {
    const k = pr.pedido_id.toString()
    if (!prodMap[k]) prodMap[k] = []
    prodMap[k].push(pr)
  })

  const entregaMap = {}
  entregas.forEach(e => { entregaMap[e.pedido_id.toString()] = e })

  return pedidos.map(p => ({
    ...p,
    productos: prodMap[p._id.toString()] || [],
    entrega:   entregaMap[p._id.toString()] || null,
    alerta: alertaTiempo(p),
    tiempo_en_ruta_hs: Math.round((Date.now() - new Date(p.fecha_creacion)) / 3_600_000)
  }))
}

// GET /api/seguimiento/stats
router.get('/stats', async (req, res) => {
  try {
    const hoy   = new Date(); hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1)
    const en24h  = new Date(Date.now() + 24 * 3_600_000)

    const [en_ruta, entregados_hoy, retrasados, urgentes] = await Promise.all([
      Pedido.countDocuments({ estado: 'En ruta' }),
      Pedido.countDocuments({ estado: 'Entregado', updatedAt: { $gte: hoy, $lt: manana } }),
      Pedido.countDocuments({ estado: 'En ruta', fecha_entrega_estimada: { $lt: new Date() } }),
      Pedido.countDocuments({ estado: 'En ruta', fecha_entrega_estimada: { $gte: new Date(), $lt: en24h } })
    ])
    res.json({ en_ruta, entregados_hoy, retrasados, urgentes })
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener estadísticas' })
  }
})

// GET /api/seguimiento?estado=En+ruta|Entregado
router.get('/', async (req, res) => {
  try {
    const estado = req.query.estado || 'En ruta'
    let query = { estado }

    if (req.usuario.tipo_usuario === 'Chofer') {
      const conductor = await Conductor.findOne({ usuario_id: req.usuario.id }).lean()
      if (!conductor) return res.json([])
      const vehiculos = await Vehiculo.find({
        conductor_asignado: { $regex: conductor.nombre, $options: 'i' }
      }).select('_id').lean()
      if (!vehiculos.length) return res.json([])
      query.vehiculo_id = { $in: vehiculos.map(v => v._id) }
    }

    const sort = estado === 'Entregado'
      ? { updatedAt: -1 }
      : { fecha_entrega_estimada: 1 }

    const pedidos = await Pedido.find(query)
      .populate('vehiculo_id', 'patente marca modelo conductor_asignado conductor_dni capacidad_kg')
      .sort(sort)
      .lean()

    res.json(await enriquecerPedidos(pedidos))
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener seguimiento' })
  }
})

// PUT /api/seguimiento/:id/entregar
router.put('/:id/entregar', async (req, res) => {
  try {
    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      { estado: 'Entregado' },
      { new: true }
    )
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' })

    if (req.usuario.tipo_usuario === 'Chofer') {
      const conductor = await Conductor.findOne({ usuario_id: req.usuario.id }).lean()
      if (conductor) {
        await Entrega.findOneAndUpdate(
          { pedido_id: pedido._id },
          {
            pedido_id:    pedido._id,
            conductor_id: conductor._id,
            usuario_id:   req.usuario.id,
            estado:       'Entregado',
            fecha_entrega: new Date()
          },
          { upsert: true }
        )
      }
    }

    res.json({ mensaje: 'Entrega registrada', pedido })
  } catch {
    res.status(500).json({ mensaje: 'Error al registrar entrega' })
  }
})

module.exports = router
