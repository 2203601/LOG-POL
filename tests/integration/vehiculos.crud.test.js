// Integración — CRUD de vehículos
const request = require('supertest')
const app     = require('../../backend/app')
const db      = require('../setup/mongo')
const { seedBase } = require('../helpers/seed')
const Vehiculo = require('../../backend/models/Vehiculo')

let tokenL

beforeAll(async () => {
  await db.conectar()
  const base = await seedBase()
  tokenL = base.tokenLogistica
})
afterAll(() => db.desconectar())
afterEach(() => Vehiculo.deleteMany({}))   // solo limpia vehículos, no toca sesiones

const auth = () => ({ Authorization: `Bearer ${tokenL}` })

describe('GET /api/vehiculos', () => {
  test('cualquier rol autenticado puede listar vehículos', async () => {
    const res = await request(app).get('/api/vehiculos').set(auth())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /api/vehiculos', () => {
  const base = { patente: 'NUE001', marca: 'Toyota', modelo: 'Hilux', anio: 2022, capacidad_kg: 800, estado: 'Disponible' }

  test('crear vehículo con datos válidos → 201', async () => {
    const res = await request(app).post('/api/vehiculos').set(auth()).send(base)
    expect(res.status).toBe(201)
    expect(res.body.patente).toBe('NUE001')
  })

  test('crear sin patente → error de validación', async () => {
    const res = await request(app).post('/api/vehiculos').set(auth()).send({ marca: 'Ford', modelo: 'F-100' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('patente duplicada → error', async () => {
    await request(app).post('/api/vehiculos').set(auth()).send(base)
    const res = await request(app).post('/api/vehiculos').set(auth()).send(base)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('PUT /api/vehiculos/:id', () => {
  test('actualiza capacidad correctamente', async () => {
    const crear = await request(app).post('/api/vehiculos').set(auth())
      .send({ patente: 'UPD001', marca: 'Ford', modelo: 'Ranger', anio: 2021, capacidad_kg: 500, estado: 'Disponible' })

    const res = await request(app).put(`/api/vehiculos/${crear.body._id}`).set(auth())
      .send({ capacidad_kg: 1200 })
    expect(res.status).toBe(200)
    expect(res.body.capacidad_kg).toBe(1200)
  })
})

describe('DELETE /api/vehiculos/:id', () => {
  test('el backend no implementa DELETE — devuelve 404', async () => {
    const crear = await request(app).post('/api/vehiculos').set(auth())
      .send({ patente: 'DEL001', marca: 'Fiat', modelo: '500', anio: 2019, capacidad_kg: 300, estado: 'Disponible' })
    expect(crear.status).toBe(201)

    const res = await request(app).delete(`/api/vehiculos/${crear.body._id}`).set(auth())
    // No existe la ruta DELETE: se espera 404 (ruta no registrada)
    expect(res.status).toBe(404)
  })
})
