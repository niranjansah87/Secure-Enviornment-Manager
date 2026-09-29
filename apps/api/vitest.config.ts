import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/unit/**/*.spec.ts'],
    exclude: ['test/integration/**', 'test/e2e/**'],
    alias: {
      '@sem/types': resolve(__dirname, '../../packages/types/dist'),
      '@sem/crypto': resolve(__dirname, '../../packages/crypto/dist'),
    },
  },
});
