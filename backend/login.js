const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const Usuario = require('./models/Usuario')
const Sesion = require('./models/Sesion')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: 'Demasiados intentos de inicio de sesión. Intentá de nuevo en 15 minutos.' }
})

// POST /api/login
router.post('/', loginLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Email y contraseña son requeridos' })
  }

  try {
    const usuario = await Usuario.findOne({ email })

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' })
    }

    if (!usuario.activo) {
      return res.status(403).json({ mensaje: 'Usuario inactivo. Contactá al administrador' })
    }

    const passwordOk = await bcrypt.compare(password, usuario.contrasena)
    if (!passwordOk) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' })
    }

    const expiraEn = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 horas

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    // Guardar sesión en la BD
    await Sesion.create({
      usuario_id: usuario._id,
      token_jwt: token,
      expira_en: expiraEn,
      activa: true
    })

    // Actualizar último login
    await Usuario.findByIdAndUpdate(usuario._id, { ultimo_login: new Date() })

    res.json({
      token,
      requiere_cambio_contrasena: usuario.requiere_cambio_contrasena,
      usuario: {
        id: usuario._id,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario
      }
    })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error interno del servidor' })
  }
})

module.exports = router
