import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSourceOnlyProof } from '../../scripts/security/create-circleci-source-proof.mjs';
import { verifyCircleCISourceProof } from '../../scripts/security/verify-circleci-source-proof.mjs';

const SHA = '7'.repeat(40);
const env = () => ({
  CIRCLECI: 'true',
  CIRCLE_JOB: 'validar-risck',
  CIRCLE_SHA1: SHA,
  CIRCLE_BRANCH: 'ci/verify-source-evidence-v17',
  CIRCLE_BUILD_NUM: '253',
});
const valid = () => makeSourceOnlyProof({
  env: env(), gitSha: SHA, timestamp: '2026-10-21T13:40:00.000Z',
});
const verify = (document, runtime = env()) => verifyCircleCISourceProof(
  document, runtime, { now: new Date('2026-10-21T14:00:00.000Z') },
);
const clone = p => JSON.parse(JSON.stringify(p));

test('accepts valid exact-SHA source-only evidence without accepting Enterprise', () => {
  const proof = valid();
  assert.deepEqual(verify(proof), []);
  assert.equal(proof.enterpriseRelease.accepted, false);
});
test('rejects mismatched trusted source SHA', () =>
  assert.ok(verify(valid(), {...env(), CIRCLE_SHA1: '8'.repeat(40)}).includes('proof_source_sha_mismatch')));
test('rejects mismatched CircleCI build number', () =>
  assert.ok(verify(valid(), {...env(), CIRCLE_BUILD_NUM: '254'}).includes('proof_circleci_job_identity_mismatch')));
test('rejects mismatched CircleCI branch', () =>
  assert.ok(verify(valid(), {...env(), CIRCLE_BRANCH: 'main'}).includes('proof_circleci_job_identity_mismatch')));
test('rejects non-source CircleCI job', () =>
  assert.ok(verify(valid(), {...env(), CIRCLE_JOB: 'release'}).includes('trusted_circleci_source_job_required')));
test('rejects missing provider identity', () =>
  assert.ok(verify(valid(), {...env(), CIRCLECI: ''}).includes('trusted_circleci_source_job_required')));
test('rejects forged enterprise GO', () => {
  const proof = clone(valid()); proof.enterpriseRelease.decision = 'GO';
  assert.ok(verify(proof).includes('enterprise_no_go_boundary_breached'));
});
test('rejects falsely credited authenticated production tenant evidence', () => {
  const proof = clone(valid()); proof.enterpriseRelease.authenticatedTenantIsolation = 'PASS';
  assert.ok(verify(proof).includes('enterprise_no_go_boundary_breached'));
});
test('rejects extra fields potentially carrying leaked credentials', () => {
  const proof = clone(valid()); proof.debugEnvironment = { SECRET: 'example' };
  assert.ok(verify(proof).includes('proof_root_schema_invalid'));
});
test('rejects unsafe redaction flag', () => {
  const proof = clone(valid()); proof.containsSensitiveValues = true;
  assert.ok(verify(proof).includes('proof_schema_or_redaction_invalid'));
});
test('rejects removal of required source check', () => {
  const proof = clone(valid()); proof.sourceOnly.includes.pop();
  assert.ok(verify(proof).includes('proof_source_checklist_invalid'));
});
test('rejects substituted duplicate source check', () => {
  const proof = clone(valid()); proof.sourceOnly.includes[0] = proof.sourceOnly.includes[1];
  assert.ok(verify(proof).includes('proof_source_checklist_invalid'));
});
test('rejects future forged timestamp', () => {
  const proof = clone(valid()); proof.generatedAt = '2099-01-01T00:00:00.000Z';
  assert.ok(verify(proof).includes('proof_timestamp_invalid'));
});
test('rejects non-canonical timestamp', () => {
  const proof = clone(valid()); proof.generatedAt = '2026-10-21T13:40:00Z';
  assert.ok(verify(proof).includes('proof_timestamp_invalid'));
});
test('rejects non-JSON object', () =>
  assert.ok(verify([]).includes('proof_root_schema_invalid')));
