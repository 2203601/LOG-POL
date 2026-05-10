const express = require('express')
const Sesion = require('./models/Sesion')

const router = express.Router()

// POST /api/logout
router.post('/', async (req, res) => {
  const token = req.headers['authorization']?.slice(7)
  try {
    await Sesion.findOneAndUpdate({ token_jwt: token }, { activa: false })
    res.json({ mensaje: 'Sesión cerrada correctamente' })
  } catch {
    res.status(500).json({ mensaje: 'Error al cerrar sesión' })
  }
})

module.exports = router
