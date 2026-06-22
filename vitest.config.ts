import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));
const markerModule = `${'server'}-only`;

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
      [markerModule]: resolve(rootDir, 'tests/stubs/noop.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: [resolve(rootDir, 'tests/setup-env.ts')],
  },
});
