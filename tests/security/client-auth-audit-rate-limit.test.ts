import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const actionPath = new URL('../../src/server/actions/auth-audit.ts', import.meta.url);

test('client auth audit events are protected by the fail-closed auth rate-limit policy', async () => {
  const source = await readFile(actionPath, 'utf8');

  assert.match(source, /checkDistributedRateLimit\(\{/);
  assert.match(source, /policy:\s*'auth'/);
  assert.match(source, /failureMode:\s*'fail-closed'/);
  assert.match(source, /route:\s*'server-action:auditClientAuthEvent'/);
  assert.match(source, /if \(!rateLimit\.allowed\)\s*\{[\s\S]*reason:\s*'rate_limited'/);
});

test('unauthenticated login-failure audit limiting is request-scoped without persisting raw network identifiers', async () => {
  const source = await readFile(actionPath, 'utf8');

  assert.match(source, /await headers\(\)/);
  assert.match(source, /x-forwarded-for/);
  assert.match(source, /user-agent/);
  assert.match(source, /ip,\s*\n\s*userAgent,/);
  assert.doesNotMatch(source, /metadata:\s*\{[\s\S]*\bip\b/);
  assert.doesNotMatch(source, /metadata:\s*\{[\s\S]*\buserAgent\b/);
});
