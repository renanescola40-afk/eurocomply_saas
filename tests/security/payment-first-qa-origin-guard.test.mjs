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
  .replace('let db: URL;', 'let db;');
const assertIsolatedQaRuntime = runInNewContext(
  plainGuard + '\nassertIsolatedQaRuntime',
  { URL },
);

const app = 'https://disposable-qa.example.invalid';
const db = 'https://disposableqasandbox.supabase.co';

test('disposable HTTPS app and nonproduction Supabase origin pass the guard', () => {
  assert.doesNotThrow(() => assertIsolatedQaRuntime(app, db));
});

for (const [name, appURL, dbURL] of [
  ['production app', 'https://www.risckcomply.com', db],
  ['production root', 'https://risckcomply.com', db],
  ['production subdomain', 'https://qa.risckcomply.com', db],
  ['production trailing DNS dot', 'https://www.risckcomply.com.', db],
  ['non-TLS application', 'http://disposable-qa.example.invalid', db],
  ['application credentials', 'https://qa:password@disposable-qa.example.invalid', db],
  ['application port', 'https://disposable-qa.example.invalid:444', db],
  ['application route', 'https://disposable-qa.example.invalid/en', db],
  ['application query', 'https://disposable-qa.example.invalid/?foo=x', db],
  ['application fragment', 'https://disposable-qa.example.invalid/#dashboard', db],
  ['production Supabase', app, 'https://tganhbbhfxcpblmgqprg.supabase.co'],
  ['untrusted database domain', app, 'https://disposable.example.invalid'],
  ['nested database hostname', app, 'https://sub.disposableqasandbox.supabase.co'],
  ['database credentials', app, 'https://bad@disposableqasandbox.supabase.co'],
  ['database HTTP', app, 'http://disposableqasandbox.supabase.co'],
  ['database path', app, 'https://disposableqasandbox.supabase.co/rest/v1'],
  ['database query', app, 'https://disposableqasandbox.supabase.co/?s=1'],
  ['database fragment', app, 'https://disposableqasandbox.supabase.co/#secret'],
  ['database nonstandard port', app, 'https://disposableqasandbox.supabase.co:444'],
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

test('runtime guard executes before any Playwright browser or provider request', () => {
  const call = source.indexOf('  assertIsolatedQaRuntime(baseURL, supabaseUrl);');
  const browser = source.indexOf('  const browser = await chromium.launch();');
  assert.ok(call > 0 && browser > call, 'unsafe provider access must be preceded by isolation check');
  assert.match(source, /if \(!shouldRunPaymentFirstRuntimeProof\(\)\) return;/);
});
