// Pruebas unitarias — lógica de alertas de tiempo en seguimiento
// No requieren base de datos

function alertaTiempo(pedido) {
  if (!pedido.fecha_entrega_estimada) return 'sin-fecha'
  const diffHs = (new Date(pedido.fecha_entrega_estimada) - Date.now()) / 3_600_000
  if (diffHs < 0)  return 'retrasado'
  if (diffHs < 24) return 'urgente'
  return 'en-tiempo'
}

function hs(n) {
  return new Date(Date.now() + n * 3_600_000).toISOString()
}

describe('alertaTiempo — pedidos sin fecha', () => {
  test('fecha_entrega_estimada null → "sin-fecha"', () =>
    expect(alertaTiempo({ fecha_entrega_estimada: null })).toBe('sin-fecha'))

  test('fecha_entrega_estimada undefined → "sin-fecha"', () =>
    expect(alertaTiempo({})).toBe('sin-fecha'))
})

describe('alertaTiempo — pedidos retrasados', () => {
  test('fecha vencida hace 1 hora → "retrasado"', () =>
    expect(alertaTiempo({ fecha_entrega_estimada: hs(-1) })).toBe('retrasado'))

  test('fecha vencida hace 48 horas → "retrasado"', () =>
    expect(alertaTiempo({ fecha_entrega_estimada: hs(-48) })).toBe('retrasado'))
})

describe('alertaTiempo — pedidos urgentes', () => {
  test('vence en 1 hora → "urgente"', () =>
    expect(alertaTiempo({ fecha_entrega_estimada: hs(1) })).toBe('urgente'))

  test('vence en 23 horas → "urgente"', () =>
    expect(alertaTiempo({ fecha_entrega_estimada: hs(23) })).toBe('urgente'))
})

describe('alertaTiempo — pedidos en tiempo', () => {
  test('vence en 25 horas → "en-tiempo"', () =>
    expect(alertaTiempo({ fecha_entrega_estimada: hs(25) })).toBe('en-tiempo'))

  test('vence en 7 días → "en-tiempo"', () =>
    expect(alertaTiempo({ fecha_entrega_estimada: hs(168) })).toBe('en-tiempo'))
})

describe('alertaTiempo — casos límite', () => {
  test('exactamente en 24h es "urgente" (< 24, no <=)', () => {
    // 24h exactas: diffHs === 24 → NO es urgente
    const en24 = new Date(Date.now() + 24 * 3_600_000 + 60_000)  // 24h + 1 min = en-tiempo
    expect(alertaTiempo({ fecha_entrega_estimada: en24.toISOString() })).toBe('en-tiempo')
  })

  test('23h 59min es "urgente"', () => {
    const casi24 = new Date(Date.now() + 23 * 3_600_000 + 59 * 60_000)
    expect(alertaTiempo({ fecha_entrega_estimada: casi24.toISOString() })).toBe('urgente')
  })
})
