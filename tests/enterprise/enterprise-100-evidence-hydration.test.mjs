import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { hydrateEnterpriseClosureEvidence } from '../../scripts/release/hydrate-enterprise-100-evidence.mjs';

const TARGET = 'a'.repeat(40);
const STALE = 'b'.repeat(40);
const config = {
  controls: [
    {
      id: 'production-smoke',
      evidence: 'release-validation/production-smoke.json',
    },
  ],
};

async function tempRoots() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'enterprise-100-hydration-'));
  const sourceRoot = path.join(root, 'source');
  const outputRoot = path.join(root, 'output');
  await mkdir(sourceRoot, { recursive: true });
  return { sourceRoot, outputRoot };
}

async function writeCandidate(sourceRoot, relative, document) {
  const absolute = path.join(sourceRoot, relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(document, null, 2)}\n`);
}

test('hydrates exact-SHA evidence into the declared closure path', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  await writeCandidate(sourceRoot, 'artifact/release-validation/production-smoke.json', {
    status: 'PASS',
    releaseSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: config,
  });

  assert.equal(manifest.hydratedEvidence, 1);
  assert.equal(manifest.missingEvidence, 0);
  const hydrated = JSON.parse(await readFile(path.join(outputRoot, 'release-validation/production-smoke.json'), 'utf8'));
  assert.equal(hydrated.releaseSha, TARGET);
});

test('never hydrates stale-SHA evidence', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  await writeCandidate(sourceRoot, 'artifact/production-smoke.json', {
    status: 'PASS',
    commitSha: STALE,
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: config,
  });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.staleEvidence, 1);
  assert.equal(manifest.results[0]?.status, 'STALE');
});

test('rejects exact-SHA evidence explicitly marked sensitive', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  await writeCandidate(sourceRoot, 'artifact/production-smoke.json', {
    status: 'PASS',
    targetSha: TARGET,
    containsSensitiveValues: true,
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: config,
  });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.rejectedSensitiveEvidence, 1);
  assert.equal(manifest.results[0]?.status, 'REJECTED_SENSITIVE');
});

test('fails closed on conflicting exact-SHA evidence', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  await writeCandidate(sourceRoot, 'one/production-smoke.json', {
    status: 'PASS',
    targetSha: TARGET,
    probe: 'one',
  });
  await writeCandidate(sourceRoot, 'two/production-smoke.json', {
    status: 'PASS',
    targetSha: TARGET,
    probe: 'two',
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: config,
  });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.ambiguousEvidence, 1);
  assert.equal(manifest.results[0]?.status, 'AMBIGUOUS');
});

test('deduplicates byte-identical exact-SHA evidence', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  const evidence = {
    status: 'PASS',
    targetSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: false },
  };
  await writeCandidate(sourceRoot, 'one/production-smoke.json', evidence);
  await writeCandidate(sourceRoot, 'two/production-smoke.json', evidence);

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: config,
  });

  assert.equal(manifest.hydratedEvidence, 1);
  assert.equal(manifest.results[0]?.equivalentCandidateCount, 2);
});
