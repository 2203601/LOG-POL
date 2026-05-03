const mongoose = require('mongoose')

const entregaSchema = new mongoose.Schema({
  pedido_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
  conductor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Conductor', required: true },
  usuario_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  estado:       { type: String },
  fecha_salida: { type: Date },
  fecha_entrega:{ type: Date }
})

module.exports = mongoose.model('Entrega', entregaSchema)
