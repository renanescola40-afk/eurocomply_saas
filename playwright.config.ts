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

  // Only this exact GitHub Actions workflow may use synthetic writes on the
  // short-lived, loopback-only Supabase recovery stack it has just provisioned.
  // This is NOT a generic localhost exemption: developer machines, hosted QA,
  // arbitrary PR workflows and Production must still pass the strict HTTPS gate.
  const ephemeralRequested =
    env.RECOVERY_EPHEMERAL_DATABASE_PROVISIONED === 'true' ||
    env.RECOVERY_EPHEMERAL_DATABASE_MODE === 'project-schema';
  if (ephemeralRequested) {
    const runId = env.GITHUB_RUN_ID ?? '';
    const attempt = env.GITHUB_RUN_ATTEMPT ?? '';
    const projectId = `risck-recovery-${runId}-${attempt}`;
    const rawRunnerTemp = env.RUNNER_TEMP ?? '';
    const runnerTemp = rawRunnerTemp.endsWith('/') ? rawRunnerTemp.slice(0, -1) : rawRunnerTemp;
    let isolatedDb: URL | null = null;
    try {
      isolatedDb = new URL(env.RECOVERY_ISOLATED_DATABASE_URL ?? '');
    } catch {
      // A missing or malformed local database URL must never enable writes.
    }
    const validProject = /^[0-9]{1,16}$/.test(runId) && /^[0-9]{1,3}$/.test(attempt) &&
      projectId.length <= 63;
    const workflowPrefix =
      'renanescola40-afk/eurocomply_saas/.github/workflows/product-fria-ephemeral-qa.yml@';
    const workflowRef = env.GITHUB_WORKFLOW_REF ?? '';
    const isMainRef = workflowRef === `${workflowPrefix}refs/heads/main`;
    const prPart = workflowRef.startsWith(`${workflowPrefix}refs/pull/`)
      ? workflowRef.slice(`${workflowPrefix}refs/pull/`.length).split('/')
      : [];
    const isPrRef = prPart.length === 2 && prPart[1] === 'merge' &&
      Number.isSafeInteger(Number(prPart[0])) && Number(prPart[0]) > 0 &&
      String(Number(prPart[0])) === prPart[0];
    const exactWorkflow =
      env.GITHUB_ACTIONS === 'true' &&
      env.GITHUB_REPOSITORY === 'renanescola40-afk/eurocomply_saas' &&
      env.GITHUB_WORKFLOW === 'Product FRIA Ephemeral Runtime QA' &&
      ((env.GITHUB_EVENT_NAME === 'pull_request' && isPrRef) ||
       (['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME ?? '') && isMainRef));
    const exactOrigins =
      app.protocol === 'http:' && app.hostname === '127.0.0.1' && app.port === '3000' &&
      app.username === '' && app.password === '' && app.pathname === '/' &&
      !app.search && !app.hash &&
      db.protocol === 'http:' && db.hostname === '127.0.0.1' && db.port === '54321' &&
      db.username === '' && db.password === '' && db.pathname === '/' &&
      !db.search && !db.hash &&
      env.NEXT_PUBLIC_APP_URL === env.E2E_BASE_URL &&
      env.SITE_URL === env.E2E_BASE_URL &&
      env.SUPABASE_URL === env.NEXT_PUBLIC_SUPABASE_URL;
    const provenDisposable =
      validProject && runnerTemp.startsWith('/') &&
      env.RECOVERY_EPHEMERAL_DATABASE_PROVISIONED === 'true' &&
      env.RECOVERY_EPHEMERAL_DATABASE_MODE === 'project-schema' &&
      env.RECOVERY_EPHEMERAL_PROJECT_ID === projectId &&
      env.RECOVERY_EPHEMERAL_WORKDIR === `${runnerTemp}/${projectId}` &&
      env.RECOVERY_LOCAL_DB_CONTAINER === `supabase_db_${projectId}` &&
      env.RECOVERY_FIREWALL_IPV4 === 'true' &&
      env.RECOVERY_FIREWALL_IPV6 === 'true' &&
      env.RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL === 'false' &&
      /^[1-9][0-9]*$/.test(env.E2E_FRIA_PRE_RESTART_MIGRATION_COUNT ?? '') &&
      isolatedDb?.protocol === 'postgresql:' &&
      isolatedDb.hostname === '127.0.0.1' &&
      isolatedDb.pathname === '/postgres' && isolatedDb.username === 'postgres' &&
      Boolean(isolatedDb.password) &&
      isolatedDb.port === env.RECOVERY_LOCAL_DB_HOST_PORT &&
      env.RECOVERY_LOCAL_DB_HOST_PORT !== '' &&
      Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
    const noExternalEffects =
      env.PLAYWRIGHT_USE_PRODUCTION_SERVER !== 'true' &&
      env.E2E_FRIA_COMMERCIAL_AUTHORITY_VERIFIED === 'true' &&
      env.E2E_FRIA_UNLICENSED_AUTHORITY_VERIFIED === 'true' &&
      env.E2E_FRIA_EVIDENCE_VAULT_SCHEMA_VERIFIED === 'true' &&
      !env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET &&
      !env.RESEND_API_KEY && !env.SENDGRID_API_KEY &&
      !env.SMTP_HOST && !env.SMTP_URL && !env.MAILGUN_API_KEY;
    if (!exactWorkflow || !exactOrigins || !provenDisposable || !noExternalEffects) {
      throw new Error('synthetic_write_requires_verified_ephemeral_runtime');
    }
    return;
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
  const provisionedQaProjectRef = 'zrxrrfbllsxtleyxjpsz';
  if (approvedRef !== provisionedQaProjectRef || !/^[a-z0-9]{20}$/.test(approvedRef) ||
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
