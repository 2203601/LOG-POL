const bcrypt  = require('bcryptjs')
const request = require('supertest')

const Usuario  = require('../../backend/models/Usuario')
const Conductor= require('../../backend/models/Conductor')
const Vehiculo = require('../../backend/models/Vehiculo')
const Pedido   = require('../../backend/models/Pedido')
const app      = require('../../backend/app')

const PASS = 'Test2025!'

async function crearUsuario({ nombre, apellido, email, tipo_usuario, activo = true }) {
  const hash = await bcrypt.hash(PASS, 1)          // rounds=1 para velocidad en tests
  return Usuario.create({ nombre, apellido, email, contrasena: hash, tipo_usuario, activo })
}

async function login(email) {
  const res = await request(app).post('/api/login').send({ email, password: PASS })
  if (!res.body.token) throw new Error(`Login falló para ${email}: ${JSON.stringify(res.body)}`)
  return res.body.token
}

// Crea los tres roles base y devuelve usuarios + tokens
async function seedBase() {
  const [rrhh, logistica, chofer] = await Promise.all([
    crearUsuario({ nombre: 'Ana',  apellido: 'Gomez', email: 'rrhh@test.com',      tipo_usuario: 'Recursos Humanos'         }),
    crearUsuario({ nombre: 'Luis', apellido: 'Perez', email: 'logistica@test.com', tipo_usuario: 'Encargado de logística'   }),
    crearUsuario({ nombre: 'Juan', apellido: 'Diaz',  email: 'chofer@test.com',    tipo_usuario: 'Chofer'                   }),
  ])
  await Conductor.create({ usuario_id: chofer._id, nombre: 'Juan', apellido: 'Diaz', dni: '30456789' })

  const [tokenRRHH, tokenLogistica, tokenChofer] = await Promise.all([
    login('rrhh@test.com'),
    login('logistica@test.com'),
    login('chofer@test.com'),
  ])

  return { rrhh, logistica, chofer, tokenRRHH, tokenLogistica, tokenChofer }
}

async function seedVehiculo(extra = {}) {
  return Vehiculo.create({
    patente: 'TST001',
    marca: 'Ford', modelo: 'F-100', anio: 2020,
    capacidad_kg: 1000,
    estado: 'Disponible',
    conductor_asignado: 'Juan Diaz',
    ...extra
  })
}

async function seedPedido(extra = {}) {
  return Pedido.create({
    cliente_nombre: 'Cliente Test',
    destino: 'Buenos Aires',
    peso_total_kg: 200,
    estado: 'Pendiente',
    fecha_creacion: new Date(),
    ...extra
  })
}

module.exports = { crearUsuario, login, seedBase, seedVehiculo, seedPedido, PASS }
