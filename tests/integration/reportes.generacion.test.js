// Integración — generación de reportes PDF
const request = require('supertest')
const app     = require('../../backend/app')
const db      = require('../setup/mongo')
const { seedBase, seedVehiculo, seedPedido } = require('../helpers/seed')

let tokenL

beforeAll(async () => {
  await db.conectar()
  const base = await seedBase()
  tokenL = base.tokenLogistica

  // Seed data para que los reportes tengan contenido
  const v = await seedVehiculo({ patente: 'RPT001' })
  await seedPedido({ estado: 'En ruta',   vehiculo_id: v._id, peso_total_kg: 100 })
  await seedPedido({ estado: 'Entregado', vehiculo_id: v._id, peso_total_kg: 200, updatedAt: new Date() })
  await seedPedido({ estado: 'Pendiente', peso_total_kg: 50 })
})
afterAll(() => db.desconectar())

const auth = () => ({ Authorization: `Bearer ${tokenL}` })
const hoy  = new Date().toISOString().slice(0, 10)
const desde2020 = '2020-01-01'

function validarRespuestaPDF(res) {
  expect(res.status).toBe(200)
  expect(res.body).toHaveProperty('pdf')
  expect(res.body).toHaveProperty('label')
  expect(typeof res.body.filas).toBe('number')
  // Verifica que el PDF base64 es válido
  expect(() => atob ? atob(res.body.pdf) : Buffer.from(res.body.pdf, 'base64')).not.toThrow()
  // Los primeros bytes del PDF deben ser "%PDF"
  const bytes = Buffer.from(res.body.pdf, 'base64')
  expect(bytes.slice(0, 4).toString()).toBe('%PDF')
}

describe('POST /api/reportes/generar — tipos válidos', () => {
  test('tipo "pedidos" genera PDF con datos', async () => {
    const res = await request(app).post('/api/reportes/generar').set(auth())
      .send({ tipo: 'pedidos', fecha_desde: desde2020, fecha_hasta: hoy })
    validarRespuestaPDF(res)
    expect(res.body.label).toBe('Pedidos')
    expect(res.body.filas).toBeGreaterThan(0)
  })

  test('tipo "entregas" genera PDF', async () => {
    const res = await request(app).post('/api/reportes/generar').set(auth())
      .send({ tipo: 'entregas', fecha_desde: desde2020, fecha_hasta: hoy })
    validarRespuestaPDF(res)
    expect(res.body.label).toBe('Entregas')
  })

  test('tipo "vehiculos" genera PDF', async () => {
    const res = await request(app).post('/api/reportes/generar').set(auth())
      .send({ tipo: 'vehiculos', fecha_desde: desde2020, fecha_hasta: hoy })
    validarRespuestaPDF(res)
    expect(res.body.label).toBe('Vehículos')
    expect(res.body.filas).toBeGreaterThan(0)
  })

  test('tipo "rendimiento" genera PDF', async () => {
    const res = await request(app).post('/api/reportes/generar').set(auth())
      .send({ tipo: 'rendimiento', fecha_desde: desde2020, fecha_hasta: hoy })
    validarRespuestaPDF(res)
    expect(res.body.label).toBe('Rendimiento conductores')
  })
})

describe('POST /api/reportes/generar — validaciones', () => {
  test('tipo inválido → 400', async () => {
    const res = await request(app).post('/api/reportes/generar').set(auth())
      .send({ tipo: 'inventario', fecha_desde: desde2020, fecha_hasta: hoy })
    expect(res.status).toBe(400)
  })

  test('sin tipo → 400', async () => {
    const res = await request(app).post('/api/reportes/generar').set(auth())
      .send({ fecha_desde: desde2020, fecha_hasta: hoy })
    expect(res.status).toBe(400)
  })

  test('período sin datos → genera PDF con 0 filas sin error', async () => {
    const res = await request(app).post('/api/reportes/generar').set(auth())
      .send({ tipo: 'pedidos', fecha_desde: '2000-01-01', fecha_hasta: '2000-01-02' })
    expect(res.status).toBe(200)
    expect(res.body.filas).toBe(0)
    const bytes = Buffer.from(res.body.pdf, 'base64')
    expect(bytes.slice(0, 4).toString()).toBe('%PDF')
  })
})

describe('GET /api/reportes — historial', () => {
  test('después de generar, aparece en el historial', async () => {
    await request(app).post('/api/reportes/generar').set(auth())
      .send({ tipo: 'pedidos', fecha_desde: desde2020, fecha_hasta: hoy })

    const res = await request(app).get('/api/reportes').set(auth())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('tipo')
    expect(res.body[0]).toHaveProperty('formato')
    expect(res.body[0].formato).toBe('PDF')
  })
})

describe('GET /api/reportes/stats', () => {
  test('devuelve total y hoy', async () => {
    const res = await request(app).get('/api/reportes/stats').set(auth())
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('hoy')
    expect(typeof res.body.total).toBe('number')
  })
})
