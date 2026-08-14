import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { hydrateEnterpriseClosureEvidence } from '../../scripts/release/hydrate-enterprise-100-evidence.mjs';

const TARGET = 'a'.repeat(40);
const STALE = 'b'.repeat(40);

async function roots() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'enterprise-100-production-gate-aliases-'));
  const sourceRoot = path.join(root, 'source');
  const outputRoot = path.join(root, 'output');
  await mkdir(sourceRoot, { recursive: true });
  return { sourceRoot, outputRoot };
}

async function writeJson(root, relative, value) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

const config = {
  controls: [
    { id: 'rollback-rehearsal', evidence: 'release-validation/rollback-rehearsal.json' },
    { id: 'observability-runtime', evidence: 'release-validation/observability-runtime.json' },
  ],
};

test('hydrates exact-SHA passing Production Gate observability and rollback proofs through explicit aliases', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeJson(sourceRoot, 'production-gate/docs/security/evidence/runtime/observability-smoke-validation.json', {
    evidenceItem: 'observability-smoke-validation',
    status: 'Complete',
    outcome: 'passed',
    commitSha: TARGET,
    buildSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: false, exactShaBound: true },
  });
  await writeJson(sourceRoot, 'production-gate/docs/security/evidence/runtime/rollback-dry-run-validation.json', {
    schema: 'risck-comply.rollback-dry-run-validation.v3',
    status: 'Complete',
    outcome: 'passed',
    commitSha: TARGET,
    buildSha: TARGET,
    dryRun: { mutatesProduction: false },
    evidenceIntegrity: { containsSensitiveValues: false, exactShaBound: true },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({ sourceRoot, outputRoot, targetSha: TARGET, closureConfig: config });

  assert.equal(manifest.hydratedEvidence, 2);
  assert.equal(manifest.aliasedEvidence, 2);
  assert.equal(manifest.missingEvidence, 0);
  assert.equal(manifest.staleEvidence, 0);
  assert.equal(manifest.rejectedSensitiveEvidence, 0);

  const observability = JSON.parse(await readFile(path.join(outputRoot, 'release-validation/observability-runtime.json'), 'utf8'));
  const rollback = JSON.parse(await readFile(path.join(outputRoot, 'release-validation/rollback-rehearsal.json'), 'utf8'));
  assert.equal(observability.status, 'Complete');
  assert.equal(observability.outcome, 'passed');
  assert.equal(rollback.status, 'Complete');
  assert.equal(rollback.outcome, 'passed');
  assert.equal(rollback.dryRun.mutatesProduction, false);
});

test('does not hydrate stale or sensitive Production Gate runtime aliases', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeJson(sourceRoot, 'production-gate/docs/security/evidence/runtime/observability-smoke-validation.json', {
    status: 'Complete',
    outcome: 'passed',
    commitSha: STALE,
    evidenceIntegrity: { containsSensitiveValues: false },
  });
  await writeJson(sourceRoot, 'production-gate/docs/security/evidence/runtime/rollback-dry-run-validation.json', {
    status: 'Complete',
    outcome: 'passed',
    commitSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: true },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({ sourceRoot, outputRoot, targetSha: TARGET, closureConfig: config });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.staleEvidence, 1);
  assert.equal(manifest.rejectedSensitiveEvidence, 1);
});
