import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEnterpriseCloseoutQueue } from './build-enterprise-closeout-queue.mjs';

const sha = 'a'.repeat(40);
const controls = Object.fromEntries([
  'repositoryGates','runtimeCloseout','migrationPostExecution','branchProtection','backupRestore',
  'externalSecurityReview','qualifiedLegalReviews','releaseApproval','securityApproval','operationsApproval',
].map((control, index) => [control, { status: 'PASS', outcome: 'passed', digest: `${index}`.repeat(64).slice(0, 64) }]));

test('reports 100 only when every mandatory control is complete', () => {
  const result = buildEnterpriseCloseoutQueue({ decision: { releaseSha: sha, decision: 'ENTERPRISE_GO', controls }, expectedSha: sha });
  assert.equal(result.progressPercent, 100);
  assert.equal(result.status, 'READY_FOR_FINAL_APPROVAL');
  assert.equal(result.safety.enterpriseGoGrantedByThisArtifact, false);
});

test('classifies qualified legal review as owner action', () => {
  const broken = structuredClone(controls);
  broken.qualifiedLegalReviews = { status: 'BLOCKED', outcome: 'not_verified' };
  const result = buildEnterpriseCloseoutQueue({ decision: { releaseSha: sha, decision: 'ENTERPRISE_NO_GO', controls: broken }, expectedSha: sha });
  const item = result.queue.find((entry) => entry.control === 'qualifiedLegalReviews');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.progressPercent, 90);
  assert.equal(item.state, 'OWNER_ACTION_REQUIRED');
});

test('fails closed on stale SHA', () => {
  const result = buildEnterpriseCloseoutQueue({ decision: { releaseSha: 'b'.repeat(40), decision: 'ENTERPRISE_NO_GO', controls }, expectedSha: sha });
  assert.ok(result.failures.includes('release_sha_mismatch'));
  assert.equal(result.status, 'INVALID');
});
