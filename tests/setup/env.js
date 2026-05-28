// Se ejecuta ANTES de cargar cualquier módulo — fija variables de entorno para tests
process.env.JWT_SECRET = 'logpol-test-secret-2025'
process.env.PORT       = '3099'
// MONGO_URI se sobreescribe en cada archivo de integración con la URI de MongoMemoryServer
