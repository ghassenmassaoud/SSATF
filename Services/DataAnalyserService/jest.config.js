module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    '*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.config.js',
    '!dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'cobertura', 'json'],
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './',
      outputName: 'test-results.xml'
    }]
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  }
};



