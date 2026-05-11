require('dotenv').config()
const express = require('express')
const cors = require('cors')

const loginRouter     = require('./login')
const logoutRouter    = require('./logout')
const usuariosRouter  = require('./routes/usuarios')
const vehiculosRouter = require('./routes/vehiculos')
const pedidosRouter   = require('./routes/pedidos')
const { verificarToken } = require('./middleware/auth')

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/login',  loginRouter)
app.use('/api/logout', verificarToken, logoutRouter)

app.use('/api/usuarios',  verificarToken, usuariosRouter)
app.use('/api/vehiculos', verificarToken, vehiculosRouter)
app.use('/api/pedidos',   verificarToken, pedidosRouter)

module.exports = app
