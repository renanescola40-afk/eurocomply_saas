import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { hydrateEnterpriseClosureEvidence } from '../../scripts/release/hydrate-enterprise-100-evidence.mjs';
import { evaluateEnterpriseClosure } from '../../scripts/release/check-enterprise-100-closure.mjs';

const TARGET = 'a'.repeat(40);
const STALE = 'b'.repeat(40);
const EVIDENCE_PATH = 'release-validation/production-deployment.json';
const CONFIG = {
  requiredDecision: 'GO',
  controls: [{
    id: 'production-deployment',
    owner: 'platform',
    evidence: EVIDENCE_PATH,
    acceptedStatuses: ['PASS'],
  }],
};

async function roots() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'enterprise-100-sha-binding-'));
  const sourceRoot = path.join(root, 'source');
  const outputRoot = path.join(root, 'output');
  await mkdir(sourceRoot, { recursive: true });
  return { root, sourceRoot, outputRoot };
}

async function writeJson(root, relative, document) {
  const absolute = path.join(root, relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(document, null, 2)}\n`);
  return absolute;
}

test('hydration accepts known nested runtimeContext.commitSha without awarding status credit', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeJson(sourceRoot, EVIDENCE_PATH, {
    status: 'Open',
    outcome: 'failed',
    runtimeContext: { commitSha: TARGET },
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: CONFIG,
  });

  assert.equal(manifest.hydratedEvidence, 1);
  assert.equal(manifest.conflictingShaEvidence, 0);
  assert.equal(manifest.results[0]?.shaSource, 'runtimeContext.commitSha');

  const result = evaluateEnterpriseClosure({
    expectedSha: TARGET,
    config: CONFIG,
    evidenceRoots: [outputRoot],
  });
  assert.equal(result.passed, false);
  assert.equal(result.controls[0]?.shaMatches, true);
  assert.equal(result.controls[0]?.shaSource, 'runtimeContext.commitSha');
  assert.equal(result.controls[0]?.reason, 'status_not_accepted');
});

test('checker accepts Complete/passed evidence bound only through runtimeContext.commitSha', async () => {
  const { root } = await roots();
  await writeJson(root, EVIDENCE_PATH, {
    status: 'Complete',
    outcome: 'passed',
    runtimeContext: { commitSha: TARGET },
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const result = evaluateEnterpriseClosure({
    expectedSha: TARGET,
    config: CONFIG,
    evidenceRoots: [root],
  });

  assert.equal(result.passed, true);
  assert.equal(result.controls[0]?.status, 'PASS');
  assert.equal(result.controls[0]?.sha, TARGET);
  assert.equal(result.controls[0]?.shaSource, 'runtimeContext.commitSha');
});

test('hydration rejects a document with conflicting valid SHA provenance', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeJson(sourceRoot, EVIDENCE_PATH, {
    status: 'Complete',
    outcome: 'passed',
    targetSha: TARGET,
    runtimeContext: { commitSha: STALE },
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: CONFIG,
  });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.conflictingShaEvidence, 1);
  assert.equal(manifest.results[0]?.status, 'SHA_CONFLICT');
});

test('checker rejects conflicting SHA provenance even when the first binding matches', async () => {
  const { root } = await roots();
  await writeJson(root, EVIDENCE_PATH, {
    status: 'Complete',
    outcome: 'passed',
    targetSha: TARGET,
    runtimeContext: { commitSha: STALE },
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const result = evaluateEnterpriseClosure({
    expectedSha: TARGET,
    config: CONFIG,
    evidenceRoots: [root],
  });

  assert.equal(result.passed, false);
  assert.equal(result.controls[0]?.status, 'SHA_CONFLICT');
  assert.equal(result.controls[0]?.reason, 'conflicting_sha_bindings');
});
