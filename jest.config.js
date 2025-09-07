const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const sharedConfig = {
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
};

module.exports = async () => {
  const frontend = await createJestConfig({
    ...sharedConfig,
    displayName: 'frontend',
    testEnvironment: 'jsdom',
    testPathIgnorePatterns: ['<rootDir>/src/api/', '<rootDir>/src/connectors/'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  });

  const backend = await createJestConfig({
    ...sharedConfig,
    displayName: 'backend',
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/src/api/**/__tests__/**/*.+(ts|tsx|js)',
      '<rootDir>/src/api/**/?(*.)+(spec|test).+(ts|tsx|js)',
      '<rootDir>/src/connectors/**/__tests__/**/*.+(ts|tsx|js)',
      '<rootDir>/src/connectors/**/?(*.)+(spec|test).+(ts|tsx|js)',
    ],
  });

  return { projects: [frontend, backend] };
};
