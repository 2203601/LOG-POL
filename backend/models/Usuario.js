const mongoose = require('mongoose')

const usuarioSchema = new mongoose.Schema({
  nombre:                   { type: String },
  apellido:                 { type: String },
  email:                    { type: String, required: true, unique: true, lowercase: true },
  contrasena:               { type: String, required: true },
  tipo_usuario:             { type: String, required: true },
  requiere_cambio_contrasena: { type: Boolean, default: false },
  activo:                   { type: Boolean, default: true },
  ultimo_login:             { type: Date }
}, { timestamps: true })

module.exports = mongoose.model('Usuario', usuarioSchema)
