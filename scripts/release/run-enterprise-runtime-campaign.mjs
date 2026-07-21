#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const releaseSha = (process.env.RELEASE_SHA || '').toLowerCase();
const branch = process.env.RELEASE_BRANCH || 'main';
const manifestPath = process.env.RUNTIME_CAMPAIGN_MANIFEST || 'docs/security/evidence/enterprise-runtime-campaign-manifest.json';
const outputPath = process.env.RUNTIME_CAMPAIGN_OUTPUT || 'artifacts/enterprise-runtime-campaign.json';
const artifactsDir = process.env.RUNTIME_CAMPAIGN_ARTIFACTS_DIR || 'artifacts/runtime-evidence';
const githubApiOrigin = 'https://api.github.com';
const maximumArtifactBytes = 100 * 1024 * 1024;
const maximumArchiveEntries = 2_000;

const allowedWorkflows = new Set([
  'auth-rbac-runtime-proof.yml',
  'identity-access-lifecycle-proof.yml',
  'supabase-live-rls-validation.yml',
  'platform-providers-runtime-proof.yml',
  'data-governance-runtime-proof.yml',
  'incident-continuity-runtime-proof.yml',
  'procurement-trust-runtime-proof.yml',
  'recovery-resilience-proof.yml',
  'production-runtime-proof.yml',
  'step-up-runtime-proof.yml',
]);

if (!token || !repository) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY has an invalid format');
if (!/^[a-f0-9]{40}$/.test(releaseSha)) throw new Error('RELEASE_SHA must be a lowercase full 40-character SHA');
if (branch !== 'main') throw new Error('Enterprise runtime campaigns are restricted to main');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest.workflows) || manifest.workflows.length !== allowedWorkflows.size) {
  throw new Error('Runtime campaign manifest must contain the complete workflow allowlist');
}
for (const lane of manifest.workflows) {
  if (!/^[A-Z0-9-]{2,40}$/.test(lane.id || '')) throw new Error('Runtime campaign lane ID is invalid');
  if (!allowedWorkflows.has(lane.workflow)) throw new Error(`Runtime campaign workflow is not allowlisted: ${lane.workflow}`);
  if (!/^[A-Za-z0-9_.-]{6,100}$/.test(lane.artifact_prefix || '')) throw new Error('Runtime campaign artifact prefix is invalid');
}

const pollMs = Number(manifest.poll_interval_seconds || 20) * 1000;
const timeoutMs = Number(manifest.timeout_minutes_per_workflow || 45) * 60 * 1000;
if (!Number.isFinite(pollMs) || pollMs < 5_000 || pollMs > 300_000) throw new Error('Invalid campaign polling interval');
if (!Number.isFinite(timeoutMs) || timeoutMs < 60_000 || timeoutMs > 4 * 60 * 60 * 1000) throw new Error('Invalid per-workflow timeout');
const startedAt = new Date();

function githubApiUrl(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('..')) {
    throw new Error('Unsafe GitHub API path');
  }
  const url = new URL(pathname, githubApiOrigin);
  if (url.origin !== githubApiOrigin || url.protocol !== 'https:') throw new Error('Unsafe GitHub API destination');
  return url;
}

async function githubRequest(pathname, init = {}) {
  const url = githubApiUrl(pathname);
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return response;
}

async function apiJson(pathname, init = {}) {
  const response = await githubRequest(pathname, init);
  if (response.status === 204) return null;
  return response.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyExactMain() {
  const commit = await apiJson(`/repos/${repository}/commits/main`);
  if (!/^[a-f0-9]{40}$/i.test(commit?.sha || '') || commit.sha.toLowerCase() !== releaseSha) {
    throw new Error('Requested release SHA is not the current main commit');
  }
}

async function dispatchWorkflow(workflow) {
  if (!allowedWorkflows.has(workflow)) throw new Error('Workflow is not allowlisted');
  await apiJson(`/repos/${repository}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs: { release_sha: releaseSha } }),
  });
}

async function findRun(workflow, notBefore) {
  if (!allowedWorkflows.has(workflow)) throw new Error('Workflow is not allowlisted');
  const data = await apiJson(`/repos/${repository}/actions/workflows/${workflow}/runs?event=workflow_dispatch&branch=main&per_page=20`);
  return data.workflow_runs.find((run) =>
    Number.isSafeInteger(run.id)
    && run.head_sha?.toLowerCase() === releaseSha
    && new Date(run.created_at).getTime() >= notBefore - 5000,
  );
}

async function waitForRun(workflow, notBefore) {
  const deadline = Date.now() + timeoutMs;
  let run;
  while (Date.now() < deadline) {
    run = await findRun(workflow, notBefore);
    if (run?.status === 'completed') return run;
    await sleep(pollMs);
  }
  throw new Error(`Timed out waiting for allowlisted workflow ${workflow}`);
}

function assertSafeArchiveEntries(entries) {
  if (entries.length === 0 || entries.length > maximumArchiveEntries) throw new Error('Artifact archive entry count is invalid');
  for (const entry of entries) {
    if (!entry || entry.includes('\0') || entry.includes('\\') || path.posix.isAbsolute(entry)) throw new Error('Artifact archive contains an unsafe path');
    const normalized = path.posix.normalize(entry);
    if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) throw new Error('Artifact archive contains path traversal');
  }
}

async function downloadArtifacts(runId, destination) {
  if (!Number.isSafeInteger(runId) || runId <= 0) throw new Error('Invalid workflow run ID');
  const data = await apiJson(`/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`);
  await mkdir(destination, { recursive: true });
  const downloaded = [];
  for (const artifact of data.artifacts.filter((entry) => !entry.expired)) {
    if (!Number.isSafeInteger(artifact.id) || artifact.id <= 0) throw new Error('Invalid artifact ID');
    if (!Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes <= 0 || artifact.size_in_bytes > maximumArtifactBytes) {
      throw new Error('Artifact size is outside the accepted boundary');
    }
    const response = await githubRequest(`/repos/${repository}/actions/artifacts/${artifact.id}/zip`, {
      headers: { Accept: 'application/octet-stream' },
    });
    const contentLength = Number(response.headers.get('content-length') || artifact.size_in_bytes);
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > maximumArtifactBytes) {
      throw new Error('Artifact response size is outside the accepted boundary');
    }
    const archive = Buffer.from(await response.arrayBuffer());
    if (archive.length === 0 || archive.length > maximumArtifactBytes) throw new Error('Artifact archive size is invalid');

    const listing = spawnSync('unzip', ['-Z1', '-'], { input: archive, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    if (listing.status !== 0) throw new Error('Unable to inspect artifact archive');
    const entries = listing.stdout.split(/\r?\n/).filter(Boolean);
    assertSafeArchiveEntries(entries);

    const unzip = spawnSync('unzip', ['-q', '-o', '-', '-d', destination], { input: archive, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    if (unzip.status !== 0) throw new Error('Unable to extract validated artifact archive');
    downloaded.push({ artifact_id: artifact.id, size_in_bytes: artifact.size_in_bytes, entry_count: entries.length });
  }
  return downloaded;
}

await verifyExactMain();
await mkdir(path.dirname(outputPath), { recursive: true });

const results = [];
for (const lane of manifest.workflows) {
  const dispatchedAt = Date.now();
  const result = {
    id: lane.id,
    workflow: lane.workflow,
    required: lane.required !== false,
    status: 'blocked',
    conclusion: null,
    run_id: null,
    artifact_count: 0,
    reason: null,
  };
  try {
    await dispatchWorkflow(lane.workflow);
    const run = await waitForRun(lane.workflow, dispatchedAt);
    result.run_id = run.id;
    result.conclusion = run.conclusion;
    result.status = run.conclusion === 'success' ? 'complete' : 'blocked';
    if (run.conclusion !== 'success') result.reason = `workflow_${run.conclusion || 'unknown'}`;
    const laneDir = path.join(artifactsDir, lane.id.toLowerCase());
    const artifacts = await downloadArtifacts(run.id, laneDir);
    result.artifact_count = artifacts.length;
    if (result.status === 'complete' && artifacts.length === 0) {
      result.status = 'blocked';
      result.reason = 'missing_artifact';
    }
  } catch (error) {
    result.status = 'blocked';
    result.reason = error instanceof Error ? error.message.replaceAll(token, '[REDACTED]').slice(0, 240) : 'unknown_error';
  }
  results.push(result);
  await writeFile(outputPath, JSON.stringify({
    schema_version: 1,
    release_sha: releaseSha,
    release_branch: branch,
    started_at: startedAt.toISOString(),
    updated_at: new Date().toISOString(),
    decision: 'NO_GO',
    results,
  }, null, 2));
}

const required = results.filter((result) => result.required);
const decision = required.every((result) => result.status === 'complete') ? 'READY_FOR_EVIDENCE_PROMOTION' : 'NO_GO';
const summary = {
  schema_version: 1,
  release_sha: releaseSha,
  release_branch: branch,
  started_at: startedAt.toISOString(),
  completed_at: new Date().toISOString(),
  decision,
  counts: {
    total: results.length,
    complete: results.filter((result) => result.status === 'complete').length,
    blocked: results.filter((result) => result.status !== 'complete').length,
  },
  results,
};
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary.counts));
if (decision !== 'READY_FOR_EVIDENCE_PROMOTION') process.exitCode = 1;
