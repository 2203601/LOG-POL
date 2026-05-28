const mongoose = require('mongoose')

const conductorSchema = new mongoose.Schema({
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  nombre:     { type: String, required: true },
  apellido:   { type: String, required: true },
  dni:        { type: String, sparse: true },
  telefono:   { type: String },
  licencia:   { type: String }
})

module.exports = mongoose.model('Conductor', conductorSchema)
