#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildCloseoutWatchdogReport,
  classifyWorkflowEvidence,
  FULL_ORCHESTRATOR_EVENTS,
  LANE_EVENTS,
  SAFE_ORCHESTRATOR_EVENTS,
  selectLatestExactShaRun,
} from './closeout-watchdog-core.mjs';
import { expectedLanesForProfile } from './runtime-campaign-profiles.mjs';
import { RUNTIME_LANE_CONTRACTS } from './runtime-lane-contracts.mjs';

const token = String(process.env.GITHUB_TOKEN || '');
const repository = String(process.env.GITHUB_REPOSITORY || '');
const releaseSha = String(process.env.RELEASE_SHA || '').toLowerCase();
const branch = String(process.env.RELEASE_BRANCH || 'main');
const manifestPath = String(process.env.RUNTIME_CAMPAIGN_MANIFEST || 'docs/security/evidence/enterprise-runtime-campaign-manifest.json');
const outputPath = String(process.env.CLOSEOUT_WATCHDOG_OUTPUT || 'artifacts/enterprise-readiness/closeout-watchdog.json');
const strict = String(process.env.CLOSEOUT_WATCHDOG_STRICT || 'false').toLowerCase() === 'true';
const githubApiOrigin = 'https://api.github.com';

const CANONICAL_LANE_WORKFLOWS = Object.freeze(Object.fromEntries(
  Object.entries(RUNTIME_LANE_CONTRACTS).map(([id, contract]) => [id, contract.workflow]),
));

const ORCHESTRATOR_WORKFLOWS = Object.freeze({
  'SAFE-BOOTSTRAP': 'enterprise-safe-runtime-bootstrap.yml',
  'FULL-CLOSEOUT': 'enterprise-runtime-closeout.yml',
});

if (!token) throw new Error('GITHUB_TOKEN is required');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY has an invalid format');
if (!/^[a-f0-9]{40}$/.test(releaseSha)) throw new Error('RELEASE_SHA must be a lowercase full 40-character SHA');
if (branch !== 'main') throw new Error('Enterprise closeout watchdog is restricted to main');
if (!outputPath.startsWith('artifacts/') || outputPath.includes('..') || outputPath.includes('\\')) throw new Error('Unsafe watchdog output path');

function githubApiUrl(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.includes('..') || pathname.includes('\\')) {
    throw new Error('Unsafe GitHub API path');
  }
  const url = new URL(pathname, githubApiOrigin);
  if (url.origin !== githubApiOrigin || url.protocol !== 'https:') throw new Error('Unsafe GitHub API destination');
  return url;
}

async function apiJson(pathname) {
  const response = await fetch(githubApiUrl(pathname), {
    redirect: 'error',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return response.json();
}

async function verifyExactMain() {
  const current = await apiJson(`/repos/${repository}/commits/main`);
  if (String(current?.sha || '').toLowerCase() !== releaseSha) {
    throw new Error('RELEASE_SHA is not the exact current main commit');
  }
}

async function readWorkflowEvidence({ id, workflow, artifactPrefix, required, allowedEvents }) {
  const encodedWorkflow = encodeURIComponent(workflow);
  const runs = await apiJson(`/repos/${repository}/actions/workflows/${encodedWorkflow}/runs?branch=main&per_page=100`);
  const run = selectLatestExactShaRun(runs?.workflow_runs, {
    releaseSha,
    allowedEvents,
  });
  const artifacts = run?.id
    ? await apiJson(`/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`)
    : { artifacts: [] };
  return classifyWorkflowEvidence({
    id,
    workflow,
    required,
    run,
    artifacts: artifacts?.artifacts,
    artifactPrefix,
  });
}

await verifyExactMain();
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const canonicalLaneCount = Object.keys(CANONICAL_LANE_WORKFLOWS).length;
if (manifest?.schema_version !== 2 || !Array.isArray(manifest?.workflows) || manifest.workflows.length !== canonicalLaneCount) {
  throw new Error(`Runtime campaign manifest must contain the canonical ${canonicalLaneCount} lanes`);
}

const manifestById = new Map(manifest.workflows.map((lane) => [lane?.id, lane]));
for (const [id, workflow] of Object.entries(CANONICAL_LANE_WORKFLOWS)) {
  const lane = manifestById.get(id);
  if (!lane || lane.workflow !== workflow) {
    throw new Error(`Runtime campaign manifest drift detected for ${id}`);
  }
}
if (manifestById.size !== Object.keys(CANONICAL_LANE_WORKFLOWS).length) {
  throw new Error('Runtime campaign manifest contains unknown or duplicate lanes');
}

const lanes = await Promise.all(Object.entries(CANONICAL_LANE_WORKFLOWS).map(([id, workflow]) => {
  const lane = manifestById.get(id);
  return readWorkflowEvidence({
    id,
    workflow,
    artifactPrefix: lane.artifact_prefix,
    required: lane.required === true,
    allowedEvents: LANE_EVENTS,
  });
}));

const orchestrators = await Promise.all([
  readWorkflowEvidence({
    id: 'SAFE-BOOTSTRAP',
    workflow: ORCHESTRATOR_WORKFLOWS['SAFE-BOOTSTRAP'],
    artifactPrefix: `enterprise-safe-runtime-bootstrap-${releaseSha}`,
    required: true,
    allowedEvents: SAFE_ORCHESTRATOR_EVENTS,
  }),
  readWorkflowEvidence({
    id: 'FULL-CLOSEOUT',
    workflow: ORCHESTRATOR_WORKFLOWS['FULL-CLOSEOUT'],
    artifactPrefix: `enterprise-runtime-closeout-${releaseSha}`,
    required: true,
    allowedEvents: FULL_ORCHESTRATOR_EVENTS,
  }),
]);

const report = buildCloseoutWatchdogReport({
  releaseSha,
  lanes,
  orchestrators,
  safeLaneIds: expectedLanesForProfile('safe'),
});

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  decision: report.decision,
  release_sha: report.release_sha,
  counts: report.counts,
  safe_evidence_retained: report.safe_evidence_retained,
  full_evidence_retained: report.full_evidence_retained,
}));

if (strict && !['SAFE_EVIDENCE_RETAINED', 'GO_EVIDENCE_RETAINED'].includes(report.decision)) {
  process.exitCode = 1;
}
