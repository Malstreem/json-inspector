import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2023',
    outDir: 'dist',
  },
  server: {
    port: 3000,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
