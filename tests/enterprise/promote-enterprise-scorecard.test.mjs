import test from 'node:test';
import assert from 'node:assert/strict';
import { promote } from '../../scripts/enterprise/promote-enterprise-scorecard.mjs';

const SHA = 'a'.repeat(40);
const controls = Array.from({ length: 100 }, (_, index) => ({ id: `CTRL-${String(index + 1).padStart(3, '0')}`, critical: index < 10, status: 'NOT_VERIFIED' }));
function evidence(overrides = {}) {
  return { evidenceItem: 'runtime-proof', targetSha: SHA, observedSha: SHA, status: 'Complete', outcome: 'passed', generatedAt: '2026-07-21T12:00:00.000Z', repository: 'renanescola40-afk/eurocomply_saas', runId: '123', controlsVerified: controls.map(({ id }) => id), evidenceIntegrity: { containsSensitiveValues: false }, ...overrides };
}

test('promotes exactly 100 evidenced controls to GO', () => {
  const result = promote({ scorecard: { controls }, evidenceManifest: { items: [evidence()] }, targetSha: SHA, generatedAt: '2026-07-21T12:00:00.000Z' });
  assert.equal(result.score.completePercent, 100);
  assert.equal(result.score.remainingPercent, 0);
  assert.equal(result.releaseDecision, 'GO');
  assert.equal(result.criticalOpen.length, 0);
  assert.match(result.integrity.sha256, /^[a-f0-9]{64}$/);
});

test('rejects stale SHA and remains NO_GO', () => {
  const result = promote({ scorecard: { controls }, evidenceManifest: { items: [evidence({ observedSha: 'b'.repeat(40) })] }, targetSha: SHA });
  assert.equal(result.score.completePercent, 0);
  assert.equal(result.releaseDecision, 'NO_GO');
  assert.equal(result.rejectedEvidence[0].failures.includes('exact-SHA provenance mismatch'), true);
});

test('rejects sensitive evidence shape', () => {
  const result = promote({ scorecard: { controls }, evidenceManifest: { items: [evidence({ token: 'must-not-exist' })] }, targetSha: SHA });
  assert.equal(result.score.completePercent, 0);
  assert.equal(result.rejectedEvidence[0].failures.includes('sensitive key/value shape detected'), true);
});

test('downgrades legacy PASS without accepted evidence', () => {
  const legacy = controls.map((control, index) => ({ ...control, status: index === 0 ? 'PASS' : control.status }));
  const result = promote({ scorecard: { controls: legacy }, evidenceManifest: { items: [] }, targetSha: SHA });
  assert.equal(result.controls[0].status, 'NOT_VERIFIED');
  assert.equal(result.releaseDecision, 'NO_GO');
});

test('requires the canonical 100-control shape', () => {
  assert.throws(() => promote({ scorecard: { controls: controls.slice(0, 99) }, evidenceManifest: { items: [] }, targetSha: SHA }), /exactly 100 controls/);
});
