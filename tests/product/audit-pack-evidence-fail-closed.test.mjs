import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Source-wiring regression for fail-closed evidence coverage. Real provider
// authorization and same/cross-tenant downloads still require isolated QA.
const generator = readFileSync('src/lib/audit-pack/generator.ts', 'utf8');
const vaultPage = readFileSync('src/app/[locale]/dashboard/evidence/evidence-vault-client.tsx', 'utf8');
const auditPage = readFileSync('src/app/[locale]/dashboard/audit-pack/audit-pack-client.tsx', 'utf8');
const boardPage = readFileSync('src/app/[locale]/dashboard/board-report/board-report-client.tsx', 'utf8');
const auditRoute = readFileSync('src/app/[locale]/dashboard/audit-pack/page.tsx', 'utf8');
const boardRoute = readFileSync('src/app/[locale]/dashboard/board-report/page.tsx', 'utf8');
const boardGenerator = readFileSync('src/lib/board-report/generator.ts', 'utf8');
const storage = readFileSync('src/lib/evidence/storage.ts', 'utf8');

test('audit generator resolves tenant before fetching evidence', () => {
  assert.match(generator, /resolveEvidenceOrganization\(params\.userId, params\.organizationId\)/);
  assert.match(generator, /listEvidenceItemsForReport\(\{ organizationId \}\)/);
  assert.doesNotMatch(generator, /tryListEvidenceItems|Promise\.resolve\(\[\]\)/);
});

test('provider errors propagate through evidence listing', () => {
  assert.match(storage, /export async function listEvidenceItems/);
  assert.match(storage, /if \(error\) throw error/);
  assert.match(generator, /listEvidenceItemsForReport\(\{/);
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
    assert.match(source, /\{loadError \? null : !data \? \(/);
    assert.match(source, /disabled=\{!data\}/);
  }
});

test('evidence reads are not converted to an empty fake audit register', () => {
  assert.doesNotMatch(generator, /Promise\.resolve\(\[\]\)/);
  assert.doesNotMatch(generator, /tryListEvidenceItems/);
  assert.match(generator, /evidenceCoverage:\s*evidenceSummary\.coverage/);
});


test('both report routes bind a server-authorized current organization', () => {
  for (const route of [auditRoute, boardRoute]) {
    assert.match(route, /requireCurrentUser\(\)/);
    assert.match(route, /getCurrentOrganizationForUser\(user\.id\)/);
    assert.match(route, /canonicalOrganizationId: context\.organization\.id/);
  }
  assert.match(auditPage, /organizationId: canonicalOrganizationId/);
  assert.match(boardPage, /organizationId: canonicalOrganizationId/);
  assert.match(boardGenerator, /organizationId\?: string \| null/);
});

test('audit and board reports never compute coverage from the first 100 records only', () => {
  assert.match(generator, /listEvidenceItemsForReport\(\{ organizationId \}\)/);
  assert.doesNotMatch(generator, /listEvidenceItems\(\{ organizationId, limit: 100 \}\)/);
  assert.match(storage, /export async function listEvidenceItemsForReport/);
  assert.match(storage, /collectEvidencePages<EvidenceItem>/);
  assert.match(storage, /select\('id', \{ count: 'exact', head: true \}\)/);
  assert.match(storage, /beforeCount !== afterCount \|\| beforeCount !== items\.length/);
  assert.match(storage, /order\('created_at', \{ ascending: false \}\)/);
  assert.match(storage, /order\('id', \{ ascending: false \}\)/);
});

test('both report clients invalidate stale tenant and user requests before committing state', () => {
  for (const source of [auditPage, boardPage]) {
    assert.match(source, /import \{[^}]*useRef[^}]*\} from 'react'/);
    assert.match(source, /const latestRequest = useRef\(0\)/);
    assert.match(source, /const requestId = \+\+latestRequest\.current/);
    assert.match(source, /if \(requestId === latestRequest\.current\) setData\(/);
    assert.match(source, /if \(requestId === latestRequest\.current\) \{\s*setLoadError\(/);
    assert.match(source, /if \(requestId === latestRequest\.current\) setLoading\(false\)/);
    assert.match(source, /return \(\) => \{ latestRequest\.current \+= 1; \}/);
    assert.match(source, /\[user\?\.id, canonicalOrganizationId\]/);
    assert.doesNotMatch(source, /\n\s*setData\((?:pack|report)\);/);
  }
});
