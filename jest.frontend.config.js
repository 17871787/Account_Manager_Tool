const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
  roots: ['<rootDir>/src', '<rootDir>/app'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  coverageReporters: ['json', 'lcov', 'text', 'html'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  displayName: 'frontend',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/src/api/',
    '<rootDir>/src/connectors/',
    '<rootDir>/app/api/',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

module.exports = createJestConfig(config);
