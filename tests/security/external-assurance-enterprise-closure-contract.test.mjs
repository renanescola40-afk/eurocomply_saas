import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = JSON.parse(readFileSync('config/enterprise-100-closure.json', 'utf8'));
const checker = readFileSync('scripts/release/check-enterprise-100-closure.mjs', 'utf8');
const bundle = readFileSync('scripts/release/verify-enterprise-evidence-bundle.mjs', 'utf8');
const runtimeWriter = readFileSync('scripts/release/write-enterprise-runtime-evidence.mjs', 'utf8');
const shaBinding = readFileSync('scripts/release/evidence-sha-binding.mjs', 'utf8');
const externalValidator = readFileSync('scripts/release/validate-external-security-review-evidence.mjs', 'utf8');

const externalControl = config.controls.find((control) => control.id === 'external-security-assurance');

test('Enterprise 100 closure contains an explicit external assurance control', () => {
  assert.ok(externalControl, 'external-security-assurance control is required');
  assert.equal(externalControl.evidence, 'docs/security/evidence/runtime/external-security-review-or-pentest.json');
  assert.ok(externalControl.acceptedStatuses.includes('PASS'));
  assert.ok(externalControl.acceptedStatuses.includes('COMPLETE'));
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
