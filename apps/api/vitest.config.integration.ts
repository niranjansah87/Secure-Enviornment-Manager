import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.spec.ts'],
    testTimeout: 60000,
    hookTimeout: 30000,
    alias: {
      '@sem/types': resolve(__dirname, '../../packages/types/dist'),
      '@sem/crypto': resolve(__dirname, '../../packages/crypto/dist'),
    },
  },
});
