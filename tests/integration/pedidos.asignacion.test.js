// Integración — creación de pedidos y asignación de vehículos
const request = require('supertest')
const app     = require('../../backend/app')
const db      = require('../setup/mongo')
const { seedBase, seedVehiculo, seedPedido } = require('../helpers/seed')

let tokenL, vehiculo

beforeAll(async () => {
  await db.conectar()
  const base = await seedBase()
  tokenL  = base.tokenLogistica
  vehiculo = await seedVehiculo({ patente: 'VH001', capacidad_kg: 500 })
})
afterAll(() => db.desconectar())

const auth = (t) => ({ Authorization: `Bearer ${t}` })

describe('POST /api/pedidos', () => {
  test('crea pedido sin vehículo → estado Pendiente', async () => {
    const res = await request(app).post('/api/pedidos').set(auth(tokenL))
      .send({ cliente_nombre: 'Test SA', destino: 'Córdoba', peso_total_kg: 100 })
    expect(res.status).toBe(201)
    expect(res.body.estado).toBe('Pendiente')
  })

  test('crea pedido con vehículo → estado En ruta', async () => {
    const res = await request(app).post('/api/pedidos').set(auth(tokenL))
      .send({ cliente_nombre: 'Test SA', destino: 'Rosario', peso_total_kg: 100, vehiculo_id: vehiculo._id })
    expect(res.status).toBe(201)
    expect(res.body.estado).toBe('En ruta')
  })

  test('pedido con vehículo que excede capacidad → 400', async () => {
    // Llenamos el vehículo hasta el límite
    await request(app).post('/api/pedidos').set(auth(tokenL))
      .send({ cliente_nombre: 'X', destino: 'Y', peso_total_kg: 400, vehiculo_id: vehiculo._id })

    // Intentamos agregar 200 kg más (total 600 > 500)
    const res = await request(app).post('/api/pedidos').set(auth(tokenL))
      .send({ cliente_nombre: 'X', destino: 'Y', peso_total_kg: 200, vehiculo_id: vehiculo._id })
    expect(res.status).toBe(400)
    expect(res.body.mensaje).toMatch(/capacidad/i)
  })
})

describe('PUT /api/pedidos/:id/asignar', () => {
  test('asigna vehículo con capacidad disponible → estado En ruta', async () => {
    const v2 = await seedVehiculo({ patente: 'VH002', capacidad_kg: 1000 })

    const pedido = await request(app).post('/api/pedidos').set(auth(tokenL))
      .send({ cliente_nombre: 'Cliente B', destino: 'Mendoza', peso_total_kg: 150 })

    const res = await request(app).put(`/api/pedidos/${pedido.body._id}/asignar`)
      .set(auth(tokenL))
      .send({ vehiculo_id: v2._id })
    expect(res.status).toBe(200)
    expect(res.body.estado).toBe('En ruta')
    expect(res.body.vehiculo_id).toBeTruthy()
  })

  test('asignar a vehículo sin capacidad → 400', async () => {
    const v3 = await seedVehiculo({ patente: 'VH003', capacidad_kg: 50 })

    const pedido = await request(app).post('/api/pedidos').set(auth(tokenL))
      .send({ cliente_nombre: 'Cliente C', destino: 'Tucumán', peso_total_kg: 100 })

    const res = await request(app).put(`/api/pedidos/${pedido.body._id}/asignar`)
      .set(auth(tokenL))
      .send({ vehiculo_id: v3._id })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/pedidos/stats', () => {
  test('devuelve contadores correctos', async () => {
    const res = await request(app).get('/api/pedidos/stats').set(auth(tokenL))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('pendientes')
    expect(res.body).toHaveProperty('en_ruta')
    expect(res.body).toHaveProperty('entregados')
  })
})
