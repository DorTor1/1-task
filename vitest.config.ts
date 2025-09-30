import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    reporters: 'default',
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});


