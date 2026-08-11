#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateDeploymentRuntimeEvidence } from '../release/validate-deployment-runtime-evidence.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'production-runtime-proof.yml';
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`;
const SOURCE_PATH = 'docs/security/evidence/runtime/production-runtime-validation.json';
const DEPLOYMENT_SMOKE_PATH = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const RELEASE_SHA_PATH = 'docs/security/evidence/runtime/runtime-release-sha-validation.json';
const SECURITY_HEADERS_PATH = 'docs/security/evidence/runtime/security-headers-validation.json';
const NO_STORE_PATH = 'docs/security/evidence/runtime/no-store-validation.json';
const BUNDLE_PATHS = [
  SOURCE_PATH,
  DEPLOYMENT_SMOKE_PATH,
  RELEASE_SHA_PATH,
  SECURITY_HEADERS_PATH,
  NO_STORE_PATH,
];
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;
const CANONICAL_PRODUCTION_HOST = 'www.risckcomply.com';
const CANONICAL_PRODUCTION_URL = `https://${CANONICAL_PRODUCTION_HOST}`;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-production-runtime-fetcher',
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: headers(token),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error(`github_api_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export function isOptionalWorkflowUnavailable(error, { required = false, sourceRunId = '' } = {}) {
  const status = Number(error?.status);
  const message = String(error?.message || '');
  return required !== true
    && String(sourceRunId || '').trim() === ''
    && (status === 404 || message === 'github_api_404');
}

export function selectExactShaRun(runs, targetSha, sourceRunId = '') {
  const requested = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.path === WORKFLOW_PATH)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((a, b) => Date.parse(b?.updated_at || 0) - Date.parse(a?.updated_at || 0))[0] ?? null;
}

export function validateDownloadedEvidence(evidence, { targetSha }) {
  const failures = [];
  if (evidence?.schema !== 'risck-comply.production-runtime-scorecard-evidence.v1') failures.push('schema_invalid');
  if (evidence?.evidenceItem !== 'production-runtime-validation') failures.push('evidence_item_invalid');
  if (evidence?.status !== 'Complete' || evidence?.outcome !== 'passed') failures.push('evidence_not_complete');
  if (evidence?.repository !== REPOSITORY || evidence?.branch !== 'main') failures.push('provenance_invalid');
  if (evidence?.targetSha !== targetSha) failures.push('sha_mismatch');
  if (evidence?.targetHost !== CANONICAL_PRODUCTION_HOST) failures.push('host_invalid');
  if (!Array.isArray(evidence?.checks) || evidence.checks.length !== 5 || evidence.checks.some((check) => check?.passed !== true)) failures.push('checks_incomplete');
  if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) failures.push('failures_present');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false || evidence?.evidenceIntegrity?.exactShaBound !== true) failures.push('integrity_invalid');
  return { passed: failures.length === 0, failures };
}

function detailedCheckMap(target) {
  return new Map(
    (Array.isArray(target?.detailedChecks) ? target.detailedChecks : [])
      .map((entry) => [String(entry?.name || ''), entry?.passed === true]),
  );
}

export function normalizeDeploymentSmokeEvidence(source, { targetSha, repository = REPOSITORY, runId }) {
  if (!FULL_SHA.test(String(targetSha || '').toLowerCase())) throw new Error('target_sha_invalid');
  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!NUMERIC.test(String(runId || ''))) throw new Error('run_id_invalid');
  if (source?.evidenceItem !== 'deployment-smoke-validation' || source?.status !== 'Complete' || source?.outcome !== 'passed') {
    throw new Error('deployment_smoke_source_not_complete');
  }
  if (!Array.isArray(source?.failures) || source.failures.length !== 0) throw new Error('deployment_smoke_source_failures_present');
  if (source?.evidenceIntegrity?.valuesRedacted !== true || source?.evidenceIntegrity?.authorizationHeaderStored !== false || source?.evidenceIntegrity?.cookiesStored !== false) {
    throw new Error('deployment_smoke_source_integrity_invalid');
  }

  const targets = (Array.isArray(source?.targets) ? source.targets : []).map((target) => {
    if (target?.baseUrl !== CANONICAL_PRODUCTION_URL) throw new Error('deployment_smoke_target_invalid');
    const checks = detailedCheckMap(target);
    const normalizedChecks = {
      healthOk: checks.get('healthEndpointOk') === true,
      readyProtected: checks.get('readyEndpointRejectsAnonymous') === true,
      readyOk: checks.get('readyEndpointOkWithToken') === true,
      securityHeadersOk: checks.get('securityHeadersPresent') === true,
      sensitiveNoStoreOk: checks.get('privateRoutesHaveNoStore') === true && checks.get('sensitiveApisHaveNoStore') === true,
    };
    const passed = target?.passed === true && Object.values(normalizedChecks).every(Boolean);
    return {
      targetHost: CANONICAL_PRODUCTION_HOST,
      passed,
      checks: normalizedChecks,
    };
  });

  if (targets.length === 0 || targets.some((target) => target.passed !== true)) {
    throw new Error('deployment_smoke_normalization_failed');
  }

  const generatedAt = source?.generatedAt ?? source?.reviewedAt;
  const evidence = {
    schema: 'risck-comply.p0-deployment-runtime-evidence.v1',
    evidenceItem: 'deployment-smoke-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    reviewedAt: source?.reviewedAt ?? generatedAt,
    reviewer: 'RISCK COMPLY protected runtime evidence aggregator',
    repository,
    branch: 'main',
    summary: 'Exact-SHA production response proof was normalized into the canonical P0 deployment runtime contract after health, protected readiness, security-header and no-store checks passed on the production hostname.',
    redactionConfirmation: 'Redaction confirmed for runtime evidence.',
    evidenceLocations: [
      '.github/workflows/production-runtime-proof.yml',
      'scripts/release/run-production-runtime-response-proof.mjs',
      'scripts/enterprise/fetch-production-runtime-evidence.mjs',
      DEPLOYMENT_SMOKE_PATH,
    ],
    controlsVerified: [
      'Production health endpoint passed on the canonical host.',
      'Protected readiness rejected anonymous access and passed with the runtime token.',
      'Required security headers passed on the canonical host.',
      'Private and sensitive API responses enforced no-store.',
      'The runtime proof was bound to the exact protected main SHA.',
    ],
    runtimeContext: {
      generatedByGithubActions: true,
      repository,
      branch: 'main',
      commitSha: String(targetSha).toLowerCase(),
      githubRunId: String(runId),
    },
    targets,
    smokeTargets: {
      passed: [CANONICAL_PRODUCTION_HOST],
      failed: [],
    },
    failures: [],
    evidenceIntegrity: {
      placeholderOnly: false,
      containsSensitiveValues: false,
      customerFacingProof: true,
      runtimeProofInvented: false,
      authorizationHeaderStored: false,
      cookiesStored: false,
      rawResponseBodiesStored: false,
      rawUrlsStored: false,
      exactShaBound: true,
    },
  };

  const validationFailures = validateDeploymentRuntimeEvidence(evidence, {
    expectedRepository: repository,
    expectedBranch: 'main',
  });
  if (validationFailures.length > 0) {
    throw new Error(`normalized_deployment_evidence_invalid:${validationFailures.join(',')}`);
  }
  return evidence;
}

function download(repository, token, artifactId, path) {
  const result = spawnSync('curl', [
    '-fL',
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-o', path,
    `https://api.github.com/repos/${repository}/actions/artifacts/${artifactId}/zip`,
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extractBundle(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
  return Object.fromEntries(BUNDLE_PATHS.map((path) => {
    const entry = entries.find((candidate) => candidate.endsWith(path));
    if (!entry) throw new Error(`bundle_evidence_missing:${path}`);
    return [path, JSON.parse(execFileSync('unzip', ['-p', zipPath, entry], {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    }))];
  }));
}

export function removeStaleProductionRuntimeEvidence(root) {
  // Only the normalized P0 deployment evidence is promoted into runtime evidence.
  // Source aggregate/release lineage are verified in-memory and removed so the
  // global P0 file checker never sees producer-specific contracts it does not own.
  rmSync(join(root, SOURCE_PATH), { force: true });
  rmSync(join(root, DEPLOYMENT_SMOKE_PATH), { force: true });
  rmSync(join(root, RELEASE_SHA_PATH), { force: true });
}

export async function fetchProductionRuntimeEvidence({
  root,
  repository,
  token,
  targetSha,
  sourceRunId = '',
  required = false,
}) {
  removeStaleProductionRuntimeEvidence(root);
  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  let runs;
  try {
    runs = sourceRunId
      ? [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)]
      : (await githubJson(`https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&head_sha=${encodeURIComponent(targetSha)}&per_page=20`, token)).workflow_runs;
  } catch (error) {
    if (isOptionalWorkflowUnavailable(error, { required, sourceRunId })) {
      console.log(`Production runtime workflow is not registered on main yet; evidence remains NOT_VERIFIED for ${targetSha}.`);
      return { found: false, targetSha, reason: 'workflow_not_registered' };
    }
    throw error;
  }

  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_runtime_run_missing');
    console.log(`Production runtime evidence remains NOT_VERIFIED for ${targetSha}.`);
    return { found: false, targetSha };
  }
  if (run.path !== WORKFLOW_PATH) throw new Error('runtime_workflow_path_invalid');

  const runId = String(run.id || '');
  if (!NUMERIC.test(runId)) throw new Error('run_id_invalid');
  const artifacts = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts`, token);
  const expectedName = `production-runtime-proof-${targetSha}`;
  const artifact = (artifacts.artifacts || []).find(
    (item) => item?.name === expectedName && item?.expired !== true,
  );
  if (!artifact || !NUMERIC.test(String(artifact.id || ''))) throw new Error('artifact_missing');

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `production-runtime-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    download(repository, token, String(artifact.id), zipPath);
    const bundle = extractBundle(zipPath);
    const validation = validateDownloadedEvidence(bundle[SOURCE_PATH], { targetSha });
    if (!validation.passed) throw new Error(`runtime_evidence_invalid:${validation.failures.join(',')}`);

    const normalizedDeploymentEvidence = normalizeDeploymentSmokeEvidence(bundle[DEPLOYMENT_SMOKE_PATH], {
      targetSha,
      repository,
      runId,
    });
    const output = join(root, DEPLOYMENT_SMOKE_PATH);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(normalizedDeploymentEvidence, null, 2)}\n`, { mode: 0o600 });

    console.log(`Retrieved and normalized exact-SHA production runtime evidence from workflow run ${runId}.`);
    return { found: true, runId, targetSha };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchProductionRuntimeEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').toLowerCase(),
    sourceRunId: process.env.PRODUCTION_RUNTIME_SOURCE_RUN_ID || '',
    required: process.env.PRODUCTION_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message.split(':')[0] : 'unknown_error');
    process.exit(1);
  });
}
