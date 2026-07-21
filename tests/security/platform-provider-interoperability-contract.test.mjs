import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync('scripts/platform/probe-provider-interoperability.mjs', 'utf8');

test('provider probes are read only', () => {
  assert.match(script, /request\(/);
  assert.doesNotMatch(script, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
});

test('evidence schema explicitly excludes sensitive values', () => {
  assert.match(script, /secret_values_included:\s*false/);
  assert.match(script, /provider_ids_included:\s*false/);
  assert.match(script, /account_emails_included:\s*false/);
  assert.doesNotMatch(script, /results\.push\([^\n]*(?:secret|token|anon)/i);
  assert.doesNotMatch(script, /JSON\.stringify\((?:secret|token|anon)\)/i);
});

test('strict mode fails closed', () => {
  assert.match(script, /--strict/);
  assert.match(script, /process\.exitCode = 1/);
  assert.match(script, /strict \? 'FAIL'/);
});

test('supabase auth and Google provider are checked', () => {
  assert.match(script, /\/auth\/v1\/settings/);
  assert.match(script, /Google OAuth provider reported enabled/);
});

test('stripe account and enabled webhook endpoint are checked', () => {
  assert.match(script, /(^|[^A-Za-z0-9.])api\.stripe\.com\/v1\/account(?:[/?'"\\\s]|$)/);
  assert.match(script, /webhook_endpoints\?limit=100/);
  assert.match(script, /status === 'enabled'/);
});

test('sentry project access is checked', () => {
  assert.match(script, /sentry\.io\/api\/0\/projects/);
  assert.match(script, /Configured Sentry project resolved/);
});
