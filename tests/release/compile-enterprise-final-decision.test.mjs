import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateEnterpriseFinalDecision } from '../../scripts/release/compile-enterprise-final-decision.mjs';

const sha = 'a'.repeat(40);
const digest = (char) => char.repeat(64);
const control = (name, char) => ({
  status: 'PASS',
  outcome: 'passed',
  releaseSha: sha,
  evidenceDigest: digest(char),
  evidenceUrl: `https://example.test/${name}`,
  observedAt: '2026-07-31T12:00:00.000Z',
  owner: `${name}-owner`,
  approver: name.includes('Approval') ? `${name}-approver` : undefined,
  synthetic: false,
});

function packet() {
  const names = [
    'repositoryGates','runtimeCloseout','migrationPostExecution','branchProtection','backupRestore',
    'externalSecurityReview','qualifiedLegalReviews','releaseApproval','securityApproval','operationsApproval',
  ];
  const chars = ['1','2','3','4','5','6','7','8','9','b'];
  return {
    schema: 'risck-comply.enterprise-final-decision-input.v1',
    status: 'READY_FOR_FINAL_DECISION',
    releaseSha: sha,
    validUntil: '2026-08-15T00:00:00.000Z',
    riskAcceptance: { accepted: false },
    controls: Object.fromEntries(names.map((name, index) => [name, control(name, chars[index])])),
  };
}

const evaluate = (value) => evaluateEnterpriseFinalDecision({
  packet: value,
  packetBytes: Buffer.from(JSON.stringify(value)),
  expectedReleaseSha: sha,
  now: new Date('2026-07-31T13:00:00.000Z'),
});

test('accepts only a complete exact-SHA evidence set', () => {
  const result = evaluate(packet());
  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'ENTERPRISE_GO');
  assert.equal(result.controls.every((item) => item.status === 'PASS'), true);
});

test('fails closed when runtime evidence is incomplete', () => {
  const value = packet();
  value.controls.runtimeCloseout.status = 'BLOCKED';
  const result = evaluate(value);
  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'ENTERPRISE_NO_GO');
  assert.ok(result.blockers.includes('control_blocked:runtimeCloseout'));
});

test('rejects duplicate evidence digests', () => {
  const value = packet();
  value.controls.branchProtection.evidenceDigest = value.controls.repositoryGates.evidenceDigest;
  const result = evaluate(value);
  assert.ok(result.failures.includes('duplicate_evidence_digest'));
});

test('rejects synthetic evidence and stale SHA', () => {
  const value = packet();
  value.controls.externalSecurityReview.synthetic = true;
  value.controls.qualifiedLegalReviews.releaseSha = 'c'.repeat(40);
  const result = evaluate(value);
  assert.ok(result.failures.includes('externalSecurityReview_synthetic_evidence_forbidden'));
  assert.ok(result.failures.includes('qualifiedLegalReviews_sha_mismatch'));
});

test('requires three distinct final approvers', () => {
  const value = packet();
  value.controls.releaseApproval.approver = 'same-person';
  value.controls.securityApproval.approver = 'same-person';
  const result = evaluate(value);
  assert.ok(result.failures.includes('independent_approvers_required'));
});

test('does not permit unresolved risk acceptance for Enterprise GO', () => {
  const value = packet();
  value.riskAcceptance.accepted = true;
  const result = evaluate(value);
  assert.ok(result.blockers.includes('unresolved_risk_acceptance_not_allowed_for_enterprise_go'));
});
