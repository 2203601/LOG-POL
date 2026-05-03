require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const loginRouter    = require('./login')
const usuariosRouter = require('./routes/usuarios')
const vehiculosRouter = require('./routes/vehiculos')
const pedidosRouter   = require('./routes/pedidos')

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/login',     loginRouter)
app.use('/api/usuarios',  usuariosRouter)
app.use('/api/vehiculos', vehiculosRouter)
app.use('/api/pedidos',   pedidosRouter)

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Conectado a MongoDB')
    app.listen(process.env.PORT, () =>
      console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`)
    )
  })
  .catch(err => {
    console.error('Error conectando a MongoDB:', err.message)
    process.exit(1)
  })
