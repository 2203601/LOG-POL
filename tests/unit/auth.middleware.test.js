// Pruebas unitarias — middleware JWT (OWASP A01)
// Solo prueban tokens inválidos: el rechazo ocurre antes de consultar la DB
// por eso no necesitan mongo.

const request = require('supertest')
const jwt     = require('jsonwebtoken')
const app     = require('../../backend/app')

const SECRET = process.env.JWT_SECRET

describe('Acceso sin token', () => {
  const rutas = [
    ['GET',  '/api/usuarios'],
    ['GET',  '/api/vehiculos'],
    ['GET',  '/api/pedidos'],
    ['GET',  '/api/seguimiento'],
    ['POST', '/api/logout'],
  ]
  test.each(rutas)('%s %s devuelve 401', async (method, ruta) => {
    const res = await request(app)[method.toLowerCase()](ruta)
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('mensaje')
  })
})

describe('Token con firma inválida', () => {
  test('clave secreta incorrecta → 401', async () => {
    const fake = jwt.sign({ id: 'abc', tipo_usuario: 'Chofer' }, 'clave_falsa', { expiresIn: '1h' })
    const res  = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${fake}`)
    expect(res.status).toBe(401)
  })
})

describe('Token expirado', () => {
  test('token con expiración -1s → 401', async () => {
    const exp = jwt.sign({ id: 'abc', tipo_usuario: 'Chofer' }, SECRET, { expiresIn: '-1s' })
    const res = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${exp}`)
    expect(res.status).toBe(401)
  })
})

describe('Header malformado', () => {
  test('Authorization sin "Bearer " → 401', async () => {
    const res = await request(app).get('/api/pedidos').set('Authorization', 'Basic dXNlcjpwYXNz')
    expect(res.status).toBe(401)
  })

  test('Authorization "Bearer" sin token → 401', async () => {
    const res = await request(app).get('/api/pedidos').set('Authorization', 'Bearer')
    expect(res.status).toBe(401)
  })

  test('Authorization con token truncado → 401', async () => {
    const res = await request(app).get('/api/pedidos').set('Authorization', 'Bearer abc.def')
    expect(res.status).toBe(401)
  })
})

describe('Inputs de login — validación básica (OWASP A04)', () => {
  test('sin email ni password → 400', async () => {
    const res = await request(app).post('/api/login').send({})
    expect(res.status).toBe(400)
  })

  test('sin email → 400', async () => {
    const res = await request(app).post('/api/login').send({ password: 'algo' })
    expect(res.status).toBe(400)
  })

  test('sin password → 400', async () => {
    const res = await request(app).post('/api/login').send({ email: 'x@x.com' })
    expect(res.status).toBe(400)
  })
})
