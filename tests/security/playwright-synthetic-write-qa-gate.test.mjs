import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Executes the actual Playwright configuration guard without importing
// Playwright, launching browsers, contacting providers or loading secrets.
const config = readFileSync(new URL('../../playwright.config.ts', import.meta.url), 'utf8');
const start = config.indexOf('function assertSyntheticWriteQaEnvironment(');
const end = config.indexOf('\nif (process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES', start);
assert.ok(start >= 0 && end > start, 'central synthetic-write QA guard is required');
const extracted = config.slice(start, end)
  .replace('env: NodeJS.ProcessEnv', 'env')
  .replace('let app: URL;', 'let app;')
  .replace('let db: URL;', 'let db;')
  .replace('let isolatedDb: URL | null = null;', 'let isolatedDb = null;');
const assertSyntheticWriteQaEnvironment = runInNewContext(
  extracted + '\nassertSyntheticWriteQaEnvironment',
  { URL },
);

const valid = Object.freeze({
  E2E_BASE_URL: 'https://isolated-qa.example.invalid',
  NEXT_PUBLIC_SUPABASE_URL: 'https://zrxrrfbllsxtleyxjpsz.supabase.co',
  E2E_QA_APPROVED_SUPABASE_REF: 'zrxrrfbllsxtleyxjpsz',
  STRIPE_SECRET_KEY: 'sk_test_offline_synthetic',
  STRIPE_WEBHOOK_SECRET: 'whsec_offline_synthetic',
  E2E_QA_MAIL_SINK_CONFIRMED: 'true',
});

const ephemeral = Object.freeze({
  GITHUB_ACTIONS: 'true',
  GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
  GITHUB_WORKFLOW: 'Product FRIA Ephemeral Runtime QA',
  GITHUB_WORKFLOW_REF:
    'renanescola40-afk/eurocomply_saas/.github/workflows/product-fria-ephemeral-qa.yml@refs/pull/2738/merge',
  GITHUB_EVENT_NAME: 'pull_request',
  GITHUB_RUN_ID: '43708930485',
  GITHUB_RUN_ATTEMPT: '1',
  RUNNER_TEMP: '/home/runner/work/_temp',
  E2E_BASE_URL: 'http://127.0.0.1:3000',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
  SITE_URL: 'http://127.0.0.1:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-anon-test-only',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role-test-only',
  RECOVERY_ISOLATED_DATABASE_URL: 'postgresql://postgres:synthetic-db-password@127.0.0.1:54277/postgres',
  RECOVERY_LOCAL_DB_HOST_PORT: '54277',
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
});

test('Product FRIA GitHub Actions permits only its attested disposable loopback runtime', () => {
  assert.doesNotThrow(() => assertSyntheticWriteQaEnvironment(ephemeral));
  assert.doesNotThrow(() => assertSyntheticWriteQaEnvironment({
    ...ephemeral,
    GITHUB_EVENT_NAME: 'push',
    GITHUB_WORKFLOW_REF:
      'renanescola40-afk/eurocomply_saas/.github/workflows/product-fria-ephemeral-qa.yml@refs/heads/main',
  }));
});

for (const [name, override] of [
  ['local developer process', { GITHUB_ACTIONS: '' }],
  ['different repository', { GITHUB_REPOSITORY: 'outsider/untrusted' }],
  ['other workflow', { GITHUB_WORKFLOW: 'Any Other Workflow' }],
  ['untrusted source', { GITHUB_WORKFLOW_REF: 'outsider/untrusted/.github/workflows/product-fria-ephemeral-qa.yml@refs/pull/2738/merge' }],
  ['wrong event/ref pairing', { GITHUB_EVENT_NAME: 'pull_request', GITHUB_WORKFLOW_REF: 'renanescola40-afk/eurocomply_saas/.github/workflows/product-fria-ephemeral-qa.yml@refs/heads/main' }],
  ['unapproved workflow dispatch', { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: 'renanescola40-afk/eurocomply_saas/.github/workflows/product-fria-ephemeral-qa.yml@refs/pull/2738/merge' }],
  ['unsafe app hostname', { E2E_BASE_URL: 'http://localhost:3000' }],
  ['Production app', { E2E_BASE_URL: 'https://www.risckcomply.com' }],
  ['Production Supabase', { NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co' }],
  ['unexpected local REST port', { NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54322' }],
  ['origin mismatch', { SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co' }],
  ['missing verified provisioning', { RECOVERY_EPHEMERAL_DATABASE_PROVISIONED: '' }],
  ['wrong project mode', { RECOVERY_EPHEMERAL_DATABASE_MODE: 'restore-target' }],
  ['stale run', { GITHUB_RUN_ID: '43708930484' }],
  ['unbound project', { RECOVERY_EPHEMERAL_PROJECT_ID: 'risck-recovery-1-1' }],
  ['unbound workdir', { RECOVERY_EPHEMERAL_WORKDIR: '/tmp/other' }],
  ['unbound container', { RECOVERY_LOCAL_DB_CONTAINER: 'supabase_db_prod' }],
  ['missing IPv4 firewall', { RECOVERY_FIREWALL_IPV4: 'false' }],
  ['missing IPv6 firewall', { RECOVERY_FIREWALL_IPV6: '' }],
  ['no replay proof', { E2E_FRIA_PRE_RESTART_MIGRATION_COUNT: '0' }],
  ['false canonical replay', { RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL: 'true' }],
  ['remote database connection', { RECOVERY_ISOLATED_DATABASE_URL: 'postgresql://postgres:synthetic@db.risckcomply.com:54277/postgres' }],
  ['database port mismatch', { RECOVERY_LOCAL_DB_HOST_PORT: '54321' }],
  ['missing Auth grant', { NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }],
  ['missing service-role key', { SUPABASE_SERVICE_ROLE_KEY: '' }],
  ['missing commercial fixture', { E2E_FRIA_COMMERCIAL_AUTHORITY_VERIFIED: '' }],
  ['production-like test', { PLAYWRIGHT_USE_PRODUCTION_SERVER: 'true' }],
  ['Stripe LIVE secret', { STRIPE_SECRET_KEY: 'sk_live_synthetic' }],
  ['Stripe TEST secret also excluded from ephemeral lane', { STRIPE_SECRET_KEY: 'sk_test_synthetic' }],
  ['outbound mail provider', { RESEND_API_KEY: 're_synthetic' }],
  ['outbound SMTP', { SMTP_HOST: 'smtp.example.invalid' }],
]) {
  test('disposable FRIA preflight rejects ' + name, () => {
    assert.throws(
      () => assertSyntheticWriteQaEnvironment({ ...ephemeral, ...override }),
      /synthetic_write_requires_verified_ephemeral_runtime/,
    );
  });
}

test('isolated QA and Stripe TEST fixture permit synthetic writes', () => {
  assert.doesNotThrow(() => assertSyntheticWriteQaEnvironment(valid));
});

for (const [name, override, failure] of [
  ['missing app', { E2E_BASE_URL: '' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production root app', { E2E_BASE_URL: 'https://risckcomply.com' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production www app', { E2E_BASE_URL: 'https://www.risckcomply.com' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production subdomain', { E2E_BASE_URL: 'https://qa.risckcomply.com' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production Vercel eurocomply-saas.vercel.app', { E2E_BASE_URL: 'https://eurocomply-saas.vercel.app' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production Vercel eurocomply-saas-renanescola40-afks-projects.vercel.app', { E2E_BASE_URL: 'https://eurocomply-saas-renanescola40-afks-projects.vercel.app' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production Vercel eurocomply-saas-git-main-renanescola40-afks-projects.vercel.app', { E2E_BASE_URL: 'https://eurocomply-saas-git-main-renanescola40-afks-projects.vercel.app' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production Vercel eurocomply-saas-o6ws7qrp2-renanescola40-afks-projects.vercel.app', { E2E_BASE_URL: 'https://eurocomply-saas-o6ws7qrp2-renanescola40-afks-projects.vercel.app' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production app trailing dot', { E2E_BASE_URL: 'https://www.risckcomply.com.' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['http app', { E2E_BASE_URL: 'http://isolated-qa.example.invalid' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['app path', { E2E_BASE_URL: 'https://isolated-qa.example.invalid/login' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['app query', { E2E_BASE_URL: 'https://isolated-qa.example.invalid/?login=1' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['app fragment', { E2E_BASE_URL: 'https://isolated-qa.example.invalid/#dashboard' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['app credentials', { E2E_BASE_URL: 'https://user:pass@isolated-qa.example.invalid' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['app port', { E2E_BASE_URL: 'https://isolated-qa.example.invalid:444' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['missing database', { NEXT_PUBLIC_SUPABASE_URL: '' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production database', { NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['fake Supabase domain', { NEXT_PUBLIC_SUPABASE_URL: 'https://fake-supabase.example.invalid' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['nested Supabase domain', { NEXT_PUBLIC_SUPABASE_URL: 'https://nested.zrxrrfbllsxtleyxjpsz.supabase.co' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database route', { NEXT_PUBLIC_SUPABASE_URL: 'https://zrxrrfbllsxtleyxjpsz.supabase.co/rest/v1' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database query', { NEXT_PUBLIC_SUPABASE_URL: 'https://zrxrrfbllsxtleyxjpsz.supabase.co/?s=1' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database fragment', { NEXT_PUBLIC_SUPABASE_URL: 'https://zrxrrfbllsxtleyxjpsz.supabase.co/#fragment' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database port', { NEXT_PUBLIC_SUPABASE_URL: 'https://zrxrrfbllsxtleyxjpsz.supabase.co:444' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database credentials', { NEXT_PUBLIC_SUPABASE_URL: 'https://bad@zrxrrfbllsxtleyxjpsz.supabase.co' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['missing approved Supabase ref', { E2E_QA_APPROVED_SUPABASE_REF: '' }, /synthetic_write_requires_approved_qa_database_ref/],
  ['wrong approved Supabase ref', { E2E_QA_APPROVED_SUPABASE_REF: 'anotherisolatedqa123' }, /synthetic_write_requires_approved_qa_database_ref/],
  ['actual QA hostname differs from approved ref', { NEXT_PUBLIC_SUPABASE_URL: 'https://elsewhereexample1234.supabase.co' }, /synthetic_write_requires_approved_qa_database_ref/],
  ['production ref cannot be approved as QA', { NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co', E2E_QA_APPROVED_SUPABASE_REF: 'tganhbbhfxcpblmgqprg' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['Stripe LIVE key', { STRIPE_SECRET_KEY: 'sk_live_fake' }, /synthetic_write_requires_stripe_test_credentials/],
  ['missing Stripe key', { STRIPE_SECRET_KEY: '' }, /synthetic_write_requires_stripe_test_credentials/],
  ['missing signing secret', { STRIPE_WEBHOOK_SECRET: '' }, /synthetic_write_requires_stripe_test_credentials/],
  ['unconfirmed mail sink', { E2E_QA_MAIL_SINK_CONFIRMED: 'false' }, /synthetic_write_requires_qa_mail_sink/],
  ['production-like server', { PLAYWRIGHT_USE_PRODUCTION_SERVER: 'true' }, /synthetic_write_cannot_use_production_server_gate/],
]) {
  test('synthetic-write preflight rejects ' + name, () => {
    assert.throws(() => assertSyntheticWriteQaEnvironment({ ...valid, ...override }), failure);
  });
}

test('write gate executes before defineConfig or webServer startup', () => {
  const guardCall = config.indexOf('  assertSyntheticWriteQaEnvironment(process.env);');
  const configCall = config.indexOf('export default defineConfig({');
  assert.ok(guardCall > 0 && configCall > guardCall);
  assert.match(config, /if \(process\.env\.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true'\)/);
});
