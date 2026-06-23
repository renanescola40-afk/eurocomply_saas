import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
      'server-only': resolve(rootDir, 'tests/mocks/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'src/app/api/billing/checkout/route.test.ts',
      'src/app/api/billing/portal/route.test.ts',
      'src/app/api/billing/webhook/route.test.ts',
      'src/app/api/stripe/webhook/route.test.ts',
      'src/server/billing/stripe-webhooks.test.ts',
    ],
    setupFiles: [resolve(rootDir, 'tests/setup-env.ts')],
  },
});
