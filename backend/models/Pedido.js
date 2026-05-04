const mongoose = require('mongoose')

const pedidoSchema = new mongoose.Schema({
  vehiculo_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'Vehiculo' },
  usuario_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: false },
  cliente_nombre:         { type: String },
  destino:                { type: String },
  peso_total_kg:          { type: Number },
  estado:                 { type: String },
  fecha_creacion:         { type: Date, default: Date.now },
  fecha_entrega_estimada: { type: Date },
  prioridad:              { type: String, default: 'Normal' }
}, { timestamps: true })

module.exports = mongoose.model('Pedido', pedidoSchema)
