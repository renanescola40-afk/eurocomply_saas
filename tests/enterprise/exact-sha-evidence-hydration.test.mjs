import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { hydrateExactShaEvidence } from '../../scripts/enterprise/hydrate-exact-sha-evidence.mjs';

const TARGET_SHA = 'a'.repeat(40);
const STALE_SHA = 'b'.repeat(40);
const productRegistry = {
  workstreams: [
    { id: 'A', runtimeEvidence: ['docs/security/evidence/runtime/a.json'] },
    { id: 'B', runtimeEvidence: ['docs/security/evidence/runtime/b.json'] },
  ],
};

async function withTemp(testFn) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'risck-evidence-hydration-'));
  try {
    await testFn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function putJson(root, relative, value) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value)}\n`);
}

test('hydrates a flat artifact file only when it proves the exact target SHA', async () => {
  await withTemp(async (root) => {
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await mkdir(source, { recursive: true });
    await putJson(source, 'artifact-1/a.json', { status: 'PASS', releaseSha: TARGET_SHA });
    await putJson(source, 'artifact-2/b.json', { status: 'PASS', releaseSha: STALE_SHA });

    const manifest = await hydrateExactShaEvidence({ sourceRoot: source, outputRoot: output, targetSha: TARGET_SHA, productRegistry });

    assert.equal(manifest.hydratedEvidence, 1);
    assert.equal(manifest.staleEvidence, 1);
    assert.equal(manifest.missingEvidence, 0);
    const hydrated = JSON.parse(await readFile(path.join(output, 'docs/security/evidence/runtime/a.json'), 'utf8'));
    assert.equal(hydrated.releaseSha, TARGET_SHA);
  });
});

test('rejects exact-SHA evidence explicitly marked as containing sensitive values', async () => {
  await withTemp(async (root) => {
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await mkdir(source, { recursive: true });
    await putJson(source, 'a.json', {
      status: 'PASS',
      targetSha: TARGET_SHA,
      containsSensitiveValues: true,
    });

    const manifest = await hydrateExactShaEvidence({ sourceRoot: source, outputRoot: output, targetSha: TARGET_SHA, productRegistry });
    assert.equal(manifest.rejectedSensitiveEvidence, 1);
    assert.equal(manifest.hydratedEvidence, 0);
  });
});

test('fails closed on conflicting exact-SHA documents for the same expected evidence path', async () => {
  await withTemp(async (root) => {
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await mkdir(source, { recursive: true });
    await putJson(source, 'artifact-1/a.json', { status: 'PASS', commitSha: TARGET_SHA, proof: 1 });
    await putJson(source, 'artifact-2/a.json', { status: 'PASS', commitSha: TARGET_SHA, proof: 2 });

    const manifest = await hydrateExactShaEvidence({ sourceRoot: source, outputRoot: output, targetSha: TARGET_SHA, productRegistry });
    assert.equal(manifest.ambiguousEvidence, 1);
    assert.equal(manifest.hydratedEvidence, 0);
  });
});

test('deduplicates byte-identical copies of exact-SHA evidence', async () => {
  await withTemp(async (root) => {
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await mkdir(source, { recursive: true });
    const evidence = { status: 'PASS', provenance: { commitSha: TARGET_SHA } };
    await putJson(source, 'artifact-1/a.json', evidence);
    await putJson(source, 'artifact-2/a.json', evidence);

    const manifest = await hydrateExactShaEvidence({ sourceRoot: source, outputRoot: output, targetSha: TARGET_SHA, productRegistry });
    assert.equal(manifest.hydratedEvidence, 1);
    const row = manifest.results.find((item) => item.path.endsWith('/a.json'));
    assert.equal(row.equivalentCandidateCount, 2);
  });
});
