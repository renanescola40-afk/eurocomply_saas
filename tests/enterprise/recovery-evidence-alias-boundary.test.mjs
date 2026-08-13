import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { hydrateEnterpriseClosureEvidence } from '../../scripts/release/hydrate-enterprise-100-evidence.mjs';

const TARGET = 'a'.repeat(40);
const rollbackConfig = {
  controls: [{
    id: 'rollback-rehearsal',
    evidence: 'release-validation/rollback-rehearsal.json',
  }],
};

async function roots() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'recovery-alias-boundary-'));
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

test('legacy rollback-source cannot hydrate rollback rehearsal closure credit', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeCandidate(sourceRoot, 'enterprise-recovery/rollback-source.json', {
    schema: 'risck-comply.rollback-validation.v2',
    status: 'Complete',
    outcome: 'passed',
    targetSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: rollbackConfig,
  });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.missingEvidence, 1);
  assert.equal(manifest.results[0]?.status, 'MISSING');
  assert.equal(manifest.results[0]?.matchedBy, 'explicit_alias');
  assert.deepEqual(manifest.results[0]?.sourceAliases, [
    'docs/security/evidence/runtime/rollback-validation.json',
  ]);
});

test('canonical exact-SHA rollback validation may hydrate rollback rehearsal', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeCandidate(
    sourceRoot,
    'recovery-resilience/docs/security/evidence/runtime/rollback-validation.json',
    {
      schema: 'risck-comply.rollback-validation.v4',
      status: 'Complete',
      outcome: 'passed',
      targetSha: TARGET,
      observedSha: TARGET,
      evidenceIntegrity: { containsSensitiveValues: false },
    },
  );

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: rollbackConfig,
  });

  assert.equal(manifest.hydratedEvidence, 1);
  assert.equal(manifest.aliasedEvidence, 1);
  assert.equal(manifest.results[0]?.status, 'HYDRATED');
  assert.equal(manifest.results[0]?.matchedBy, 'explicit_alias');

  const hydrated = JSON.parse(await readFile(
    path.join(outputRoot, 'release-validation/rollback-rehearsal.json'),
    'utf8',
  ));
  assert.equal(hydrated.schema, 'risck-comply.rollback-validation.v4');
  assert.equal(hydrated.targetSha, TARGET);
});
