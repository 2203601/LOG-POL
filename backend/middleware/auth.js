const jwt = require('jsonwebtoken')
const Sesion = require('../models/Sesion')

async function verificarToken(req, res, next) {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token requerido' })
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    const sesion = await Sesion.findOne({ token_jwt: token, activa: true }).lean()
    if (!sesion) {
      return res.status(401).json({ mensaje: 'Sesión inválida o cerrada' })
    }

    req.usuario = payload
    next()
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' })
  }
}

function soloRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.tipo_usuario)) {
      return res.status(403).json({ mensaje: 'No tenés permisos para esta acción' })
    }
    next()
  }
}

module.exports = { verificarToken, soloRol }
