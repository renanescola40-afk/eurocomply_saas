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
  assert.equal(manifest.aliasedEvidence, 0);
  assert.equal(manifest.missingEvidence, 0);
  assert.equal(manifest.results[0]?.matchedBy, 'declared_path');
  const hydrated = JSON.parse(await readFile(path.join(outputRoot, 'release-validation/production-smoke.json'), 'utf8'));
  assert.equal(hydrated.releaseSha, TARGET);
});

test('hydrates known nested runtimeContext.commitSha evidence without changing its status', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  await writeCandidate(sourceRoot, 'artifact/release-validation/production-smoke.json', {
    status: 'Open',
    outcome: 'failed',
    runtimeContext: { commitSha: TARGET },
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: config,
  });

  assert.equal(manifest.hydratedEvidence, 1);
  assert.equal(manifest.conflictingShaEvidence, 0);
  assert.equal(manifest.results[0]?.shaSource, 'runtimeContext.commitSha');
  const hydrated = JSON.parse(await readFile(path.join(outputRoot, 'release-validation/production-smoke.json'), 'utf8'));
  assert.equal(hydrated.status, 'Open');
  assert.equal(hydrated.runtimeContext.commitSha, TARGET);
});

test('rejects conflicting valid SHA provenance instead of selecting the first binding', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  await writeCandidate(sourceRoot, 'artifact/release-validation/production-smoke.json', {
    status: 'PASS',
    targetSha: TARGET,
    runtimeContext: { commitSha: STALE },
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: config,
  });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.conflictingShaEvidence, 1);
  assert.equal(manifest.results[0]?.status, 'SHA_CONFLICT');
});

test('hydrates only documented semantic aliases when the conceptual closure filename is absent', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  await writeCandidate(sourceRoot, 'runtime/docs/security/evidence/runtime/authenticated-production-smoke.json', {
    status: 'Complete',
    outcome: 'passed',
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
  assert.equal(manifest.aliasedEvidence, 1);
  assert.equal(manifest.results[0]?.matchedBy, 'explicit_alias');
  assert.deepEqual(manifest.results[0]?.sourceAliases, [
    'docs/security/evidence/runtime/authenticated-production-smoke.json',
  ]);
  const hydrated = JSON.parse(await readFile(path.join(outputRoot, 'release-validation/production-smoke.json'), 'utf8'));
  assert.equal(hydrated.releaseSha, TARGET);
  assert.equal(hydrated.outcome, 'passed');
});

test('hydrates exact-SHA GitHub checks as repository quality through the documented alias', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  const repositoryConfig = {
    controls: [{ id: 'repository-quality', evidence: 'release-validation/repository-quality.json' }],
  };
  await writeCandidate(sourceRoot, 'scorecard/artifacts/enterprise-readiness/github-checks-evidence.json', {
    schema: 'risck-comply.github-checks-evidence.v1',
    status: 'Complete',
    outcome: 'passed',
    targetSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: repositoryConfig,
  });

  assert.equal(manifest.hydratedEvidence, 1);
  assert.equal(manifest.aliasedEvidence, 1);
  assert.equal(manifest.results[0]?.matchedBy, 'explicit_alias');
  assert.deepEqual(manifest.results[0]?.sourceAliases, [
    'artifacts/enterprise-readiness/github-checks-evidence.json',
  ]);
  const hydrated = JSON.parse(await readFile(path.join(outputRoot, 'release-validation/repository-quality.json'), 'utf8'));
  assert.equal(hydrated.targetSha, TARGET);
  assert.equal(hydrated.status, 'Complete');
});

test('recognizes legal publication expectedSha without inventing a new binding', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  const legalConfig = {
    controls: [{
      id: 'legal-publication',
      evidence: 'artifacts/legal-review/final-legal-publication-gate.json',
    }],
  };
  await writeCandidate(sourceRoot, 'legal/final-legal-publication-gate.json', {
    schema: 'risck-comply.final-legal-publication-gate.v1',
    expectedSha: TARGET,
    publicationStatus: 'COUNSEL_ACCEPTED',
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: legalConfig,
  });

  assert.equal(manifest.hydratedEvidence, 1);
  assert.equal(manifest.results[0]?.matchedBy, 'declared_path');
  const hydrated = JSON.parse(await readFile(path.join(outputRoot, 'artifacts/legal-review/final-legal-publication-gate.json'), 'utf8'));
  assert.equal(hydrated.expectedSha, TARGET);
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

test('does not infer unlisted aliases from a similar filename', async () => {
  const { sourceRoot, outputRoot } = await tempRoots();
  const unsupportedConfig = {
    controls: [{ id: 'repository-quality', evidence: 'release-validation/repository-quality.json' }],
  };
  await writeCandidate(sourceRoot, 'somewhere/repository-quality-proof.json', {
    status: 'PASS',
    targetSha: TARGET,
  });

  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot,
    outputRoot,
    targetSha: TARGET,
    closureConfig: unsupportedConfig,
  });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.missingEvidence, 1);
  assert.equal(manifest.results[0]?.matchedBy, 'explicit_alias');
  assert.equal(manifest.results[0]?.candidateCount, 0);
  assert.deepEqual(manifest.results[0]?.sourceAliases, [
    'artifacts/enterprise-readiness/github-checks-evidence.json',
  ]);
});
