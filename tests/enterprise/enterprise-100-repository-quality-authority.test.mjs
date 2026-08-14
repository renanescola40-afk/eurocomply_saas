import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { hydrateEnterpriseClosureEvidence } from '../../scripts/release/hydrate-enterprise-100-evidence.mjs';

const TARGET = 'a'.repeat(40);
const STALE = 'b'.repeat(40);
const config = {
  controls: [{ id: 'repository-quality', evidence: 'release-validation/repository-quality.json' }],
};

async function roots() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'enterprise-100-repository-quality-'));
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

test('prefers the purpose-built repository compatibility proof over broader raw GitHub checks', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeJson(sourceRoot, 'scorecard/artifacts/enterprise-readiness/github-checks-evidence.json', {
    schema: 'risck-comply.github-checks-evidence.v1',
    status: 'Open',
    outcome: 'not_verified',
    targetSha: TARGET,
    checks: { enterpriseProductionGate: 'NOT_VERIFIED' },
    evidenceIntegrity: { containsSensitiveValues: false },
  });
  await writeJson(sourceRoot, 'scorecard/artifacts/enterprise-readiness/github-checks-repository-compatibility.json', {
    schema: 'risck-comply.github-checks-repository-compatibility.v1',
    status: 'Complete',
    outcome: 'passed',
    targetSha: TARGET,
    repositoryCompatibilityView: {
      repositoryEvidenceComplete: true,
      namedRepositoryChecksPassed: true,
      releaseRequiredChecksPassed: false,
      enterpriseProductionGatePassed: false,
    },
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({ sourceRoot, outputRoot, targetSha: TARGET, closureConfig: config });

  assert.equal(manifest.hydratedEvidence, 1);
  assert.equal(manifest.aliasedEvidence, 1);
  assert.equal(manifest.ambiguousEvidence, 0);
  assert.equal(manifest.results[0]?.matchedBy, 'authoritative_explicit_alias');
  assert.equal(manifest.results[0]?.shadowedCandidateCount, 1);
  const hydrated = JSON.parse(await readFile(path.join(outputRoot, 'release-validation/repository-quality.json'), 'utf8'));
  assert.equal(hydrated.status, 'Complete');
  assert.equal(hydrated.outcome, 'passed');
  assert.equal(hydrated.repositoryCompatibilityView.repositoryEvidenceComplete, true);
  assert.equal(hydrated.repositoryCompatibilityView.enterpriseProductionGatePassed, false);
});

test('fails closed when the authoritative repository compatibility proof is stale instead of falling back to raw checks', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeJson(sourceRoot, 'scorecard/artifacts/enterprise-readiness/github-checks-evidence.json', {
    status: 'Complete',
    outcome: 'passed',
    targetSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: false },
  });
  await writeJson(sourceRoot, 'scorecard/artifacts/enterprise-readiness/github-checks-repository-compatibility.json', {
    status: 'Complete',
    outcome: 'passed',
    targetSha: STALE,
    evidenceIntegrity: { containsSensitiveValues: false },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({ sourceRoot, outputRoot, targetSha: TARGET, closureConfig: config });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.staleEvidence, 1);
  assert.equal(manifest.results[0]?.matchedBy, 'authoritative_explicit_alias');
  assert.equal(manifest.results[0]?.shadowedCandidateCount, 1);
});

test('fails closed when the authoritative repository compatibility proof is sensitive', async () => {
  const { sourceRoot, outputRoot } = await roots();
  await writeJson(sourceRoot, 'scorecard/artifacts/enterprise-readiness/github-checks-evidence.json', {
    status: 'Complete',
    outcome: 'passed',
    targetSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: false },
  });
  await writeJson(sourceRoot, 'scorecard/artifacts/enterprise-readiness/github-checks-repository-compatibility.json', {
    status: 'Complete',
    outcome: 'passed',
    targetSha: TARGET,
    evidenceIntegrity: { containsSensitiveValues: true },
  });

  const manifest = await hydrateEnterpriseClosureEvidence({ sourceRoot, outputRoot, targetSha: TARGET, closureConfig: config });

  assert.equal(manifest.hydratedEvidence, 0);
  assert.equal(manifest.rejectedSensitiveEvidence, 1);
  assert.equal(manifest.results[0]?.matchedBy, 'authoritative_explicit_alias');
});
