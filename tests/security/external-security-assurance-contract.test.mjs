import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scope = JSON.parse(await readFile('docs/security/external-assurance-scope.json', 'utf8'));
const validator = await readFile('scripts/security/validate-external-security-assurance.mjs', 'utf8');
const workflow = await readFile('.github/workflows/external-security-assurance.yml', 'utf8');

test('scope covers the principal enterprise attack surfaces', () => {
  assert.equal(scope.schema_version, 1);
  assert.ok(scope.required_assurance_types.length >= 4);
  assert.ok(scope.minimum_test_classes.includes('cross_tenant_access'));
  assert.ok(scope.minimum_test_classes.includes('broken_object_level_authorization'));
  assert.ok(scope.minimum_test_classes.includes('webhook_replay_and_idempotency'));
  assert.ok(scope.release_blockers.includes('open_critical'));
  assert.ok(scope.release_blockers.includes('open_high'));
});

test('validator binds evidence to exact main SHA and independent reviewer', () => {
  assert.match(validator, /RELEASE_SHA must be a full lowercase 40-character SHA/);
  assert.match(validator, /sha_mismatch/);
  assert.match(validator, /branch_mismatch/);
  assert.match(validator, /reviewer_independent/);
  assert.match(validator, /missing_independence_attestation/);
  assert.match(validator, /expired_report/);
});

test('validator rejects unresolved severe findings and missing retests', () => {
  assert.match(validator, /open_\$\{finding\.severity\}/);
  assert.match(validator, /missing_retest/);
  assert.match(validator, /review_not_passing/);
  assert.match(validator, /process\.exitCode = 1/);
});

test('validator redacts the evidence boundary', () => {
  assert.match(validator, /sensitiveKeyPattern/);
  assert.match(validator, /evidence_sha256/);
  assert.doesNotMatch(validator, /console\.log\(evidence\)/);
});

test('workflow is protected and retains exact-SHA decision artifacts', () => {
  assert.match(workflow, /environment: external-security-assurance/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /retention-days: 365/);
  assert.match(workflow, /validate-external-security-assurance\.mjs/);
});
