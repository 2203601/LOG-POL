// Tests unitarios de validación de contraseña (OWASP - sin DB)

function validarPassword(p) {
  if (!p || p.length < 8)           return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Z]/.test(p))             return 'La contraseña debe contener al menos una mayúscula'
  if (!/[0-9]/.test(p))             return 'La contraseña debe contener al menos un número'
  if (!/[^A-Za-z0-9]/.test(p))      return 'La contraseña debe contener al menos un carácter especial'
  return null
}

describe('Validación de contraseña (OWASP)', () => {
  test('rechaza contraseña vacía', () => {
    expect(validarPassword('')).not.toBeNull()
    expect(validarPassword(null)).not.toBeNull()
    expect(validarPassword(undefined)).not.toBeNull()
  })

  test('rechaza contraseña menor a 8 caracteres', () => {
    expect(validarPassword('Ab1!')).not.toBeNull()
    expect(validarPassword('Ab1!xyz')).not.toBeNull()
  })

  test('rechaza contraseña sin mayúsculas', () => {
    expect(validarPassword('abcdefg1!')).not.toBeNull()
  })

  test('rechaza contraseña sin números', () => {
    expect(validarPassword('Abcdefg!')).not.toBeNull()
  })

  test('rechaza contraseña sin caracteres especiales', () => {
    expect(validarPassword('Abcdefg1')).not.toBeNull()
  })

  test('acepta contraseña que cumple todos los requisitos', () => {
    expect(validarPassword('Segura1!')).toBeNull()
    expect(validarPassword('MiPass123@')).toBeNull()
    expect(validarPassword('C0mpl3j@Pass')).toBeNull()
  })

  test('rechaza contraseñas comunes insuficientes', () => {
    expect(validarPassword('password')).not.toBeNull()
    expect(validarPassword('12345678')).not.toBeNull()
    expect(validarPassword('Password1')).not.toBeNull() // falta especial
  })
})
