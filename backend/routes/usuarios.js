const express = require('express')
const bcrypt = require('bcryptjs')
const Usuario = require('../models/Usuario')
const Conductor = require('../models/Conductor')
const { soloRol } = require('../middleware/auth')

const router = express.Router()

const TIPOS_VALIDOS = ['Encargado de logística', 'Recursos Humanos', 'Chofer']

function validarPassword(p) {
  if (!p || p.length < 8)           return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Z]/.test(p))             return 'La contraseña debe contener al menos una mayúscula'
  if (!/[0-9]/.test(p))             return 'La contraseña debe contener al menos un número'
  if (!/[^A-Za-z0-9]/.test(p))      return 'La contraseña debe contener al menos un carácter especial'
  return null
}

// GET /api/usuarios
router.get('/', async (req, res) => {
  try {
    const usuarios = await Usuario.find().sort({ createdAt: -1 }).lean()

    const conductores = await Conductor.find().lean()
    const conductorMap = {}
    conductores.forEach(c => { conductorMap[c.usuario_id.toString()] = c })

    const data = usuarios.map(u => ({
      ...u,
      conductor: conductorMap[u._id.toString()] || null
    }))

    res.json(data)
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener usuarios' })
  }
})

// GET /api/usuarios/stats
router.get('/stats', async (req, res) => {
  try {
    const [total, activos, choferes, inactivos] = await Promise.all([
      Usuario.countDocuments(),
      Usuario.countDocuments({ activo: true }),
      Usuario.countDocuments({ tipo_usuario: 'Chofer' }),
      Usuario.countDocuments({ activo: false })
    ])
    res.json({ total, activos, choferes, inactivos })
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener estadísticas' })
  }
})

// POST /api/usuarios  — solo RRHH puede crear usuarios
router.post('/', soloRol('Recursos Humanos'), async (req, res) => {
  const { nombre, apellido, email, password, tipo_usuario, dni } = req.body

  if (!nombre || !apellido || !email || !password || !tipo_usuario) {
    return res.status(400).json({ mensaje: 'Todos los campos son requeridos' })
  }

  if (!TIPOS_VALIDOS.includes(tipo_usuario)) {
    return res.status(400).json({ mensaje: 'Tipo de usuario inválido' })
  }

  if (tipo_usuario === 'Chofer' && !dni) {
    return res.status(400).json({ mensaje: 'El DNI es requerido para choferes' })
  }

  const errorPass = validarPassword(password)
  if (errorPass) return res.status(400).json({ mensaje: errorPass })

  try {
    const existe = await Usuario.findOne({ email })
    if (existe) return res.status(409).json({ mensaje: 'El email ya está registrado' })

    const hash = await bcrypt.hash(password, 12)
    const usuario = await Usuario.create({
      nombre,
      apellido,
      email,
      contrasena: hash,
      tipo_usuario,
      requiere_cambio_contrasena: true,
      activo: true
    })

    if (tipo_usuario === 'Chofer') {
      await Conductor.create({
        usuario_id: usuario._id,
        nombre,
        apellido,
        dni
      })
    }

    res.status(201).json(usuario)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al crear usuario' })
  }
})

// POST /api/usuarios/:id/cambiar-password  (el propio usuario cambia su contraseña)
router.post('/:id/cambiar-password', async (req, res) => {
  const { nuevaPassword } = req.body
  const errorPass = validarPassword(nuevaPassword)
  if (errorPass) return res.status(400).json({ mensaje: errorPass })

  try {
    const hash = await bcrypt.hash(nuevaPassword, 12)
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { contrasena: hash, requiere_cambio_contrasena: false },
      { new: true }
    )
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    res.json({ mensaje: 'Contraseña actualizada' })
  } catch {
    res.status(500).json({ mensaje: 'Error al cambiar contraseña' })
  }
})

// PUT /api/usuarios/:id
router.put('/:id', async (req, res) => {
  const { nombre, apellido, email, tipo_usuario, activo, nuevaPassword } = req.body

  try {
    const update = { nombre, apellido, email, tipo_usuario, activo }

    if (nuevaPassword) {
      const errorPass = validarPassword(nuevaPassword)
      if (errorPass) return res.status(400).json({ mensaje: errorPass })
      update.contrasena = await bcrypt.hash(nuevaPassword, 12)
      update.requiere_cambio_contrasena = true
    }

    const usuario = await Usuario.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' })

    if (tipo_usuario === 'Chofer') {
      await Conductor.findOneAndUpdate(
        { usuario_id: req.params.id },
        { nombre, apellido },
        { upsert: true }
      )
    }

    res.json(usuario)
  } catch {
    res.status(500).json({ mensaje: 'Error al actualizar usuario' })
  }
})

// DELETE /api/usuarios/:id  (baja lógica)
router.delete('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    )
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    res.json({ mensaje: 'Usuario desactivado', usuario })
  } catch {
    res.status(500).json({ mensaje: 'Error al desactivar usuario' })
  }
})

module.exports = router
