// Integración — flujo completo de autenticación
const request = require('supertest')
const app     = require('../../backend/app')
const db      = require('../setup/mongo')
const { crearUsuario, PASS } = require('../helpers/seed')

beforeAll(() => db.conectar())
afterAll(() => db.desconectar())
afterEach(() => db.limpiarDB())

describe('Login exitoso', () => {
  test('devuelve token y datos de usuario', async () => {
    await crearUsuario({ nombre: 'Ana', apellido: 'G', email: 'ana@test.com', tipo_usuario: 'Recursos Humanos' })
    const res = await request(app).post('/api/login').send({ email: 'ana@test.com', password: PASS })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.usuario).toMatchObject({ email: 'ana@test.com', tipo_usuario: 'Recursos Humanos' })
  })

  test('el token permite acceder a rutas protegidas', async () => {
    await crearUsuario({ nombre: 'Ana', apellido: 'G', email: 'ana@test.com', tipo_usuario: 'Recursos Humanos' })
    const { body: { token } } = await request(app).post('/api/login').send({ email: 'ana@test.com', password: PASS })

    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})

describe('Login fallido', () => {
  test('password incorrecta → 401', async () => {
    await crearUsuario({ nombre: 'Ana', apellido: 'G', email: 'ana@test.com', tipo_usuario: 'Recursos Humanos' })
    const res = await request(app).post('/api/login').send({ email: 'ana@test.com', password: 'Incorrecta1!' })
    expect(res.status).toBe(401)
    expect(res.body.mensaje).toBe('Credenciales incorrectas')
  })

  test('email inexistente → 401', async () => {
    const res = await request(app).post('/api/login').send({ email: 'noexiste@test.com', password: PASS })
    expect(res.status).toBe(401)
  })

  test('usuario inactivo → 403', async () => {
    await crearUsuario({ nombre: 'Ana', apellido: 'G', email: 'inactivo@test.com', tipo_usuario: 'Chofer', activo: false })
    const res = await request(app).post('/api/login').send({ email: 'inactivo@test.com', password: PASS })
    expect(res.status).toBe(403)
  })
})

describe('Logout e invalidación de sesión', () => {
  test('logout devuelve 200', async () => {
    await crearUsuario({ nombre: 'Ana', apellido: 'G', email: 'ana@test.com', tipo_usuario: 'Recursos Humanos' })
    const { body: { token } } = await request(app).post('/api/login').send({ email: 'ana@test.com', password: PASS })

    const res = await request(app).post('/api/logout').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  test('token invalidado tras logout → 401', async () => {
    await crearUsuario({ nombre: 'Ana', apellido: 'G', email: 'ana@test.com', tipo_usuario: 'Recursos Humanos' })
    const { body: { token } } = await request(app).post('/api/login').send({ email: 'ana@test.com', password: PASS })

    await request(app).post('/api/logout').set('Authorization', `Bearer ${token}`)

    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
    expect(res.body.mensaje).toMatch(/sesión/i)
  })
})
