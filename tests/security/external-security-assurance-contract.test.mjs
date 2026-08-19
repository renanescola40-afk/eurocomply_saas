import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const canonicalContract = await readFile('scripts/security/external-security-assurance-contract.mjs', 'utf8');
const releaseValidator = await readFile('scripts/release/validate-external-security-review-evidence.mjs', 'utf8');
const promotionValidator = await readFile('scripts/security/validate-external-security-assurance.mjs', 'utf8');
const workflow = await readFile('.github/workflows/external-security-assurance.yml', 'utf8');

test('canonical contract covers the principal enterprise attack surfaces', () => {
  for (const control of [
    'auth', 'RBAC', 'tenant isolation', 'APIs', 'BOLA/IDOR', 'uploads',
    'malware scanner', 'billing Stripe', 'webhooks', 'audit chain', 'exports',
    'GDPR delete', 'rate limiting', 'observability', 'secrets',
  ]) {
    assert.ok(canonicalContract.includes(`'${control}'`), `missing canonical scope control: ${control}`);
  }
  assert.match(canonicalContract, /risck-comply\.external-security-assurance\.v2/);
});

test('promotion validator delegates to canonical v2 plus freshness and exact-SHA validation', () => {
  assert.match(promotionValidator, /validateExternalSecurityReviewEvidence/);
  assert.match(releaseValidator, /validateExternalSecurityAssurance/);
  assert.match(promotionValidator, /expectedCommitSha: expectedSha/);
  assert.match(promotionValidator, /EXTERNAL_ASSURANCE_MAX_AGE_DAYS \|\| 180/);
  assert.match(promotionValidator, /ACCEPTED_FOR_ENTERPRISE_PROMOTION/);
  assert.match(promotionValidator, /process\.exitCode = 1/);
});

test('promotion validator emits only redacted canonical metadata and decision provenance', () => {
  assert.match(promotionValidator, /external-security-review-or-pentest\.json/);
  assert.match(promotionValidator, /evidenceCommitSha/);
  assert.match(promotionValidator, /evidenceSha256/);
  assert.match(promotionValidator, /rawReportStored: false/);
  assert.match(promotionValidator, /canonicalMetadataOnly: true/);
  assert.match(promotionValidator, /sensitiveKeyScanPassed/);
  assert.doesNotMatch(promotionValidator, /console\.log\(evidence\)/);
});

test('workflow uses protected isolated checkouts for release and evidence commits', () => {
  assert.match(workflow, /environment: external-security-assurance/);
  assert.match(workflow, /evidence_commit_sha:/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /Checkout immutable redacted evidence commit in isolation/);
  assert.match(workflow, /ref: \$\{\{ inputs\.evidence_commit_sha \}\}/);
  assert.match(workflow, /path: \$\{\{ env\.EVIDENCE_SOURCE_DIR \}\}/);
  assert.match(workflow, /git -C "\$EVIDENCE_SOURCE_DIR" rev-parse HEAD/);
  assert.match(workflow, /commits\/main/);
  assert.doesNotMatch(workflow, /git fetch --no-tags --depth=1 origin/);
  assert.match(workflow, /external-security-review-or-pentest\.json/);
});

test('only accepted evidence is eligible for retained Enterprise closure collection', () => {
  assert.match(workflow, /if: success\(\)/);
  assert.match(workflow, /external-security-assurance-accepted-/);
  assert.match(workflow, /external-security-assurance-rejected-/);
  assert.match(workflow, /retention-days: 365/);
  assert.match(workflow, /artifacts\/external-security-assurance-decision\.json/);
  assert.match(workflow, /docs\/security\/evidence\/runtime\/external-security-review-or-pentest\.json/);
});
