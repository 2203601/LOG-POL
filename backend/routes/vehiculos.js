const express = require('express')
const Vehiculo = require('../models/Vehiculo')
const Pedido   = require('../models/Pedido')

const router = express.Router()

// GET /api/vehiculos
router.get('/', async (req, res) => {
  try {
    const vehiculos = await Vehiculo.find().sort({ createdAt: -1 }).lean()

    const ids = vehiculos.map(v => v._id)
    const aggs = await Pedido.aggregate([
      { $match: { estado: 'En ruta', vehiculo_id: { $in: ids } } },
      { $group: { _id: '$vehiculo_id', carga_actual: { $sum: '$peso_total_kg' }, pedidos_count: { $sum: 1 } } }
    ])
    const aggMap = {}
    aggs.forEach(a => { aggMap[a._id.toString()] = a })

    const data = vehiculos.map(v => {
      const ag = aggMap[v._id.toString()] || { carga_actual: 0, pedidos_count: 0 }
      const pct = v.capacidad_kg ? Math.round((ag.carga_actual / v.capacidad_kg) * 100) : 0
      return { ...v, carga_actual: ag.carga_actual, pedidos_count: ag.pedidos_count, pct }
    })

    res.json(data)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener vehículos' })
  }
})

// GET /api/vehiculos/stats
router.get('/stats', async (req, res) => {
  try {
    const [total, disponibles, en_ruta, fuera_servicio] = await Promise.all([
      Vehiculo.countDocuments(),
      Vehiculo.countDocuments({ estado: 'Disponible' }),
      Vehiculo.countDocuments({ estado: 'En ruta' }),
      Vehiculo.countDocuments({ estado: 'Fuera de servicio' })
    ])
    res.json({ total, disponibles, en_ruta, fuera_servicio })
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener estadísticas' })
  }
})

// POST /api/vehiculos
router.post('/', async (req, res) => {
  const { patente, anio, marca, modelo, capacidad_kg, conductor_asignado, conductor_dni, estado } = req.body
  if (!patente) return res.status(400).json({ mensaje: 'La patente es requerida' })
  try {
    const v = await Vehiculo.create({ patente, anio, marca, modelo, capacidad_kg, conductor_asignado, conductor_dni, estado: estado || 'Disponible' })
    res.status(201).json(v)
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ mensaje: 'La patente ya existe' })
    res.status(500).json({ mensaje: 'Error al crear vehículo' })
  }
})

// PUT /api/vehiculos/:id
router.put('/:id', async (req, res) => {
  try {
    const { patente, anio, marca, modelo, capacidad_kg, conductor_asignado, conductor_dni, estado } = req.body
    const v = await Vehiculo.findByIdAndUpdate(req.params.id, { patente, anio, marca, modelo, capacidad_kg, conductor_asignado, conductor_dni, estado }, { new: true })
    if (!v) return res.status(404).json({ mensaje: 'Vehículo no encontrado' })
    res.json(v)
  } catch {
    res.status(500).json({ mensaje: 'Error al actualizar vehículo' })
  }
})

module.exports = router
