import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const actionPath = new URL('../../src/server/actions/auth-audit.ts', import.meta.url);

test('client auth audit events are protected by the fail-closed auth rate-limit policy', async () => {
  const source = await readFile(actionPath, 'utf8');

  expect(source).toMatch(/checkDistributedRateLimit\(\{/);
  expect(source).toMatch(/policy:\s*'auth'/);
  expect(source).toMatch(/failureMode:\s*'fail-closed'/);
  expect(source).toMatch(/route:\s*'server-action:auditClientAuthEvent'/);
  expect(source).toMatch(/if \(!rateLimit\.allowed\)\s*\{[\s\S]*reason:\s*'rate_limited'/);
});

test('unauthenticated login-failure audit limiting is request-scoped without persisting raw network identifiers', async () => {
  const source = await readFile(actionPath, 'utf8');

  expect(source).toMatch(/await headers\(\)/);
  expect(source).toMatch(/x-forwarded-for/);
  expect(source).toMatch(/user-agent/);
  expect(source).toMatch(/ip,\s*\n\s*userAgent,/);
  expect(source).not.toMatch(/metadata:\s*\{[\s\S]*\bip\b/);
  expect(source).not.toMatch(/metadata:\s*\{[\s\S]*\buserAgent\b/);
});
