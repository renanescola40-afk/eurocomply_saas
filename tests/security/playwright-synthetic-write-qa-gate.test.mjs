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
  .replace('let db: URL;', 'let db;');
const assertSyntheticWriteQaEnvironment = runInNewContext(
  extracted + '\nassertSyntheticWriteQaEnvironment',
  { URL },
);

const valid = Object.freeze({
  E2E_BASE_URL: 'https://isolated-qa.example.invalid',
  NEXT_PUBLIC_SUPABASE_URL: 'https://disposableqastore.supabase.co',
  STRIPE_SECRET_KEY: 'sk_test_offline_synthetic',
  STRIPE_WEBHOOK_SECRET: 'whsec_offline_synthetic',
  E2E_QA_MAIL_SINK_CONFIRMED: 'true',
});

test('isolated QA and Stripe TEST fixture permit synthetic writes', () => {
  assert.doesNotThrow(() => assertSyntheticWriteQaEnvironment(valid));
});

for (const [name, override, failure] of [
  ['missing app', { E2E_BASE_URL: '' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production root app', { E2E_BASE_URL: 'https://risckcomply.com' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production www app', { E2E_BASE_URL: 'https://www.risckcomply.com' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['production subdomain', { E2E_BASE_URL: 'https://qa.risckcomply.com' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
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
  ['nested Supabase domain', { NEXT_PUBLIC_SUPABASE_URL: 'https://nested.disposableqastore.supabase.co' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database route', { NEXT_PUBLIC_SUPABASE_URL: 'https://disposableqastore.supabase.co/rest/v1' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database query', { NEXT_PUBLIC_SUPABASE_URL: 'https://disposableqastore.supabase.co/?s=1' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database fragment', { NEXT_PUBLIC_SUPABASE_URL: 'https://disposableqastore.supabase.co/#fragment' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database port', { NEXT_PUBLIC_SUPABASE_URL: 'https://disposableqastore.supabase.co:444' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
  ['database credentials', { NEXT_PUBLIC_SUPABASE_URL: 'https://bad@disposableqastore.supabase.co' }, /synthetic_write_requires_explicit_isolated_qa_origins/],
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
