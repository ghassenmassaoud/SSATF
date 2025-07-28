module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    '*.{js,jsx}',
    '!src/index.js',
    '!node_modules/**',
    '!coverage/**',
    '!dist/**',
    '!build/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'cobertura', 'json'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<./setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './',
      outputName: 'junit.xml'
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


