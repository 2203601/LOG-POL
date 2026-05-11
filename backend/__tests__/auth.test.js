// Tests de seguridad: protección de rutas con JWT (OWASP A01 - Broken Access Control)
// No necesitan DB: el middleware rechaza antes de consultar Sesion cuando el token es inválido

const request = require('supertest')
const jwt = require('jsonwebtoken')

// Cargamos variables de entorno antes del app
require('dotenv').config()
const app = require('../app')

describe('Protección de rutas con JWT (OWASP A01)', () => {
  test('GET /api/usuarios sin token devuelve 401', async () => {
    const res = await request(app).get('/api/usuarios')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('mensaje')
  })

  test('GET /api/vehiculos sin token devuelve 401', async () => {
    const res = await request(app).get('/api/vehiculos')
    expect(res.status).toBe(401)
  })

  test('GET /api/pedidos sin token devuelve 401', async () => {
    const res = await request(app).get('/api/pedidos')
    expect(res.status).toBe(401)
  })

  test('POST /api/usuarios sin token devuelve 401', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ nombre: 'Hack', apellido: 'Er', email: 'hack@x.com', password: 'Test123!', tipo_usuario: 'Recursos Humanos' })
    expect(res.status).toBe(401)
  })

  test('POST /api/logout sin token devuelve 401', async () => {
    const res = await request(app).post('/api/logout')
    expect(res.status).toBe(401)
  })

  test('token con firma inválida devuelve 401', async () => {
    const fakeToken = jwt.sign({ id: 'abc', tipo_usuario: 'Recursos Humanos' }, 'clave_falsa', { expiresIn: '1h' })
    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${fakeToken}`)
    expect(res.status).toBe(401)
  })

  test('token expirado devuelve 401', async () => {
    const expiredToken = jwt.sign(
      { id: 'abc', tipo_usuario: 'Recursos Humanos' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    )
    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${expiredToken}`)
    expect(res.status).toBe(401)
  })

  test('header malformado (sin Bearer) devuelve 401', async () => {
    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', 'Basic dXNlcjpwYXNz')
    expect(res.status).toBe(401)
  })
})

describe('Validación de inputs en login (OWASP A04)', () => {
  test('login sin email devuelve 400', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'algo' })
    expect(res.status).toBe(400)
  })

  test('login sin password devuelve 400', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'test@test.com' })
    expect(res.status).toBe(400)
  })

  test('login con body vacío devuelve 400', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({})
    expect(res.status).toBe(400)
  })
})
