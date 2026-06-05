// Pruebas unitarias — validación de contraseña (OWASP A07)
// No requieren base de datos ni servidor

function validarPassword(p) {
  if (!p || p.length < 8)       return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Z]/.test(p))         return 'La contraseña debe contener al menos una mayúscula'
  if (!/[0-9]/.test(p))         return 'La contraseña debe contener al menos un número'
  if (!/[^A-Za-z0-9]/.test(p))  return 'La contraseña debe contener al menos un carácter especial'
  return null
}

describe('validarPassword — casos válidos', () => {
  test('acepta contraseña con todos los requisitos', () => {
    expect(validarPassword('Segura1!')).toBeNull()
    expect(validarPassword('MiPass123@')).toBeNull()
    expect(validarPassword('C0mpl3j@Pass')).toBeNull()
    expect(validarPassword('ABCDE123!')).toBeNull()
  })

  test('acepta caracteres especiales variados', () => {
    expect(validarPassword('Pass1@word')).toBeNull()
    expect(validarPassword('Pass1#word')).toBeNull()
    expect(validarPassword('Pass1$word')).toBeNull()
    expect(validarPassword('Pass1.word')).toBeNull()
  })
})

describe('validarPassword — contraseñas nulas / vacías', () => {
  test('rechaza null', ()      => expect(validarPassword(null)).not.toBeNull())
  test('rechaza undefined', () => expect(validarPassword(undefined)).not.toBeNull())
  test('rechaza string vacío', ()=> expect(validarPassword('')).not.toBeNull())
})

describe('validarPassword — largo mínimo', () => {
  test('rechaza 7 caracteres válidos en todo lo demás', () =>
    expect(validarPassword('Abc1!xy')).not.toBeNull())
  test('acepta exactamente 8 caracteres', () =>
    expect(validarPassword('Abc1!xyz')).toBeNull())
})

describe('validarPassword — requisito de mayúscula', () => {
  test('rechaza sin mayúscula', () => {
    expect(validarPassword('abcdefg1!')).not.toBeNull()
    expect(validarPassword('todo_en_minúscula1!')).not.toBeNull()
  })
})

describe('validarPassword — requisito de número', () => {
  test('rechaza sin dígito', () => {
    expect(validarPassword('Abcdefg!')).not.toBeNull()
    expect(validarPassword('SoloLetras!')).not.toBeNull()
  })
})

describe('validarPassword — requisito de carácter especial', () => {
  test('rechaza solo letras y números', () => {
    expect(validarPassword('Abcdefg1')).not.toBeNull()
    expect(validarPassword('Password1')).not.toBeNull()
    expect(validarPassword('UPPER123lower')).not.toBeNull()
  })
})

describe('validarPassword — contraseñas comunes', () => {
  test('rechaza "password"', ()    => expect(validarPassword('password')).not.toBeNull())
  test('rechaza "12345678"', ()    => expect(validarPassword('12345678')).not.toBeNull())
  test('rechaza "Password1"', ()   => expect(validarPassword('Password1')).not.toBeNull())
  test('rechaza "qwerty123"', ()   => expect(validarPassword('qwerty123')).not.toBeNull())
})
