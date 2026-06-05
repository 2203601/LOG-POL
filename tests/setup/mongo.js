const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('../../backend/node_modules/mongoose')

let mongoServer

async function conectar() {
  mongoServer = await MongoMemoryServer.create()
  const uri   = mongoServer.getUri()
  await mongoose.connect(uri)
}

async function desconectar() {
  await mongoose.disconnect()
  if (mongoServer) await mongoServer.stop()
}

async function limpiarDB() {
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({})
  }
}

module.exports = { conectar, desconectar, limpiarDB }
