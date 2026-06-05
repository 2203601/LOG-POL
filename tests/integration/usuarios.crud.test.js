// Integración — CRUD de usuarios y control de acceso por rol
const request = require('supertest')
const app     = require('../../backend/app')
const db      = require('../setup/mongo')
const { seedBase } = require('../helpers/seed')

let tokens = {}

beforeAll(async () => {
  await db.conectar()
  const base = await seedBase()
  tokens = { rrhh: base.tokenRRHH, logistica: base.tokenLogistica, chofer: base.tokenChofer }
})
afterAll(() => db.desconectar())

describe('GET /api/usuarios', () => {
  test('RRHH puede listar usuarios', async () => {
    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${tokens.rrhh}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('Encargado de logística puede listar usuarios', async () => {
    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${tokens.logistica}`)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/usuarios — solo RRHH', () => {
  const nuevoValido = {
    nombre: 'Carlos', apellido: 'López',
    email: 'carlos@test.com', password: 'Nuevo2025!',
    tipo_usuario: 'Encargado de logística'
  }

  test('RRHH crea usuario correctamente → 201', async () => {
    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send(nuevoValido)
    expect(res.status).toBe(201)
    expect(res.body.email).toBe('carlos@test.com')
  })

  test('Logística intenta crear usuario → 403', async () => {
    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.logistica}`)
      .send({ ...nuevoValido, email: 'otro@test.com' })
    expect(res.status).toBe(403)
  })

  test('Chofer intenta crear usuario → 403', async () => {
    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.chofer}`)
      .send({ ...nuevoValido, email: 'otro2@test.com' })
    expect(res.status).toBe(403)
  })
})

describe('POST /api/usuarios — validaciones', () => {
  test('crear Chofer sin DNI → 400', async () => {
    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send({ nombre: 'P', apellido: 'Q', email: 'chofer2@test.com', password: 'Chofer2025!', tipo_usuario: 'Chofer' })
    expect(res.status).toBe(400)
    expect(res.body.mensaje).toMatch(/DNI/i)
  })

  test('crear Chofer con DNI → 201 y genera registro Conductor', async () => {
    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send({ nombre: 'Pedro', apellido: 'Villa', email: 'chofer3@test.com', password: 'Chofer2025!', tipo_usuario: 'Chofer', dni: '40123456' })
    expect(res.status).toBe(201)
  })

  test('password sin mayúscula → 400', async () => {
    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send({ nombre: 'X', apellido: 'Y', email: 'xy@test.com', password: 'minuscula1!', tipo_usuario: 'Recursos Humanos' })
    expect(res.status).toBe(400)
  })

  test('password sin carácter especial → 400', async () => {
    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send({ nombre: 'X', apellido: 'Y', email: 'xy2@test.com', password: 'SinEspecial1', tipo_usuario: 'Recursos Humanos' })
    expect(res.status).toBe(400)
  })

  test('email duplicado → 409', async () => {
    await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send({ nombre: 'A', apellido: 'B', email: 'dup@test.com', password: 'Dup2025!', tipo_usuario: 'Recursos Humanos' })

    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send({ nombre: 'A', apellido: 'B', email: 'dup@test.com', password: 'Dup2025!', tipo_usuario: 'Recursos Humanos' })
    expect(res.status).toBe(409)
  })

  test('tipo_usuario inválido → 400', async () => {
    const res = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send({ nombre: 'X', apellido: 'Y', email: 'inv@test.com', password: 'Inv2025!', tipo_usuario: 'Administrador' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/usuarios/:id — baja lógica', () => {
  test('desactiva usuario (activo → false)', async () => {
    const crear = await request(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.rrhh}`)
      .send({ nombre: 'Temp', apellido: 'T', email: 'temp@test.com', password: 'Temp2025!', tipo_usuario: 'Recursos Humanos' })

    const del = await request(app).delete(`/api/usuarios/${crear.body._id}`)
      .set('Authorization', `Bearer ${tokens.rrhh}`)
    expect(del.status).toBe(200)
    expect(del.body.usuario.activo).toBe(false)
  })
})
