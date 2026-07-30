import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyProof } from './verify-rls-reconciliation-proof.mjs';

const baseProof = `
rls|permissions|true|true
rls|role_permissions|true|true
rls|stripe_webhook_events|true|true
policy|permissions|permissions_authenticated_read|SELECT|authenticated
policy|role_permissions|role_permissions_authenticated_read|SELECT|authenticated
history|20260726070000|permissions_catalog_rls_hotfix
`;

test('accepts PostgreSQL boolean output rendered as true', () => {
  const report = verifyProof(baseProof);
  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.errors, []);
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

test('rejects missing migration evidence', () => {
  const report = verifyProof(baseProof.replace('history|20260726070000|permissions_catalog_rls_hotfix', ''));
  assert.equal(report.status, 'FAIL');
  assert.match(report.errors.join('\n'), /migration history/);
});

test('rejects RLS without force enabled', () => {
  const report = verifyProof(baseProof.replace('rls|permissions|true|true', 'rls|permissions|true|false'));
  assert.equal(report.status, 'FAIL');
  assert.match(report.errors.join('\n'), /FORCE ROW LEVEL SECURITY/);
});
