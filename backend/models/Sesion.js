const mongoose = require('mongoose')

const sesionSchema = new mongoose.Schema({
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  token_jwt:  { type: String, required: true },
  creado_en:  { type: Date, default: Date.now },
  expira_en:  { type: Date, required: true },
  activa:     { type: Boolean, default: true }
})

module.exports = mongoose.model('Sesion', sesionSchema)
