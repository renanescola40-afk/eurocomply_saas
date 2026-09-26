import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { pruneSupersededArtifactAttempts } from '../../scripts/enterprise/prune-superseded-artifact-attempts.mjs';

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function makeAttempt(root, artifactId, artifactName, files) {
  const safeName = artifactName.replace(/[^A-Za-z0-9._-]+/g, '_');
  const dir = path.join(root, `${artifactId}-${safeName}`);
  for (const [relative, value] of Object.entries(files)) {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
  }
  return dir;
}

async function writeManifest(root, artifacts) {
  await writeFile(
    path.join(root, 'github-exact-sha-artifact-collection.json'),
    `${JSON.stringify({ status: 'Complete', artifacts }, null, 2)}\n`,
  );
}

test('keeps the newest complete attempt and removes the older attempt before hydration', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-attempt-prune-'));
  const name = 'enterprise-production-final-evidence-a'.concat('a'.repeat(39));
  const oldDir = await makeAttempt(root, 10900464540, name, {
    'release-validation/production-smoke.json': { status: 'PASS', attempt: 'old' },
  });
  const newDir = await makeAttempt(root, 10902340630, name, {
    'some-other-proof.json': { status: 'PASS', attempt: 'new' },
  });

  await writeManifest(root, [
    { artifactId: 10900464540, artifactName: name, producerWorkflow: '.github/workflows/enterprise-production-gate.yml' },
    { artifactId: 10902340630, artifactName: name, producerWorkflow: '.github/workflows/enterprise-production-gate.yml' },
  ]);

  const result = await pruneSupersededArtifactAttempts({ root });
  assert.equal(result.removedSupersededAttempts, 1);
  assert.equal(await exists(oldDir), false);
  assert.equal(await exists(newDir), true);
  assert.equal(await exists(path.join(newDir, 'release-validation/production-smoke.json')), false);
});

test('preserves every file inside the selected newest artifact so conflicts remain visible', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-attempt-conflict-'));
  const name = 'enterprise-production-final-evidence-b'.concat('b'.repeat(39));
  const newDir = await makeAttempt(root, 10902340630, name, {
    'a/release-validation/production-smoke.json': { status: 'PASS', source: 'a' },
    'b/release-validation/production-smoke.json': { status: 'PASS', source: 'b' },
  });

  await writeManifest(root, [
    { artifactId: 10902340630, artifactName: name, producerWorkflow: '.github/workflows/enterprise-production-gate.yml' },
  ]);

  const result = await pruneSupersededArtifactAttempts({ root });
  assert.equal(result.removedSupersededAttempts, 0);
  assert.equal(await exists(path.join(newDir, 'a/release-validation/production-smoke.json')), true);
  assert.equal(await exists(path.join(newDir, 'b/release-validation/production-smoke.json')), true);
});

test('does not collapse identically named artifacts emitted by different producer workflows', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-attempt-producer-bound-'));
  const name = 'shared-artifact-name';
  const first = await makeAttempt(root, 10900000001, name, { 'first.json': { ok: true } });
  const second = await makeAttempt(root, 10900000002, name, { 'second.json': { ok: true } });

  await writeManifest(root, [
    { artifactId: 10900000001, artifactName: name, producerWorkflow: '.github/workflows/producer-a.yml' },
    { artifactId: 10900000002, artifactName: name, producerWorkflow: '.github/workflows/producer-b.yml' },
  ]);

  const result = await pruneSupersededArtifactAttempts({ root });
  assert.equal(result.removedSupersededAttempts, 0);
  assert.equal(await exists(first), true);
  assert.equal(await exists(second), true);
  const manifest = JSON.parse(await readFile(path.join(root, 'github-exact-sha-artifact-collection.json'), 'utf8'));
  assert.equal(manifest.artifacts.length, 2);
});
