import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const useBuiltAppForRouteGate =
  process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true' ||
  (process.env.CI === 'true' && process.env.npm_lifecycle_event === 'quality:routes:e2e');
const isProductionLikeGate = process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/payment-first-runtime-global-setup.ts',
  // The FRIA lifecycle acceptance requires the disposable Supabase runtime
  // provisioned by product-fria-ephemeral-qa.yml. Keep the production-like
  // gate fail-closed for every E2E it can execute against the built app while
  // leaving FRIA fail-closed in its dedicated ephemeral runtime gate.
  ...(isProductionLikeGate
    ? { testIgnore: ['**/fria-lifecycle-runtime-acceptance.spec.ts'] }
    : {}),
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: useBuiltAppForRouteGate ? 'npm run start' : 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
