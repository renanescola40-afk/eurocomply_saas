import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Source-wiring regression for fail-closed evidence coverage. Real provider
// authorization and same/cross-tenant downloads still require isolated QA.
const generator = readFileSync('src/lib/audit-pack/generator.ts', 'utf8');
const vaultPage = readFileSync('src/app/[locale]/dashboard/evidence/evidence-vault-client.tsx', 'utf8');
const auditPage = readFileSync('src/app/[locale]/dashboard/audit-pack/page.tsx', 'utf8');
const boardPage = readFileSync('src/app/[locale]/dashboard/board-report/page.tsx', 'utf8');
const storage = readFileSync('src/lib/evidence/storage.ts', 'utf8');

test('audit generator resolves tenant before fetching evidence', () => {
  assert.match(generator, /resolveEvidenceOrganization\(params\.userId, params\.organizationId\)/);
  assert.match(generator, /listEvidenceItems\(\{ organizationId, limit: 100 \}\)/);
  assert.doesNotMatch(generator, /tryListEvidenceItems|Promise\.resolve\(\[\]\)/);
});

test('provider errors propagate through evidence listing', () => {
  assert.match(storage, /export async function listEvidenceItems/);
  assert.match(storage, /if \(error\) throw error/);
  assert.match(generator, /listEvidenceItems\(\{/);
});

test('Evidence Vault register surfaces database or authorization errors', () => {
  assert.match(vaultPage, /await listEvidenceItems\(\{ organizationId: resolvedOrganizationId, limit: 50 \}\)/);
  assert.match(vaultPage, /setTenantError\(error instanceof Error/);
  assert.doesNotMatch(vaultPage, /tryListEvidenceItems/);
});

test('audit and leadership pages clear stale data and show readback failures', () => {
  for (const source of [auditPage, boardPage]) {
    assert.match(source, /setData\(null\)/);
    assert.match(source, /setLoadError\(/);
    assert.match(source, /finally\s*\{/);
    assert.match(source, /role="alert"/);
    assert.match(source, /disabled=\{!data\}/);
  }
});

test('evidence reads are not converted to an empty fake audit register', () => {
  assert.doesNotMatch(generator, /Promise\.resolve\(\[\]\)/);
  assert.doesNotMatch(generator, /tryListEvidenceItems/);
  assert.match(generator, /evidenceCoverage:\s*evidenceSummary\.coverage/);
});
