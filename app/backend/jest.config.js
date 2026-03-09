module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 15000,
  verbose: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-report',
        filename: 'report.html',
        pageTitle: 'AlmaDesk-Edu — Raport testów',
        expand: true,
        openReport: false,
      },
    ],
  ],
}
