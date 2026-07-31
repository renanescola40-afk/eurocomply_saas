import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateRuntimeCloseout } from './validate-enterprise-runtime-closeout.mjs';

const SHA = 'a'.repeat(40);
const FILES = ['deployment-smoke-validation.json','rollback-dry-run-validation.json','production-final-validation.json','supabase-live-rls-validation.json','authenticated-production-smoke.json','observability-production-validation.json'];

async function fixture(mutator = (doc) => doc) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'runtime-closeout-'));
  let index = 0;
  for (const filename of FILES) {
    const doc = mutator({ status: 'Complete', outcome: 'passed', releaseSha: SHA, marker: index++, provenance: { workflowRunId: String(100 + index), workflowUrl: `https://github.com/example/run/${index}`, commitSha: SHA } }, filename);
    await writeFile(path.join(dir, filename), JSON.stringify(doc));
  }
  return dir;
}

test('accepts six distinct exact-SHA runtime proofs', async () => {
  const result = await validateRuntimeCloseout({ evidenceDir: await fixture(), expectedSha: SHA });
  assert.equal(result.accepted, true);
  assert.equal(result.safety.enterpriseGoGrantedByThisArtifact, false);
});

test('fails when one proof is incomplete', async () => {
  const dir = await fixture((doc, filename) => filename === 'supabase-live-rls-validation.json' ? { ...doc, outcome: 'failed' } : doc);
  const result = await validateRuntimeCloseout({ evidenceDir: dir, expectedSha: SHA });
  assert.equal(result.accepted, false);
  assert(result.failures.includes('supabaseLiveRls:not_complete_and_passed'));
});

test('fails on SHA mismatch', async () => {
  const dir = await fixture((doc, filename) => filename === 'authenticated-production-smoke.json' ? { ...doc, releaseSha: 'b'.repeat(40) } : doc);
  const result = await validateRuntimeCloseout({ evidenceDir: dir, expectedSha: SHA });
  assert.equal(result.accepted, false);
  assert(result.failures.includes('authenticatedSmoke:release_sha_mismatch'));
});

test('fails when provenance is absent', async () => {
  const dir = await fixture((doc, filename) => filename === 'observability-production-validation.json' ? { ...doc, provenance: null } : doc);
  const result = await validateRuntimeCloseout({ evidenceDir: dir, expectedSha: SHA });
  assert.equal(result.accepted, false);
  assert(result.failures.includes('observability:provenance_missing'));
});
