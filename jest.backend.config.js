const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
  roots: ['<rootDir>/src', '<rootDir>/app'],
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
  displayName: 'backend',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/api/**/__tests__/**/*.+(ts|tsx|js)',
    '<rootDir>/src/api/**/?(*.)+(spec|test).+(ts|tsx|js)',
    '<rootDir>/src/connectors/**/__tests__/**/*.+(ts|tsx|js)',
    '<rootDir>/src/connectors/**/?(*.)+(spec|test).+(ts|tsx|js)',
    '<rootDir>/app/api/**/__tests__/**/*.+(ts|tsx|js)',
    '<rootDir>/app/api/**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

module.exports = createJestConfig(config);
