import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { p0EvidenceCatalog } from '../../scripts/security/p0-runtime-evidence-catalog.mjs';
import { validateGeneratedP0Register } from '../../scripts/security/validate-generated-p0-runtime-evidence-register.mjs';

const SHA = 'a'.repeat(40);

function fixture({ allComplete = false } = {}) {
  const controls = p0EvidenceCatalog.map((entry, index) => ({
    item: entry.item,
    kind: entry.kind,
    status: allComplete || index < 2 ? 'Complete' : 'Open',
    satisfied: allComplete || index < 2,
    evidenceFile: entry.file || (index === 0 ? 'package-lock.json' : 'package.json'),
    evidenceStatus: allComplete || index < 2 ? 'verified' : 'missing',
    evidenceOutcome: allComplete || index < 2 ? 'passed' : 'blocked',
    validatorFailures: allComplete || index < 2 ? [] : ['evidence file is missing'],
    owner: 'Release owner',
    requiredEvidence: 'Canonical evidence requirement',
    nextAction: 'Generate exact-SHA evidence',
    legacyRegisterStatus: 'Open',
    legacyRegisterDrift: allComplete || index < 2,
  }));
  const completed = controls.filter((control) => control.status === 'Complete').length;
  const unsigned = {
    schema: 'risck-comply.p0-runtime-evidence-register.v1',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    commitSha: SHA,
    generatedAt: '2026-08-04T10:45:00.000Z',
    decision: allComplete ? 'GO' : 'NO_GO',
    status: allComplete ? 'Complete' : 'Open',
    completed,
    blocked: controls.length - completed,
    total: controls.length,
    completionPercent: Math.round((completed / controls.length) * 100),
    controls,
    sourceOfTruth: {
      catalog: 'scripts/security/p0-runtime-evidence-catalog.mjs',
      evaluator: 'scripts/security/evaluate-p0-runtime-evidence.mjs',
      policyMetadata: 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
      statusRule: 'Status is derived from canonical validators and repository checks; legacy Markdown statuses are advisory only.',
    },
    noSecretsStored: true,
    truthBoundary: allComplete ? 'Every control passed.' : 'Evidence remains blocked.',
  };
  return {
    ...unsigned,
    sha256: createHash('sha256').update(JSON.stringify(unsigned)).digest('hex'),
  };
}

test('accepts a consistent fail-closed NO_GO register', () => {
  assert.deepEqual(validateGeneratedP0Register(fixture(), { expectedCommitSha: SHA }), []);
});

test('accepts GO only when all controls are complete', () => {
  assert.deepEqual(validateGeneratedP0Register(fixture({ allComplete: true }), { expectedCommitSha: SHA }), []);
});

test('rejects a manually promoted decision and digest mismatch', () => {
  const register = fixture();
  register.decision = 'GO';
  register.status = 'Complete';
  register.completionPercent = 100;
  const failures = validateGeneratedP0Register(register, { expectedCommitSha: SHA });
  assert.ok(failures.includes('decision_mismatch'));
  assert.ok(failures.includes('overall_status_mismatch'));
  assert.ok(failures.includes('completion_percent_mismatch'));
  assert.ok(failures.includes('sha256_mismatch'));
});

test('rejects duplicate controls and wrong SHA', () => {
  const register = fixture();
  register.controls[1].item = register.controls[0].item;
  const failures = validateGeneratedP0Register(register, { expectedCommitSha: 'b'.repeat(40) });
  assert.ok(failures.some((failure) => failure.startsWith('duplicate_control:')));
  assert.ok(failures.includes('commit_sha_mismatch'));
});
