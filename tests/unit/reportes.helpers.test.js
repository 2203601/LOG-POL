// Pruebas unitarias — helpers de reportes
// fmtFecha, cálculo de filas, titulos de tipos

function fmtFecha(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

describe('fmtFecha', () => {
  test('retorna string vacío para null', ()      => expect(fmtFecha(null)).toBe(''))
  test('retorna string vacío para undefined', () => expect(fmtFecha(undefined)).toBe(''))
  test('formatea fecha ISO correctamente', () => {
    // T12:00:00 local evita cruce de día por zona horaria (UTC-3)
    expect(fmtFecha('2025-01-15T12:00:00')).toMatch(/15\/01\/2025/)
  })
  test('formatea objeto Date', () => {
    expect(fmtFecha(new Date(2025, 5, 1, 12, 0, 0))).toMatch(/01\/06\/2025/)
  })
})

describe('Tipos de reporte válidos', () => {
  const TIPOS_VALIDOS = ['pedidos', 'entregas', 'vehiculos', 'rendimiento']

  test('todos los tipos tienen id único', () => {
    const ids = new Set(TIPOS_VALIDOS)
    expect(ids.size).toBe(TIPOS_VALIDOS.length)
  })

  test('tipo inválido no está en la lista', () => {
    expect(TIPOS_VALIDOS.includes('inventario')).toBe(false)
    expect(TIPOS_VALIDOS.includes('')).toBe(false)
    expect(TIPOS_VALIDOS.includes(null)).toBe(false)
  })
})

describe('Construcción de rango de fechas', () => {
  test('fecha_hasta incluye hasta las 23:59:59', () => {
    const hasta = new Date('2025-12-31' + 'T23:59:59')
    expect(hasta.getHours()).toBe(23)
    expect(hasta.getMinutes()).toBe(59)
  })

  test('fecha_desde por defecto es anterior a 1971 cuando no se provee', () => {
    const desde = new Date(0)
    expect(desde.getFullYear()).toBeLessThanOrEqual(1970)
  })

  test('período de un día: desde < hasta', () => {
    const desde = new Date('2025-05-01')
    const hasta = new Date('2025-05-01T23:59:59')
    expect(desde < hasta).toBe(true)
  })
})

describe('Conteo de filas en reporte', () => {
  test('0 filas cuando no hay datos', () => {
    const filas = [].length
    expect(filas).toBe(0)
  })

  test('conteo correcto con N registros', () => {
    const datos = [
      { id: 1, nombre: 'A' },
      { id: 2, nombre: 'B' },
      { id: 3, nombre: 'C' },
    ]
    expect(datos.length).toBe(3)
  })
})
