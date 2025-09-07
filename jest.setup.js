// Jest setup file for additional configurations
require('@testing-library/jest-dom');

global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

afterEach(() => {
  jest.clearAllMocks();
});

