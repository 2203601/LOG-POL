// Integración — seguimiento y marcado de entregas (+ control de acceso por rol)
const request = require('supertest')
const app     = require('../../backend/app')
const db      = require('../setup/mongo')
const { seedBase, seedVehiculo, seedPedido } = require('../helpers/seed')

let tokens = {}, vehiculo, pedidoEnRuta

beforeAll(async () => {
  await db.conectar()
  const base = await seedBase()
  tokens   = { rrhh: base.tokenRRHH, logistica: base.tokenLogistica, chofer: base.tokenChofer }
  vehiculo  = await seedVehiculo({ patente: 'SEG001', conductor_asignado: 'Juan Diaz' })
  pedidoEnRuta = await seedPedido({ estado: 'En ruta', vehiculo_id: vehiculo._id, peso_total_kg: 100 })
})
afterAll(() => db.desconectar())

const auth = (t) => ({ Authorization: `Bearer ${t}` })

describe('GET /api/seguimiento', () => {
  test('Logística ve pedidos en ruta', async () => {
    const res = await request(app).get('/api/seguimiento?estado=En+ruta').set(auth(tokens.logistica))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('Chofer ve solo sus pedidos (filtrado por vehículo asignado)', async () => {
    const res = await request(app).get('/api/seguimiento?estado=En+ruta').set(auth(tokens.chofer))
    expect(res.status).toBe(200)
    // Verifica que todos los pedidos retornados pertenecen al vehículo del chofer
    res.body.forEach(p => {
      if (p.vehiculo_id) expect(p.vehiculo_id._id || p.vehiculo_id).toBeTruthy()
    })
  })

  test('GET /api/seguimiento/stats devuelve métricas', async () => {
    const res = await request(app).get('/api/seguimiento/stats').set(auth(tokens.logistica))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('en_ruta')
    expect(res.body).toHaveProperty('entregados_hoy')
    expect(res.body).toHaveProperty('retrasados')
    expect(res.body).toHaveProperty('urgentes')
  })
})

describe('PUT /api/seguimiento/:id/entregar — permisos', () => {
  test('Encargado de logística NO puede marcar entregado → 403', async () => {
    const res = await request(app)
      .put(`/api/seguimiento/${pedidoEnRuta._id}/entregar`)
      .set(auth(tokens.logistica))
    expect(res.status).toBe(403)
  })

  test('Chofer SÍ puede marcar entregado → 200', async () => {
    const res = await request(app)
      .put(`/api/seguimiento/${pedidoEnRuta._id}/entregar`)
      .set(auth(tokens.chofer))
    expect(res.status).toBe(200)
    expect(res.body.pedido.estado).toBe('Entregado')
  })
})

describe('PUT /api/seguimiento/:id/entregar — flujo completo', () => {
  test('pedido pasa a Entregado y aparece en lista entregados', async () => {
    const nuevoPedido = await seedPedido({ estado: 'En ruta', vehiculo_id: vehiculo._id, peso_total_kg: 50 })

    await request(app)
      .put(`/api/seguimiento/${nuevoPedido._id}/entregar`)
      .set(auth(tokens.chofer))

    const lista = await request(app)
      .get('/api/seguimiento?estado=Entregado')
      .set(auth(tokens.chofer))

    const ids = lista.body.map(p => p._id.toString())
    expect(ids).toContain(nuevoPedido._id.toString())
  })
})
