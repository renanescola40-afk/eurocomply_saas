import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Source regression: production provider-backed reports must not invent zero
// findings / a clean assessment on network, auth or licensing failure.
// Runtime authorization and cross-tenant negative proof require isolated QA.
const gen = readFileSync('src/lib/audit-pack/generator.ts', 'utf8');
const gap = readFileSync('src/lib/gap-analysis/storage.ts', 'utf8');
const work = readFileSync('src/lib/compliance/remediation.ts', 'utf8');
const board = readFileSync('src/lib/board-report/generator.ts', 'utf8');
const auditUi = readFileSync('src/app/[locale]/dashboard/audit-pack/audit-pack-client.tsx', 'utf8');
const boardUi = readFileSync('src/app/[locale]/dashboard/board-report/board-report-client.tsx', 'utf8');
const api = readFileSync('src/app/api/gap-analysis/route.ts', 'utf8');

test('Audit Pack uses strict provider-backed reads, never catch-to-empty helpers', () => {
  assert.match(gen, /import \{ loadLatestGapAssessment \} from ['"]@\/lib\/gap-analysis\/storage['"]/);
  assert.match(gen, /import \{ loadOpenComplianceWork \} from ['"]@\/lib\/compliance\/remediation['"]/);
  assert.match(gen, /loadLatestGapAssessment\(\{ userId: params\.userId, workspaceId: params\.workspaceId \|\| null \}\)/);
  assert.match(gen, /loadOpenComplianceWork\(\{ userId: params\.userId, workspaceId: params\.workspaceId \|\| null \}\)/);
  assert.doesNotMatch(gen, /\btryLoadLatestGapAssessment\b|\btryLoadOpenComplianceWork\b/);
  assert.match(gen, /Promise\.all\(\[/);
});

test('underlying strict readers do not swallow failure or silently return null/empty work', () => {
  assert.match(gap, /export async function loadLatestGapAssessment/);
  assert.match(gap, /const result = await gapApi<\{ assessment: LatestGapAssessment \| null \}>/);
  assert.match(gap, /return result\.assessment/);
  assert.match(work, /export async function loadOpenComplianceWork/);
  assert.match(work, /return await remediationApi<ComplianceWork>/);
  const strictGap=gap.split('export async function loadLatestGapAssessment',2)[1].split('export async function tryLoadLatestGapAssessment',1)[0];
  const strictWork=work.split('export async function loadOpenComplianceWork',2)[1].split('export async function tryLoadOpenComplianceWork',1)[0];
  assert.doesNotMatch(strictGap, /\bcatch\b|return null/);
  assert.doesNotMatch(strictWork, /\bcatch\b|return \{\s*findings:\s*\[\]/);
});

test('Board Report inherits strict Audit Pack provider errors instead of calculating false readiness', () => {
  assert.match(board, /const auditPack = await buildAuditPackData\(params\)/);
  assert.doesNotMatch(board, /tryLoadLatestGapAssessment|tryLoadOpenComplianceWork/);
});

test('both report clients clear stale data and show readback failure instead of export', () => {
  for (const ui of [auditUi, boardUi]) {
    assert.match(ui, /setData\(null\)/);
    assert.match(ui, /setLoadError\(/);
    assert.match(ui, /\brole="alert"/);
    assert.match(ui, /disabled=\{!data\}/);
  }
});

test('strict API is authenticated, organization-bound and requires plan for work', () => {
  assert.match(api, /requireApiUser\(\)/);
  assert.match(api, /requireGapOrganizationPermission\(user\.id, 'read_ai_governance'\)/);
  assert.match(api, /requireProfessionalRemediationPlan\(access\.organization\.id\)/);
  assert.match(api, /loadLatestAssessment\(access\.organization\.id, user\.id\)/);
  assert.match(api, /loadOpenWork\(access\.organization\.id, user\.id\)/);
});
