const mongoose = require('mongoose')

const vehiculoSchema = new mongoose.Schema({
  patente:            { type: String, required: true, unique: true },
  tipo:               { type: String },
  marca:              { type: String },
  modelo:             { type: String },
  anio:               { type: Number },
  capacidad_kg:       { type: Number },
  conductor_asignado: { type: String },
  conductor_dni:      { type: String },
  estado:             { type: String },
  fecha_registro:     { type: Date, default: Date.now }
}, { timestamps: true })

module.exports = mongoose.model('Vehiculo', vehiculoSchema)
