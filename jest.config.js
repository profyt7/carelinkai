const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Ignore Playwright test directory so Jest doesn't attempt to run e2e specs
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/e2e/',
  ],
  setupFilesAfterEnv: [],
}

module.exports = createJestConfig(customJestConfig)
