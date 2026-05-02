const mongoose = require('mongoose')

const reporteSchema = new mongoose.Schema({
  usuario_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  tipo:         { type: String },
  fecha_desde:  { type: Date },
  fecha_hasta:  { type: Date },
  formato:      { type: String },
  archivo:      { type: String },
  generado_en:  { type: Date, default: Date.now }
})

module.exports = mongoose.model('Reporte', reporteSchema)
