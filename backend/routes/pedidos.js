const express = require('express')
const Pedido   = require('../models/Pedido')
const Producto = require('../models/Producto')

const router = express.Router()

// GET /api/pedidos
router.get('/', async (req, res) => {
  try {
    const pedidos = await Pedido.find()
      .populate('vehiculo_id', 'patente capacidad_kg conductor_asignado')
      .sort({ fecha_creacion: -1 })
      .lean()

    const ids = pedidos.map(p => p._id)
    const productos = await Producto.find({ pedido_id: { $in: ids } }).lean()
    const prodMap = {}
    productos.forEach(pr => {
      const key = pr.pedido_id.toString()
      if (!prodMap[key]) prodMap[key] = []
      prodMap[key].push(pr)
    })

    const data = pedidos.map(p => ({ ...p, productos: prodMap[p._id.toString()] || [] }))
    res.json(data)
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener pedidos' })
  }
})

// GET /api/pedidos/stats
router.get('/stats', async (req, res) => {
  try {
    const [total, pendientes, en_ruta, entregados] = await Promise.all([
      Pedido.countDocuments(),
      Pedido.countDocuments({ vehiculo_id: { $exists: false } }),
      Pedido.countDocuments({ estado: 'En ruta' }),
      Pedido.countDocuments({ estado: 'Entregado' })
    ])
    res.json({ total, pendientes, en_ruta, entregados })
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener estadísticas' })
  }
})

// POST /api/pedidos
router.post('/', async (req, res) => {
  const { cliente_nombre, destino, fecha_entrega_estimada, prioridad, vehiculo_id, peso_total_kg, productos } = req.body
  try {
    const estado = vehiculo_id ? 'En ruta' : 'Pendiente'
    const pedido = await Pedido.create({
      cliente_nombre, destino, fecha_entrega_estimada, prioridad,
      vehiculo_id: vehiculo_id || undefined,
      peso_total_kg, estado
    })

    if (productos && productos.length > 0) {
      const prods = productos.map(p => ({ ...p, pedido_id: pedido._id }))
      await Producto.insertMany(prods)
    }

    res.status(201).json(pedido)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al crear pedido' })
  }
})

// PUT /api/pedidos/:id/asignar
router.put('/:id/asignar', async (req, res) => {
  const { vehiculo_id } = req.body
  try {
    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      { vehiculo_id, estado: 'En ruta' },
      { new: true }
    ).populate('vehiculo_id', 'patente capacidad_kg conductor_asignado')
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' })
    res.json(pedido)
  } catch {
    res.status(500).json({ mensaje: 'Error al asignar vehículo' })
  }
})

// PUT /api/pedidos/:id/estado
router.put('/:id/estado', async (req, res) => {
  const { estado } = req.body
  try {
    const pedido = await Pedido.findByIdAndUpdate(req.params.id, { estado }, { new: true })
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' })
    res.json(pedido)
  } catch {
    res.status(500).json({ mensaje: 'Error al actualizar estado' })
  }
})

module.exports = router
