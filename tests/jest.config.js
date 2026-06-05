module.exports = {
  testEnvironment: 'node',
  testTimeout:     30000,
  forceExit:       true,
  setupFiles:      ['./setup/env.js'],
  testMatch:       ['**/unit/**/*.test.js', '**/integration/**/*.test.js']
}
