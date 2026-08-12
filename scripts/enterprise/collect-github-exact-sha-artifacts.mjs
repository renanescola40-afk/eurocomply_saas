#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const FULL_SHA = /^[a-f0-9]{40}$/;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RECENT_COMPLETED_RUN_WINDOW = 100;

const PRODUCERS = Object.freeze({
  'enterprise-100': Object.freeze([
    Object.freeze({
      workflow: 'enterprise-production-gate.yml',
      workflowPath: '.github/workflows/enterprise-production-gate.yml',
      artifactPatterns: Object.freeze(['enterprise-production-final-evidence-*']),
    }),
    Object.freeze({
      workflow: 'production-runtime-proof.yml',
      workflowPath: '.github/workflows/production-runtime-proof.yml',
      artifactPatterns: Object.freeze(['production-runtime-proof-*']),
    }),
    Object.freeze({
      workflow: 'enterprise-recovery-drill.yml',
      workflowPath: '.github/workflows/enterprise-recovery-drill.yml',
      artifactPatterns: Object.freeze(['enterprise-recovery-*']),
    }),
    Object.freeze({
      workflow: 'recovery-resilience-proof.yml',
      workflowPath: '.github/workflows/recovery-resilience-proof.yml',
      artifactPatterns: Object.freeze(['recovery-resilience-proof-*']),
    }),
    Object.freeze({
      workflow: 'enterprise-runtime-evidence-closeout.yml',
      workflowPath: '.github/workflows/enterprise-runtime-evidence-closeout.yml',
      artifactPatterns: Object.freeze(['enterprise-runtime-closeout-*']),
    }),
    Object.freeze({
      workflow: 'enterprise-readiness-scorecard.yml',
      workflowPath: '.github/workflows/enterprise-readiness-scorecard.yml',
      artifactPatterns: Object.freeze(['enterprise-readiness-scorecard-*']),
    }),
    Object.freeze({
      workflow: 'stripe-runtime-proof.yml',
      workflowPath: '.github/workflows/stripe-runtime-proof.yml',
      artifactPatterns: Object.freeze(['stripe-billing-validation']),
    }),
    Object.freeze({
      workflow: 'supabase-production-migration-dry-run.yml',
      workflowPath: '.github/workflows/supabase-production-migration-dry-run.yml',
      artifactPatterns: Object.freeze(['supabase-production-migration-dry-run-*']),
    }),
    Object.freeze({
      workflow: 'supabase-production-rls-reconciliation.yml',
      workflowPath: '.github/workflows/supabase-production-rls-reconciliation.yml',
      artifactPatterns: Object.freeze(['supabase-rls-reconciliation-*']),
    }),
    Object.freeze({
      workflow: 'final-legal-publication-gate.yml',
      workflowPath: '.github/workflows/final-legal-publication-gate.yml',
      artifactPatterns: Object.freeze(['final-legal-publication-gate-*']),
    }),
    Object.freeze({
      workflow: 'enterprise-conversation-runtime-closeout.yml',
      workflowPath: '.github/workflows/enterprise-conversation-runtime-closeout.yml',
      artifactPatterns: Object.freeze(['enterprise-conversation-runtime-closeout-*']),
    }),
  ]),
  dashboard: Object.freeze([
    Object.freeze({
      workflow: 'eu-ai-act-final-runtime-closeout.yml',
      workflowPath: '.github/workflows/eu-ai-act-final-runtime-closeout.yml',
      artifactPatterns: Object.freeze(['eu-ai-act-final-runtime-closeout-*']),
    }),
    Object.freeze({
      workflow: 'branch-protection-runtime-proof.yml',
      workflowPath: '.github/workflows/branch-protection-runtime-proof.yml',
      artifactPatterns: Object.freeze(['branch-protection-runtime-proof-*']),
    }),
    Object.freeze({
      workflow: 'production-provider-runtime-proof.yml',
      workflowPath: '.github/workflows/production-provider-runtime-proof.yml',
      artifactPatterns: Object.freeze(['production-provider-runtime-proof-*']),
    }),
    Object.freeze({
      workflow: 'enterprise-readiness-scorecard.yml',
      workflowPath: '.github/workflows/enterprise-readiness-scorecard.yml',
      artifactPatterns: Object.freeze(['enterprise-readiness-scorecard-*']),
    }),
    Object.freeze({
      workflow: 'enterprise-runtime-evidence-closeout.yml',
      workflowPath: '.github/workflows/enterprise-runtime-evidence-closeout.yml',
      artifactPatterns: Object.freeze(['enterprise-runtime-closeout-*']),
    }),
  ]),
});

export class ArtifactCollectionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ArtifactCollectionError';
    this.code = code;
    this.details = details;
  }
}

export function validateTargetSha(targetSha) {
  if (!FULL_SHA.test(targetSha ?? '')) {
    throw new ArtifactCollectionError(
      'INVALID_TARGET_SHA',
      'target SHA must be a lowercase 40-character Git SHA',
    );
  }
  return targetSha;
}

export function producerSpecsForMode(mode) {
  const specs = PRODUCERS[mode];
  if (!specs) {
    throw new ArtifactCollectionError(
      'INVALID_COLLECTION_MODE',
      `unsupported collection mode: ${mode}`,
    );
  }
  return specs;
}

export function artifactNameMatches(name, patterns) {
  return patterns.some((pattern) => {
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) return name.startsWith(pattern.slice(0, -1));
    return name === pattern;
  });
}

function safeSegment(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, '_');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rateLimitDetails(response) {
  const remaining = response.headers.get('x-ratelimit-remaining');
  const resetRaw = response.headers.get('x-ratelimit-reset');
  const retryAfter = response.headers.get('retry-after');
  const resetEpoch = Number(resetRaw);
  return {
    remaining,
    retryAfter,
    resetAt: Number.isFinite(resetEpoch) && resetEpoch > 0
      ? new Date(resetEpoch * 1000).toISOString()
      : null,
  };
}

function shouldRetry(response, body) {
  if (response.status === 429 || response.status >= 500) return true;
  if (response.status !== 403) return false;
  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining === '0') return false;
  return /secondary rate limit|abuse detection/i.test(body);
}

async function githubRequest({
  url,
  token,
  fetchImpl,
  expectJson,
  attempts = 3,
  sleepImpl = sleep,
}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'risck-comply-enterprise-evidence-collector',
        },
        redirect: 'follow',
      });
    } catch (error) {
      lastError = new ArtifactCollectionError(
        'GITHUB_API_NETWORK_ERROR',
        'GitHub API request failed before a response was received',
        {
          path: new URL(url).pathname,
          cause: error instanceof Error ? error.message : String(error),
        },
      );
      if (attempt < attempts) {
        await sleepImpl(500 * 2 ** (attempt - 1));
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      if (expectJson) return response.json();
      return Buffer.from(await response.arrayBuffer());
    }

    const body = await response.text();
    const limit = rateLimitDetails(response);
    if (response.status === 403 && limit.remaining === '0') {
      throw new ArtifactCollectionError(
        'GITHUB_API_RATE_LIMITED',
        'GitHub API primary rate limit was exhausted; refusing to reinterpret infrastructure failure as missing evidence',
        { status: response.status, resetAt: limit.resetAt },
      );
    }

    lastError = new ArtifactCollectionError(
      'GITHUB_API_REQUEST_FAILED',
      `GitHub API request failed with HTTP ${response.status}`,
      {
        status: response.status,
        retryAfter: limit.retryAfter,
        path: new URL(url).pathname,
      },
    );

    if (!shouldRetry(response, body) || attempt === attempts) throw lastError;
    await sleepImpl(500 * 2 ** (attempt - 1));
  }

  throw lastError ?? new ArtifactCollectionError('GITHUB_API_REQUEST_FAILED', 'GitHub API request failed');
}

async function writeManifest(destinationRoot, manifest) {
  await mkdir(destinationRoot, { recursive: true });
  const manifestPath = path.join(destinationRoot, 'github-exact-sha-artifact-collection.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

async function defaultExtractArchive(archivePath, destination) {
  await mkdir(destination, { recursive: true });
  await execFile('unzip', ['-oq', archivePath, '-d', destination]);
}

function validateProducerRun(run, spec, targetSha) {
  if (run?.head_sha !== targetSha) return false;
  if (run?.path !== spec.workflowPath) {
    throw new ArtifactCollectionError(
      'PRODUCER_PATH_MISMATCH',
      `producer workflow path mismatch for ${spec.workflow}`,
      { expected: spec.workflowPath, actual: run?.path ?? null, runId: run?.id ?? null },
    );
  }
  return Number.isInteger(run?.id);
}

async function downloadArtifact({
  artifact,
  run,
  spec,
  destinationRoot,
  repository,
  token,
  apiUrl,
  fetchImpl,
  sleepImpl,
  extractArchive,
}) {
  const artifactName = String(artifact.name);
  const destination = path.join(
    destinationRoot,
    `${artifact.id}-${safeSegment(artifactName)}`,
  );
  const archivePath = `${destination}.zip`;
  const zip = await githubRequest({
    url: `${apiUrl}/repos/${repository}/actions/artifacts/${artifact.id}/zip`,
    token,
    fetchImpl,
    expectJson: false,
    sleepImpl,
  });
  await writeFile(archivePath, zip);
  try {
    await extractArchive(archivePath, destination);
  } finally {
    await rm(archivePath, { force: true });
  }
  return {
    artifactId: artifact.id,
    artifactName,
    producerWorkflow: spec.workflowPath,
    sourceRunId: run.id,
  };
}

export async function collectExactShaArtifacts({
  mode,
  targetSha,
  destinationRoot,
  repository,
  token,
  apiUrl = 'https://api.github.com',
  fetchImpl = globalThis.fetch,
  sleepImpl = sleep,
  extractArchive = defaultExtractArchive,
}) {
  validateTargetSha(targetSha);
  const specs = producerSpecsForMode(mode);
  if (!/^[^/]+\/[^/]+$/.test(repository ?? '')) {
    throw new ArtifactCollectionError('INVALID_REPOSITORY', 'repository must use owner/name form');
  }
  if (!token) throw new ArtifactCollectionError('MISSING_GITHUB_TOKEN', 'GitHub token is required');
  if (typeof fetchImpl !== 'function') throw new ArtifactCollectionError('MISSING_FETCH', 'fetch implementation is required');

  const absoluteDestination = path.resolve(destinationRoot);
  await rm(absoluteDestination, { recursive: true, force: true });
  await mkdir(absoluteDestination, { recursive: true });

  const producerResults = [];
  const collected = [];
  const seenArtifactIds = new Set();

  try {
    for (const spec of specs) {
      const workflowId = encodeURIComponent(spec.workflow);
      const runsUrl = `${apiUrl}/repos/${repository}/actions/workflows/${workflowId}/runs?status=completed&head_sha=${targetSha}&per_page=${RECENT_COMPLETED_RUN_WINDOW}`;
      const runs = await githubRequest({
        url: runsUrl,
        token,
        fetchImpl,
        expectJson: true,
        sleepImpl,
      });

      const totalCompletedRuns = Number(runs?.total_count ?? 0);
      const recentRuns = (runs?.workflow_runs ?? []).filter((run) => validateProducerRun(run, spec, targetSha));
      let inspectedRunCount = 0;
      let selectedRunId = null;
      let producerCollected = 0;

      for (const run of recentRuns) {
        inspectedRunCount += 1;
        const artifactsUrl = `${apiUrl}/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`;
        const artifactInventory = await githubRequest({
          url: artifactsUrl,
          token,
          fetchImpl,
          expectJson: true,
          sleepImpl,
        });

        const totalArtifacts = Number(artifactInventory?.total_count ?? 0);
        if (totalArtifacts > 100) {
          throw new ArtifactCollectionError(
            'RUN_ARTIFACT_INVENTORY_TRUNCATED',
            `more than 100 artifacts exist for producer run ${run.id}; refusing partial evidence inventory`,
            { workflow: spec.workflow, runId: run.id, totalArtifacts },
          );
        }

        const eligible = (artifactInventory?.artifacts ?? []).filter((artifact) =>
          Number.isInteger(artifact?.id)
          && artifact?.expired !== true
          && artifactNameMatches(String(artifact?.name ?? ''), spec.artifactPatterns)
          && !seenArtifactIds.has(artifact.id),
        );

        if (eligible.length === 0) continue;

        selectedRunId = run.id;
        for (const artifact of eligible) {
          const retained = await downloadArtifact({
            artifact,
            run,
            spec,
            destinationRoot: absoluteDestination,
            repository,
            token,
            apiUrl,
            fetchImpl,
            sleepImpl,
            extractArchive,
          });
          seenArtifactIds.add(artifact.id);
          producerCollected += 1;
          collected.push(retained);
        }
        break;
      }

      if (producerCollected === 0 && totalCompletedRuns > recentRuns.length) {
        throw new ArtifactCollectionError(
          'RECENT_RUN_WINDOW_EXHAUSTED',
          `no authorized artifact was found in the ${RECENT_COMPLETED_RUN_WINDOW} most recent completed exact-SHA runs for ${spec.workflow}; refusing to infer absence while older runs remain uninspected`,
          {
            workflow: spec.workflow,
            totalCompletedRuns,
            inspectedRunCount,
            recentRunWindow: RECENT_COMPLETED_RUN_WINDOW,
          },
        );
      }

      producerResults.push({
        workflow: spec.workflowPath,
        totalExactShaCompletedRuns: totalCompletedRuns,
        inspectedRunCount,
        selectedRunId,
        collectedArtifacts: producerCollected,
      });
    }

    const manifest = {
      schema: 'risck-comply.github-exact-sha-artifact-collection.v1',
      generatedAt: new Date().toISOString(),
      status: 'Complete',
      mode,
      targetSha,
      repository,
      recentCompletedRunWindow: RECENT_COMPLETED_RUN_WINDOW,
      producerCount: specs.length,
      collectedArtifactCount: collected.length,
      producers: producerResults,
      artifacts: collected,
      evidenceIntegrity: {
        containsSensitiveValues: false,
        tokenPersisted: false,
        exactShaBound: true,
        producerWorkflowBound: true,
        freshestArtifactBearingRunSelected: true,
      },
      truthBoundary: 'A zero artifact result for a producer is emitted only after its complete returned exact-SHA completed-run inventory was inspected. If the recent run window is inconclusive, or an API, rate-limit, producer-identity, or artifact-inventory failure occurs, collection terminates infrastructure-blocked instead of reporting missing evidence.',
    };
    await writeManifest(absoluteDestination, manifest);
    return manifest;
  } catch (error) {
    const normalized = error instanceof ArtifactCollectionError
      ? error
      : new ArtifactCollectionError(
        'ARTIFACT_COLLECTION_FAILED',
        error instanceof Error ? error.message : String(error),
      );
    await writeManifest(absoluteDestination, {
      schema: 'risck-comply.github-exact-sha-artifact-collection.v1',
      generatedAt: new Date().toISOString(),
      status: 'InfrastructureBlocked',
      mode,
      targetSha,
      repository,
      recentCompletedRunWindow: RECENT_COMPLETED_RUN_WINDOW,
      errorCode: normalized.code,
      details: normalized.details,
      producerCount: specs.length,
      collectedArtifactCount: collected.length,
      producers: producerResults,
      artifacts: collected,
      evidenceIntegrity: {
        containsSensitiveValues: false,
        tokenPersisted: false,
        exactShaBound: true,
        producerWorkflowBound: true,
      },
      truthBoundary: 'Infrastructure failure is not evidence absence and never awards PASS or a synthetic zero-evidence result.',
    });
    throw normalized;
  }
}

async function main() {
  const [mode, targetSha, destinationRootArg] = process.argv.slice(2);
  if (!mode || !targetSha || !destinationRootArg) {
    throw new ArtifactCollectionError(
      'INVALID_ARGUMENTS',
      'usage: collect-github-exact-sha-artifacts.mjs <enterprise-100|dashboard> <target-sha> <destination-root>',
    );
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const destinationRoot = path.resolve(ROOT, destinationRootArg);
  const manifest = await collectExactShaArtifacts({
    mode,
    targetSha,
    destinationRoot,
    repository,
    token,
    apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  });
  console.log(JSON.stringify({
    status: manifest.status,
    mode: manifest.mode,
    targetSha: manifest.targetSha,
    producerCount: manifest.producerCount,
    collectedArtifactCount: manifest.collectedArtifactCount,
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const code = error instanceof ArtifactCollectionError ? error.code : 'ARTIFACT_COLLECTION_FAILED';
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${code}] ${message}`);
    process.exit(1);
  });
}
