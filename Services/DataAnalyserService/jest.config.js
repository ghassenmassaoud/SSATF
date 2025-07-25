module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    '*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.config.js'
  ],
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './',
      outputName: 'test-results.xml'
    }]
  ]
};
