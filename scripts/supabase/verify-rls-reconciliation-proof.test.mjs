import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyProof } from './verify-rls-reconciliation-proof.mjs';

const baseProof = `
rls|permissions|true|true
rls|role_permissions|true|true
rls|stripe_webhook_events|true|true
policy|permissions|permissions_authenticated_read|SELECT|authenticated
policy|role_permissions|role_permissions_authenticated_read|SELECT|authenticated
grant|permissions|authenticated|SELECT
grant|permissions|service_role|SELECT
grant|permissions|service_role|INSERT
grant|permissions|service_role|UPDATE
grant|permissions|service_role|DELETE
grant|role_permissions|authenticated|SELECT
grant|role_permissions|service_role|SELECT
grant|role_permissions|service_role|INSERT
grant|role_permissions|service_role|UPDATE
grant|role_permissions|service_role|DELETE
grant|stripe_webhook_events|service_role|SELECT
grant|stripe_webhook_events|service_role|INSERT
grant|stripe_webhook_events|service_role|UPDATE
grant|stripe_webhook_events|service_role|DELETE
history|20260726070000|permissions_catalog_rls_hotfix
history|20260812224650|tighten_permissions_catalog_authenticated_grants
`;

test('accepts PostgreSQL boolean output rendered as true and least-privilege grants', () => {
  const report = verifyProof(baseProof);
  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.unexpectedClientGrants, 0);
});

test('accepts PostgreSQL boolean output rendered as t', () => {
  const report = verifyProof(baseProof.replaceAll('true', 't'));
  assert.equal(report.status, 'PASS');
});

test('rejects a webhook policy', () => {
  const report = verifyProof(`${baseProof}policy|stripe_webhook_events|unsafe_read|SELECT|authenticated\n`);
  assert.equal(report.status, 'FAIL');
  assert.match(report.errors.join('\n'), /policy-free/);
});

test('rejects missing grant-hardening migration evidence', () => {
  const report = verifyProof(baseProof.replace('history|20260812224650|tighten_permissions_catalog_authenticated_grants\n', ''));
  assert.equal(report.status, 'FAIL');
  assert.match(report.errors.join('\n'), /20260812224650/);
});

test('rejects RLS without force enabled', () => {
  const report = verifyProof(baseProof.replace('rls|permissions|true|true', 'rls|permissions|true|false'));
  assert.equal(report.status, 'FAIL');
  assert.match(report.errors.join('\n'), /FORCE ROW LEVEL SECURITY/);
});

test('rejects authenticated write privileges even when RLS policies remain read-only', () => {
  const report = verifyProof(`${baseProof}grant|permissions|authenticated|UPDATE\n`);
  assert.equal(report.status, 'FAIL');
  assert.match(report.errors.join('\n'), /Unexpected client privilege: permissions\|authenticated\|UPDATE/);
});

test('rejects anonymous or PUBLIC privileges', () => {
  const report = verifyProof(`${baseProof}grant|role_permissions|anon|SELECT\ngrant|permissions|PUBLIC|SELECT\n`);
  assert.equal(report.status, 'FAIL');
  assert.match(report.errors.join('\n'), /role_permissions\|anon\|SELECT/);
  assert.match(report.errors.join('\n'), /permissions\|PUBLIC\|SELECT/);
});

test('rejects missing service-role CRUD evidence', () => {
  const report = verifyProof(baseProof.replace('grant|stripe_webhook_events|service_role|DELETE\n', ''));
  assert.equal(report.status, 'FAIL');
  assert.match(report.errors.join('\n'), /Missing required privilege evidence: stripe_webhook_events\|service_role\|DELETE/);
});
