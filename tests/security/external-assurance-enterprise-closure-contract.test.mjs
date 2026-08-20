import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = JSON.parse(readFileSync('config/enterprise-100-closure.json', 'utf8'));
const checker = readFileSync('scripts/release/check-enterprise-100-closure.mjs', 'utf8');
const bundle = readFileSync('scripts/release/verify-enterprise-evidence-bundle.mjs', 'utf8');
const runtimeWriter = readFileSync('scripts/release/write-enterprise-runtime-evidence.mjs', 'utf8');
const shaBinding = readFileSync('scripts/release/evidence-sha-binding.mjs', 'utf8');
const externalValidator = readFileSync('scripts/release/validate-external-security-review-evidence.mjs', 'utf8');
const collector = readFileSync('scripts/enterprise/collect-github-exact-sha-artifacts.mjs', 'utf8');
const acceptanceWorkflow = readFileSync('.github/workflows/external-security-assurance.yml', 'utf8');
const closureWorkflow = readFileSync('.github/workflows/enterprise-100-closure.yml', 'utf8');

const externalControl = config.controls.find((control) => control.id === 'external-security-assurance');

test('Enterprise 100 closure contains the canonical external assurance authority control', () => {
  assert.ok(externalControl, 'external-security-assurance control is required');
  assert.equal(externalControl.owner, 'external-assurance');
  assert.equal(externalControl.evidence, 'external-security-assurance-decision.json');
  assert.deepEqual(externalControl.acceptedStatuses, ['ACCEPTED_FOR_ENTERPRISE_PROMOTION']);
});

test('Enterprise 100 closure semantically validates external assurance instead of trusting status alone', () => {
  assert.match(checker, /control\.id === 'external-security-assurance'/);
  assert.match(checker, /validateExternalSecurityReviewEvidence/);
  assert.match(checker, /expectedCommitSha: expectedSha/);
  assert.match(checker, /semanticFailures\.length === 0/);
  assert.match(checker, /semantic_evidence_contract_failed/);
});

test('enterprise bundle and runtime writer make external assurance exact-SHA bound', () => {
  assert.match(bundle, /external-security-review-or-pentest\.json', commitBound: true, validator: 'external-assurance'/);
  assert.match(bundle, /validateExternalSecurityReviewEvidence/);
  assert.match(runtimeWriter, /external-security-review-or-pentest\.json`, true, true/);
  assert.match(runtimeWriter, /validateExternalSecurityReviewEvidence/);
  assert.match(runtimeWriter, /expectedCommitSha: commitSha/);
});

test('shared SHA resolver recognizes the tested product SHA nested under testBinding', () => {
  assert.match(shaBinding, /testBinding\.productSha/);
  assert.match(shaBinding, /document\?\.testBinding\?\.productSha/);
});

test('release validator delegates to the canonical external assurance contract and retains freshness', () => {
  assert.match(externalValidator, /validateExternalSecurityAssurance/);
  assert.match(externalValidator, /resolveExternalAssuranceExpectedSha/);
  assert.match(externalValidator, /external review is older than \$\{maxAgeDays\} days/);
});

test('accepted external assurance has an authorized exact-SHA producer in Enterprise 100 collection', () => {
  assert.match(collector, /workflow: 'external-security-assurance\.yml'/);
  assert.match(collector, /workflowPath: '\.github\/workflows\/external-security-assurance\.yml'/);
  assert.match(collector, /external-security-assurance-accepted-\*/);
  assert.doesNotMatch(collector, /external-security-assurance-rejected-\*/);
});

test('protected acceptance workflow separates release SHA from immutable evidence commit SHA', () => {
  assert.match(acceptanceWorkflow, /release_sha:/);
  assert.match(acceptanceWorkflow, /evidence_commit_sha:/);
  assert.match(acceptanceWorkflow, /environment: external-security-assurance/);
  assert.match(acceptanceWorkflow, /commits\/main/);
  assert.match(acceptanceWorkflow, /Checkout immutable redacted evidence commit in isolation/);
  assert.match(acceptanceWorkflow, /path: \$\{\{ env\.EVIDENCE_SOURCE_DIR \}\}/);
  assert.match(acceptanceWorkflow, /git -C "\$EVIDENCE_SOURCE_DIR" rev-parse HEAD/);
  assert.match(acceptanceWorkflow, /external-security-assurance-accepted-/);
  assert.match(acceptanceWorkflow, /external-security-assurance-rejected-/);
});

test('external assurance completion retriggers same-SHA Enterprise 100 closure', () => {
  assert.match(closureWorkflow, /- 'External Security Assurance Acceptance'/);
  assert.match(closureWorkflow, /github\.event\.workflow_run\.head_sha/);
  assert.match(closureWorkflow, /cancel-in-progress: true/);
});
