import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const useBuiltAppForRouteGate =
  process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true' ||
  (process.env.CI === 'true' && process.env.npm_lifecycle_event === 'quality:routes:e2e');

export default defineConfig({
  testDir: './tests/e2e',
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
