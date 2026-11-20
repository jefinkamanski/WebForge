import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Os testes de integração (a partir da fase 1) compartilham um único banco de teste
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
