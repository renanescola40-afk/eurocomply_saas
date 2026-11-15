import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Execute the actual dependency-free guard extracted from the global setup,
// without launching Playwright, contacting providers, or using any credentials.
const source = readFileSync(
  new URL('../e2e/payment-first-runtime-global-setup.ts', import.meta.url), 'utf8',
);
const begin = source.indexOf('function assertIsolatedQaRuntime(');
const end = source.indexOf('\nfunction shouldRunPaymentFirstRuntimeProof()', begin);
assert.ok(begin >= 0 && end > begin, 'isolated origin guard must be present');
const typedGuard = source.slice(begin, end);
const plainGuard = typedGuard
  .replace('baseURL: string, supabaseURL: string', 'baseURL, supabaseURL')
  .replace('let app: URL;', 'let app;')
  .replace('let db: URL;', 'let db;')
  .replace('let isolatedDb: URL | null = null;', 'let isolatedDb = null;');
const runtimeEnv = { E2E_QA_APPROVED_SUPABASE_REF: 'zrxrrfbllsxtleyxjpsz' };
const assertIsolatedQaRuntime = runInNewContext(
  plainGuard + '\nassertIsolatedQaRuntime',
  { URL, process: { env: runtimeEnv } },
);

const app = 'https://disposable-qa.example.invalid';
const db = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';

test('disposable HTTPS app and nonproduction Supabase origin pass the guard', () => {
  assert.doesNotThrow(() => assertIsolatedQaRuntime(app, db));
});

for (const [name, appURL, dbURL] of [
  ['production app', 'https://www.risckcomply.com', db],
  ['production root', 'https://risckcomply.com', db],
  ['production subdomain', 'https://qa.risckcomply.com', db],
  ['production Vercel eurocomply-saas.vercel.app', 'https://eurocomply-saas.vercel.app', db],
  ['production Vercel eurocomply-saas-renanescola40-afks-projects.vercel.app', 'https://eurocomply-saas-renanescola40-afks-projects.vercel.app', db],
  ['production Vercel eurocomply-saas-git-main-renanescola40-afks-projects.vercel.app', 'https://eurocomply-saas-git-main-renanescola40-afks-projects.vercel.app', db],
  ['production Vercel eurocomply-saas-o6ws7qrp2-renanescola40-afks-projects.vercel.app', 'https://eurocomply-saas-o6ws7qrp2-renanescola40-afks-projects.vercel.app', db],
  ['production trailing DNS dot', 'https://www.risckcomply.com.', db],
  ['non-TLS application', 'http://disposable-qa.example.invalid', db],
  ['application credentials', 'https://qa:password@disposable-qa.example.invalid', db],
  ['application port', 'https://disposable-qa.example.invalid:444', db],
  ['application route', 'https://disposable-qa.example.invalid/en', db],
  ['application query', 'https://disposable-qa.example.invalid/?foo=x', db],
  ['application fragment', 'https://disposable-qa.example.invalid/#dashboard', db],
  ['production Supabase', app, 'https://tganhbbhfxcpblmgqprg.supabase.co'],
  ['untrusted database domain', app, 'https://disposable.example.invalid'],
  ['nested database hostname', app, 'https://sub.zrxrrfbllsxtleyxjpsz.supabase.co'],
  ['database credentials', app, 'https://bad@zrxrrfbllsxtleyxjpsz.supabase.co'],
  ['database HTTP', app, 'http://zrxrrfbllsxtleyxjpsz.supabase.co'],
  ['database path', app, 'https://zrxrrfbllsxtleyxjpsz.supabase.co/rest/v1'],
  ['database query', app, 'https://zrxrrfbllsxtleyxjpsz.supabase.co/?s=1'],
  ['database fragment', app, 'https://zrxrrfbllsxtleyxjpsz.supabase.co/#secret'],
  ['database nonstandard port', app, 'https://zrxrrfbllsxtleyxjpsz.supabase.co:444'],
  ['missing app', '', db],
  ['missing database', app, ''],
]) {
  test('rejects ' + name, () => {
    assert.throws(
      () => assertIsolatedQaRuntime(appURL, dbURL),
      /payment_first_runtime_requires_isolated_qa/,
    );
  });
}

test('payment-first probe refuses mismatched or missing approved QA project refs', () => {
  assert.throws(() => assertIsolatedQaRuntime(app, 'https://differenttenantqa123.supabase.co'),
    /payment_first_runtime_requires_approved_qa_database_ref/);
  assert.match(source, /E2E_QA_APPROVED_SUPABASE_REF/);
});

test('runtime guard executes before any Playwright browser or provider request', () => {
  const call = source.indexOf('  assertIsolatedQaRuntime(baseURL, supabaseUrl);');
  const browser = source.indexOf('  const browser = await chromium.launch();');
  assert.ok(call > 0 && browser > call, 'unsafe provider access must be preceded by isolation check');
  assert.match(source, /if \(!shouldRunPaymentFirstRuntimeProof\(\)\) return;/);
});

test('paid-owner retention browser proof also requires an isolated provider fixture', () => {
  const retention = readFileSync(
    new URL('../e2e/retention-export-functional.spec.ts', import.meta.url), 'utf8',
  );
  assert.match(retention, /dbHost !== 'tganhbbhfxcpblmgqprg\.supabase\.co'/);
  assert.match(retention, /hostname\.endsWith\('\.risckcomply\.com'\)/);
  assert.match(retention, /STRIPE_SECRET_KEY\?\.startsWith\('sk_test_'\)/);
  assert.match(retention, /E2E_QA_MAIL_SINK_CONFIRMED === 'true'/);
  assert.match(retention, /test\.skip\(!isolatedTarget/);
});

const ephemeral = {
  GITHUB_ACTIONS: 'true',
  GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
  GITHUB_WORKFLOW: 'Product FRIA Ephemeral Runtime QA',
  GITHUB_WORKFLOW_REF:
    'renanescola40-afk/eurocomply_saas/.github/workflows/product-fria-ephemeral-qa.yml@refs/pull/2738/merge',
  GITHUB_EVENT_NAME: 'pull_request',
  GITHUB_RUN_ID: '43708930485',
  GITHUB_RUN_ATTEMPT: '1',
  RUNNER_TEMP: '/home/runner/work/_temp',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
  SITE_URL: 'http://127.0.0.1:3000',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-anon-fixture',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role-fixture',
  RECOVERY_ISOLATED_DATABASE_URL: 'postgresql://postgres:synthetic-password@127.0.0.1:38083/postgres',
  RECOVERY_LOCAL_DB_HOST_PORT: '38083',
  RECOVERY_EPHEMERAL_DATABASE_PROVISIONED: 'true',
  RECOVERY_EPHEMERAL_DATABASE_MODE: 'project-schema',
  RECOVERY_EPHEMERAL_PROJECT_ID: 'risck-recovery-43708930485-1',
  RECOVERY_EPHEMERAL_WORKDIR: '/home/runner/work/_temp/risck-recovery-43708930485-1',
  RECOVERY_LOCAL_DB_CONTAINER: 'supabase_db_risck-recovery-43708930485-1',
  RECOVERY_FIREWALL_IPV4: 'true',
  RECOVERY_FIREWALL_IPV6: 'true',
  RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL: 'false',
  E2E_FRIA_PRE_RESTART_MIGRATION_COUNT: '340',
  E2E_FRIA_COMMERCIAL_AUTHORITY_VERIFIED: 'true',
  E2E_FRIA_UNLICENSED_AUTHORITY_VERIFIED: 'true',
  E2E_FRIA_EVIDENCE_VAULT_SCHEMA_VERIFIED: 'true',
};
function withEphemeralEnv(override, callback) {
  const previous = { ...runtimeEnv };
  for (const key of Object.keys(runtimeEnv)) delete runtimeEnv[key];
  Object.assign(runtimeEnv, ephemeral, override);
  try { callback(); }
  finally {
    for (const key of Object.keys(runtimeEnv)) delete runtimeEnv[key];
    Object.assign(runtimeEnv, previous);
  }
}

test('payment-first proof admits only an attested FRIA disposable local Auth stack', () => {
  withEphemeralEnv({}, () => {
    assert.doesNotThrow(() => assertIsolatedQaRuntime(
      'http://127.0.0.1:3000',
      'http://127.0.0.1:54321',
    ));
  });
});

for (const [name, env, appUrl, dbUrl] of [
  ['not a GitHub Actions runner', { GITHUB_ACTIONS: '' }],
  ['arbitrary workflow', { GITHUB_WORKFLOW: 'Untrusted Browser Runner' }],
  ['wrong workflow ref', { GITHUB_WORKFLOW_REF: 'other/repository@refs/pull/2738/merge' }],
  ['unapproved source ref', { GITHUB_EVENT_NAME: 'pull_request', GITHUB_WORKFLOW_REF: 'renanescola40-afk/eurocomply_saas/.github/workflows/product-fria-ephemeral-qa.yml@refs/heads/main' }],
  ['wrong project ID', { RECOVERY_EPHEMERAL_PROJECT_ID: 'risck-recovery-elsewhere' }],
  ['wrong container ID', { RECOVERY_LOCAL_DB_CONTAINER: 'supabase_db_prod' }],
  ['missing IPv4 firewall', { RECOVERY_FIREWALL_IPV4: '' }],
  ['missing IPv6 firewall', { RECOVERY_FIREWALL_IPV6: '' }],
  ['unreviewed schema replay', { E2E_FRIA_PRE_RESTART_MIGRATION_COUNT: '0' }],
  ['external database', { RECOVERY_ISOLATED_DATABASE_URL: 'postgresql://postgres:synthetic@db.example.invalid:38083/postgres' }],
  ['wrong database bind', { RECOVERY_LOCAL_DB_HOST_PORT: '38084' }],
  ['production-like runner', { PLAYWRIGHT_USE_PRODUCTION_SERVER: 'true' }],
  ['Stripe secret present', { STRIPE_SECRET_KEY: 'sk_live_synthetic' }],
  ['outbound email credential present', { RESEND_API_KEY: 'synthetic-resend-key' }],
  ['actual production app', {}, 'https://www.risckcomply.com', 'http://127.0.0.1:54321'],
  ['actual production Supabase', {}, 'http://127.0.0.1:3000', 'https://tganhbbhfxcpblmgqprg.supabase.co'],
]) {
  test('payment-first FRIA preflight denies ' + name, () => {
    withEphemeralEnv(env, () => {
      assert.throws(
        () => assertIsolatedQaRuntime(appUrl ?? 'http://127.0.0.1:3000',
          dbUrl ?? 'http://127.0.0.1:54321'),
        /payment_first_runtime_requires_verified_ephemeral_qa/,
      );
    });
  });
}
