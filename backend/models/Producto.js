const mongoose = require('mongoose')

const productoSchema = new mongoose.Schema({
  pedido_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
  descripcion:     { type: String },
  cantidad:        { type: Number },
  peso_unitario_kg:{ type: Number }
})

module.exports = mongoose.model('Producto', productoSchema)
