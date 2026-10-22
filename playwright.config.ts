import { defineConfig, devices } from '@playwright/test';

/**
 * This guard is enforced at Playwright configuration-load time for every
 * synthetic-write suite, not just for one test's global setup.
 * A boolean opt-in is never evidence that a target is disposable.
 */
function assertSyntheticWriteQaEnvironment(env: NodeJS.ProcessEnv) {
  let app: URL;
  let db: URL;
  try {
    app = new URL(env.E2E_BASE_URL ?? '');
    db = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  } catch {
    throw new Error('synthetic_write_requires_explicit_isolated_qa_origins');
  }

  const appHost = app.hostname.toLowerCase().replace(/\.+$/, '');
  const dbHost = db.hostname.toLowerCase().replace(/\.+$/, '');
  if (
    app.protocol !== 'https:' || app.username || app.password || app.port ||
    app.pathname !== '/' || app.search || app.hash ||
    appHost === 'risckcomply.com' || appHost.endsWith('.risckcomply.com') ||
    appHost === 'eurocomply-saas.vercel.app' ||
    appHost === 'eurocomply-saas-renanescola40-afks-projects.vercel.app' ||
    appHost === 'eurocomply-saas-git-main-renanescola40-afks-projects.vercel.app' ||
    appHost === 'eurocomply-saas-o6ws7qrp2-renanescola40-afks-projects.vercel.app' ||
    db.protocol !== 'https:' || db.username || db.password || db.port ||
    db.pathname !== '/' || db.search || db.hash ||
    !/^[a-z0-9]+\.supabase\.co$/i.test(dbHost) ||
    dbHost === 'tganhbbhfxcpblmgqprg.supabase.co'
  ) {
    throw new Error('synthetic_write_requires_explicit_isolated_qa_origins');
  }
  // A different Supabase hostname is not evidence of an approved disposable tenant.
  // Bind the QA runtime to the exact owner-approved project ref, not just to a suffix.
  const approvedRef = env.E2E_QA_APPROVED_SUPABASE_REF?.trim();
  if (!approvedRef || !/^[a-z0-9]{20}$/.test(approvedRef) ||
      dbHost !== `${approvedRef}.supabase.co`) {
    throw new Error('synthetic_write_requires_approved_qa_database_ref');
  }
  if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ||
      !env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
    throw new Error('synthetic_write_requires_stripe_test_credentials');
  }
  if (env.E2E_QA_MAIL_SINK_CONFIRMED !== 'true') {
    throw new Error('synthetic_write_requires_qa_mail_sink');
  }
  if (env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true') {
    throw new Error('synthetic_write_cannot_use_production_server_gate');
  }
}

if (process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true') {
  assertSyntheticWriteQaEnvironment(process.env);
}

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
