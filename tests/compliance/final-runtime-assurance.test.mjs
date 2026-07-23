import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFinalRuntimeEvidence } from '../../scripts/compliance/build-final-runtime-assurance-evidence.mjs';
import { validateFinalRuntimeDocument } from '../../scripts/compliance/validate-final-runtime-assurance.mjs';

const targetSha = 'a'.repeat(40);
const bundle = buildFinalRuntimeEvidence({ targetSha, runId: '12345', repository: 'renanescola40-afk/eurocomply_saas', generatedAt: '2026-07-23T00:00:00.000Z' });

test('builds exactly the final three runtime workstreams', () => {
  assert.deepEqual(bundle.map((item) => item.workstreamId), ['READINESS-SCORING', 'VENDOR-ASSURANCE', 'PLATFORM-CONTROLS']);
});

test('accepts exact-SHA integrity-bound documents', () => {
  for (const item of bundle) assert.deepEqual(validateFinalRuntimeDocument(item.document, targetSha), []);
});

test('rejects cross-SHA and tampered evidence', () => {
  const document = structuredClone(bundle[0].document);
  document.targetSha = 'b'.repeat(40);
  document.assertions[0].status = 'FAILED';
  const failures = validateFinalRuntimeDocument(document, targetSha);
  assert.ok(failures.includes('target_sha_mismatch'));
  assert.ok(failures.includes('assertion_not_verified'));
  assert.ok(failures.includes('integrity_mismatch'));
});
