import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  ArtifactCollectionError,
  artifactNameMatches,
  collectExactShaArtifacts,
  producerSpecsForMode,
  validateTargetSha,
} from '../../scripts/enterprise/collect-github-exact-sha-artifacts.mjs';

const SHA = 'a'.repeat(40);

function jsonResponse(document, init = {}) {
  return new Response(JSON.stringify(document), {
    status: 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
}

test('collector modes use explicit producer workflow bindings', () => {
  const closure = producerSpecsForMode('enterprise-100');
  const dashboard = producerSpecsForMode('dashboard');

  assert.equal(closure.length, 8);
  assert.equal(dashboard.length, 5);
  assert.ok(closure.some((producer) => producer.workflowPath === '.github/workflows/enterprise-production-gate.yml'));
  assert.ok(closure.some((producer) => producer.workflowPath === '.github/workflows/final-legal-publication-gate.yml'));
  assert.ok(dashboard.some((producer) => producer.workflowPath === '.github/workflows/eu-ai-act-final-runtime-closeout.yml'));
  assert.ok(dashboard.some((producer) => producer.workflowPath === '.github/workflows/enterprise-readiness-scorecard.yml'));
});

test('artifact patterns remain exact or prefix-bound', () => {
  assert.equal(artifactNameMatches('stripe-billing-validation', ['stripe-billing-validation']), true);
  assert.equal(artifactNameMatches('stripe-billing-validation-old', ['stripe-billing-validation']), false);
  assert.equal(artifactNameMatches(`enterprise-runtime-closeout-${SHA}`, ['enterprise-runtime-closeout-*']), true);
  assert.equal(artifactNameMatches('unrelated-artifact', ['enterprise-runtime-closeout-*']), false);
  assert.equal(artifactNameMatches('any-artifact', ['*']), true);
});

test('target SHA validation remains strict', () => {
  assert.equal(validateTargetSha(SHA), SHA);
  assert.throws(
    () => validateTargetSha('ABC'),
    (error) => error instanceof ArtifactCollectionError && error.code === 'INVALID_TARGET_SHA',
  );
});

test('zero artifacts is valid only after all workflow-scoped inventories succeed', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'exact-sha-artifacts-'));
  const urls = [];
  try {
    const manifest = await collectExactShaArtifacts({
      mode: 'enterprise-100',
      targetSha: SHA,
      destinationRoot: root,
      repository: 'owner/repo',
      token: 'test-token',
      fetchImpl: async (url) => {
        urls.push(String(url));
        return jsonResponse({ total_count: 0, workflow_runs: [] });
      },
      sleepImpl: async () => {},
      extractArchive: async () => {},
    });

    assert.equal(manifest.status, 'Complete');
    assert.equal(manifest.collectedArtifactCount, 0);
    assert.equal(manifest.producers.length, 8);
    assert.equal(urls.length, 8);
    for (const url of urls) {
      assert.match(url, /\/actions\/workflows\//);
      assert.match(url, new RegExp(`head_sha=${SHA}`));
      assert.doesNotMatch(url, /\/actions\/artifacts\?per_page=/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('primary GitHub API rate limit is infrastructure-blocked, never synthetic missing evidence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'exact-sha-rate-limit-'));
  try {
    await assert.rejects(
      collectExactShaArtifacts({
        mode: 'enterprise-100',
        targetSha: SHA,
        destinationRoot: root,
        repository: 'owner/repo',
        token: 'test-token',
        fetchImpl: async () => new Response('rate limit exceeded', {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1893456000',
          },
        }),
        sleepImpl: async () => {},
        extractArchive: async () => {},
      }),
      (error) => error instanceof ArtifactCollectionError && error.code === 'GITHUB_API_RATE_LIMITED',
    );

    const manifest = JSON.parse(await readFile(
      path.join(root, 'github-exact-sha-artifact-collection.json'),
      'utf8',
    ));
    assert.equal(manifest.status, 'InfrastructureBlocked');
    assert.equal(manifest.errorCode, 'GITHUB_API_RATE_LIMITED');
    assert.equal(manifest.collectedArtifactCount, 0);
    assert.equal(manifest.evidenceIntegrity.containsSensitiveValues, false);
    assert.equal(manifest.evidenceIntegrity.tokenPersisted, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
