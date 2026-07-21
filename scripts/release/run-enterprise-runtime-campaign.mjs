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

if (!token || !repository) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
if (!/^[a-f0-9]{40}$/.test(releaseSha)) throw new Error('RELEASE_SHA must be a lowercase full 40-character SHA');
if (branch !== 'main') throw new Error('Enterprise runtime campaigns are restricted to main');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const pollMs = Number(manifest.poll_interval_seconds || 20) * 1000;
const timeoutMs = Number(manifest.timeout_minutes_per_workflow || 45) * 60 * 1000;
const startedAt = new Date();

const api = async (url, init = {}) => {
  const response = await fetch(`https://api.github.com${url}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${url}`);
  if (response.status === 204) return null;
  return response.json();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyExactMain() {
  const commit = await api(`/repos/${repository}/commits/main`);
  if (commit.sha.toLowerCase() !== releaseSha) {
    throw new Error(`release SHA ${releaseSha} is not current main ${commit.sha}`);
  }
}

async function dispatchWorkflow(workflow) {
  await api(`/repos/${repository}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs: { release_sha: releaseSha } }),
  });
}

async function findRun(workflow, notBefore) {
  const data = await api(`/repos/${repository}/actions/workflows/${workflow}/runs?event=workflow_dispatch&branch=main&per_page=20`);
  return data.workflow_runs.find((run) =>
    run.head_sha?.toLowerCase() === releaseSha && new Date(run.created_at).getTime() >= notBefore - 5000,
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
  throw new Error(`Timed out waiting for ${workflow}`);
}

async function downloadArtifacts(runId, destination) {
  const data = await api(`/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`);
  await mkdir(destination, { recursive: true });
  const downloaded = [];
  for (const artifact of data.artifacts.filter((entry) => !entry.expired)) {
    const response = await fetch(artifact.archive_download_url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) throw new Error(`Artifact download failed with ${response.status}`);
    const zipPath = path.join(destination, `${artifact.name}.zip`);
    await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
    const unzip = spawnSync('unzip', ['-o', zipPath, '-d', destination], { encoding: 'utf8' });
    if (unzip.status !== 0) throw new Error(`Unable to extract ${artifact.name}: ${unzip.stderr}`);
    downloaded.push({ name: artifact.name, size_in_bytes: artifact.size_in_bytes });
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
    result.reason = error instanceof Error ? error.message.replace(token, '[REDACTED]') : 'unknown_error';
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
