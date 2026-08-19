import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const canonicalContract = await readFile('scripts/security/external-security-assurance-contract.mjs', 'utf8');
const releaseValidator = await readFile('scripts/release/validate-external-security-review-evidence.mjs', 'utf8');
const promotionValidator = await readFile('scripts/security/validate-external-security-assurance.mjs', 'utf8');
const workflow = await readFile('.github/workflows/external-security-assurance.yml', 'utf8');

test('canonical contract covers the principal enterprise attack surfaces', () => {
  for (const control of [
    'auth',
    'RBAC',
    'tenant isolation',
    'APIs',
    'BOLA/IDOR',
    'uploads',
    'malware scanner',
    'billing Stripe',
    'webhooks',
    'audit chain',
    'exports',
    'GDPR delete',
    'rate limiting',
    'observability',
    'secrets',
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
  assert.doesNotMatch(promotionValidator, /console\.log\(evidence\)/);
});

test('workflow is protected, exact-current-main bound and loads evidence from an immutable separate commit', () => {
  assert.match(workflow, /environment: external-security-assurance/);
  assert.match(workflow, /evidence_commit_sha:/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /test "\$\(git rev-parse origin\/main\)" = "\$RELEASE_SHA"/);
  assert.match(workflow, /git fetch --no-tags --depth=1 origin "\$EVIDENCE_COMMIT_SHA"/);
  assert.match(workflow, /git show "\$\{EVIDENCE_COMMIT_SHA\}:\$\{CANONICAL_EVIDENCE_PATH\}"/);
  assert.match(workflow, /external-security-review-or-pentest\.json/);
});

test('only accepted evidence is eligible for retained Enterprise closure collection', () => {
  assert.match(workflow, /if: success\(\)/);
  assert.match(workflow, /external-security-assurance-accepted-\$\{\{ inputs\.release_sha \}\}/);
  assert.match(workflow, /external-security-assurance-rejected-\$\{\{ inputs\.release_sha \}\}/);
  assert.match(workflow, /retention-days: 365/);
  assert.match(workflow, /artifacts\/external-security-assurance-decision\.json/);
  assert.match(workflow, /docs\/security\/evidence\/runtime\/external-security-review-or-pentest\.json/);
});
