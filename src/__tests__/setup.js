/**
 * Vitest setup file
 * Global test configuration and setup
 */

import { vi } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Global test utilities
global.testUtils = {
  // Helper to create deep clones of test data
  deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
  
  // Helper to create timestamps for testing
  createTimestamp: (offset = 0) => new Date(Date.now() + offset).toISOString(),
  
  // Helper to generate random strings
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  
  // Helper to generate random numbers
  randomNumber: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min
};

// Setup DOM environment if needed
if (typeof window !== 'undefined') {
  // DOM-specific setup can go here
}

// Mock process for jsdom environment to prevent "process is not defined" errors
// This is needed because some modules check for process.env during import
if (typeof process === 'undefined') {
  global.process = {
    env: {
      NODE_ENV: 'test'
    },
    platform: 'darwin',
    version: 'v16.0.0',
    versions: {},
    nextTick: (fn) => setTimeout(fn, 0),
    cwd: () => '/',
    pid: 12345,
    ppid: 12344,
    title: 'vitest'
  };
}

// Ensure process is always available in the global scope
globalThis.process = globalThis.process || global.process;