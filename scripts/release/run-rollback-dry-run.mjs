#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { findExactShaVercelProductionDeployment } from './write-github-vercel-production-deployment-evidence.mjs';
import { shouldAcceptProtectedRollback } from './rollback-protection-policy.mjs';

const evidencePath = 'docs/security/evidence/runtime/rollback-dry-run-validation.json';
const shaPattern = /^[a-f0-9]{40}$/i;
const timeoutMs = Number.parseInt(process.env.RELEASE_ROLLBACK_TIMEOUT_MS || '10000', 10);
const generatedAt = new Date().toISOString();

function firstConfigured(names) {
  for (const name of names) {
    const value = (process.env[name] || '').trim();
    if (value) return { name, value };
  }
  return null;
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function route(baseUrl, routePath) {
  return new URL(routePath, `${baseUrl}/`).toString();
}

function headerValue(headers, name) {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw.join(', ');
  return String(raw || '');
}

function hasNoStore(headers) {
  return /\bno-store\b/i.test(headerValue(headers, 'cache-control'));
}

function isVercelAuthenticationBoundary(response) {
  if (Number(response?.status || 0) !== 302) return false;
  const server = headerValue(response?.headers || {}, 'server').trim().toLowerCase();
  const requestId = headerValue(response?.headers || {}, 'x-vercel-id').trim();
  if (server !== 'vercel' || !requestId) return false;

  const location = headerValue(response?.headers || {}, 'location');
  try {
    const redirect = new URL(location);
    return redirect.protocol === 'https:'
      && redirect.hostname === 'vercel.com'
      && redirect.pathname === '/sso-api';
  } catch {
    return false;
  }
}

function sameHost(left, right) {
  try {
    return new URL(left).hostname === new URL(right).hostname;
  } catch {
    return false;
  }
}

function safeResponseSummary(response) {
  return {
    status: response.status,
    error: response.error ?? null,
    contentType: headerValue(response.headers, 'content-type') || null,
    cacheControl: headerValue(response.headers, 'cache-control') || null,
    bodyStatus: response.body?.status ?? null,
  };
}

function request(url, options = {}) {
  const { method = 'GET', accept = 'application/json', headers = {} } = options;
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve({ status: 0, headers: {}, body: null, error: 'invalid_url' });
      return;
    }

    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.request(parsed, {
      method,
      timeout: timeoutMs,
      headers: {
        Accept: accept,
        'User-Agent': 'risck-comply-rollback-dry-run/4.0',
        ...headers,
      },
    }, (response) => {
      let bodyText = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        bodyText += chunk;
      });
      response.on('end', () => {
        let body = null;
        const contentType = headerValue(response.headers, 'content-type');
        if (contentType.includes('application/json') || bodyText.trim().startsWith('{')) {
          try {
            body = bodyText ? JSON.parse(bodyText) : null;
          } catch {
            body = { parseError: 'non_json_response' };
          }
        }
        resolve({ status: response.statusCode || 0, headers: response.headers, body });
      });
    });

    req.on('timeout', () => req.destroy(new Error('request_timeout')));
    req.on('error', (error) => resolve({ status: 0, headers: {}, body: null, error: error.message }));
    req.end();
  });
}

function createCheck(name, passed, details = {}, critical = true) {
  return { name, critical, passed: Boolean(passed), details };
}

function githubRuntimeContext(commitSha, buildSha) {
  const githubRunId = String(process.env.GITHUB_RUN_ID || '').trim() || null;
  const repository = String(process.env.GITHUB_REPOSITORY || '').trim() || null;
  const branch = String(process.env.GITHUB_REF_NAME || '').trim() || null;
  const generatedByGithubActions = process.env.GITHUB_ACTIONS === 'true'
    && Boolean(githubRunId)
    && Boolean(repository)
    && Boolean(branch);

  return {
    generatedByGithubActions,
    repository,
    branch,
    githubRunId,
    githubRunAttempt: String(process.env.GITHUB_RUN_ATTEMPT || '').trim() || null,
    githubWorkflow: String(process.env.GITHUB_WORKFLOW || '').trim() || null,
    githubEventName: String(process.env.GITHUB_EVENT_NAME || '').trim() || null,
    commitSha,
    buildSha,
  };
}

const resolutionMode = String(process.env.RELEASE_ROLLBACK_RESOLUTION_MODE || 'manual').trim().toLowerCase();
const automaticResolution = resolutionMode === 'automatic';
const automaticEvidencePath = String(
  process.env.RELEASE_ROLLBACK_AUTOMATIC_EVIDENCE_PATH
    || 'artifacts/release/public-ga-rollback-resolution.json',
).trim();
const expectedRepository = String(process.env.GITHUB_REPOSITORY || '').trim();
const expectedRunId = String(process.env.GITHUB_RUN_ID || '').trim();
const expectedRunAttempt = String(process.env.GITHUB_RUN_ATTEMPT || '').trim();
const expectedWorkflow = String(process.env.GITHUB_WORKFLOW || '').trim();
const expectedProjectDigest = String(process.env.RELEASE_ROLLBACK_EXPECTED_PROJECT_DIGEST || '').trim();
const expectedCurrentDeploymentDigest = String(process.env.RELEASE_ROLLBACK_EXPECTED_CURRENT_DEPLOYMENT_DIGEST || '').trim();
const digestPattern = /^sha256:[a-f0-9]{64}$/;

function readAutomaticRollbackAttestation() {
  if (!automaticResolution) return null;
  try {
    const evidence = JSON.parse(readFileSync(automaticEvidencePath, 'utf8'));
    const provenance = evidence?.provenance;
    const provenanceMatches = currentShaConfigured
      && Boolean(expectedRepository)
      && Boolean(expectedRunId)
      && Boolean(expectedWorkflow)
      && digestPattern.test(expectedProjectDigest)
      && digestPattern.test(expectedCurrentDeploymentDigest)
      && provenance?.releaseSha === currentSha.toLowerCase()
      && provenance?.repository === expectedRepository
      && provenance?.githubRunId === expectedRunId
      && provenance?.githubRunAttempt === (expectedRunAttempt || null)
      && provenance?.githubWorkflow === expectedWorkflow
      && provenance?.projectDigest === expectedProjectDigest
      && provenance?.currentDeploymentDigest === expectedCurrentDeploymentDigest;

    const passed = evidence?.schema === 'risck-comply.public-ga-rollback-resolution.v3'
      && evidence?.status === 'Complete'
      && evidence?.outcome === 'passed'
      && evidence?.resolutionMode === 'automatic'
      && provenanceMatches
      && evidence?.policy?.exactProjectRequired === true
      && evidence?.policy?.exactCurrentReleaseExcluded === true
      && evidence?.policy?.previousDeploymentRequired === true
      && evidence?.policy?.deploymentStateRequired === 'READY'
      && evidence?.policy?.deploymentTargetRequired === 'production'
      && evidence?.checks?.rollbackCandidateValidated === true
      && evidence?.checks?.providerIdentityValidated === true
      && evidence?.checks?.healthEndpointValidated === true
      && evidence?.checks?.healthNoStoreValidated === true
      && evidence?.evidenceIntegrity?.containsSensitiveValues === false
      && evidence?.evidenceIntegrity?.selectedRollbackIdentifiersStored === false
      && evidence?.evidenceIntegrity?.rawDeploymentUrlStored === false
      && evidence?.evidenceIntegrity?.tokenStored === false
      && evidence?.evidenceIntegrity?.provenanceContainsRawProviderIdentifiers === false;
    return { passed, path: automaticEvidencePath, provenanceMatches };
  } catch {
    return { passed: false, path: automaticEvidencePath, provenanceMatches: false };
  }
}

const targetUrlConfig = firstConfigured([
  'RELEASE_ROLLBACK_TARGET_URL',
  'RELEASE_ROLLBACK_TARGET',
  'ROLLBACK_TARGET_URL',
  'ROLLBACK_TARGET',
  'PREVIOUS_KNOWN_GOOD_URL',
  'LAST_KNOWN_GOOD_DEPLOYMENT_URL',
  'VERCEL_ROLLBACK_DEPLOYMENT_URL',
]);
const targetShaConfig = firstConfigured([
  'RELEASE_ROLLBACK_TARGET_SHA',
  'RELEASE_ROLLBACK_TARGET_COMMIT_SHA',
  'ROLLBACK_TARGET_SHA',
  'ROLLBACK_TARGET_COMMIT_SHA',
  'PREVIOUS_KNOWN_GOOD_SHA',
  'PREVIOUS_KNOWN_GOOD_COMMIT_SHA',
  'LAST_KNOWN_GOOD_COMMIT_SHA',
  'LAST_KNOWN_GOOD_SHA',
]);
const targetUrl = automaticResolution ? null : normalizeUrl(targetUrlConfig?.value);
const targetSha = automaticResolution ? '' : (targetShaConfig?.value || '');
const currentSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || process.env.RELEASE_CURRENT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
const currentShaConfigured = shaPattern.test(currentSha);
const automaticAttestation = readAutomaticRollbackAttestation();
const automaticAttested = automaticResolution && automaticAttestation?.passed === true;
const targetShaConfigured = automaticResolution ? automaticAttested : shaPattern.test(targetSha);
const targetDiffersFromCurrentRelease = automaticResolution
  ? automaticAttested
  : currentShaConfigured && targetShaConfigured && currentSha !== targetSha;
const rollbackRunbookPresent = existsSync('docs/operations/ROLLBACK_RUNBOOK.md');
const targetValidationProof = process.env.RELEASE_ROLLBACK_TARGET_VALIDATED === 'true';
const vercelProtectionBypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
const vercelTrustedOidcToken = (process.env.VERCEL_TRUSTED_OIDC_TOKEN || '').trim();
const vercelProtectionHeaders = vercelProtectionBypassSecret
  ? { 'x-vercel-protection-bypass': vercelProtectionBypassSecret }
  : vercelTrustedOidcToken
    ? { 'x-vercel-trusted-oidc-idp-token': vercelTrustedOidcToken }
    : {};
const vercelProtectionAuthMode = automaticResolution
  ? 'automatic-provider-attestation'
  : vercelProtectionBypassSecret
    ? 'automation-bypass-secret'
    : vercelTrustedOidcToken
      ? 'github-oidc-trusted-source'
      : 'none';

const checks = [
  createCheck('rollbackTargetUrlConfigured', automaticResolution ? automaticAttested : Boolean(targetUrlConfig?.value), {
    source: automaticResolution ? 'automatic-provider-attestation' : targetUrlConfig?.name ?? null,
    resolutionMode,
    provenanceMatches: automaticResolution ? automaticAttestation?.provenanceMatches === true : null,
  }),
  createCheck('rollbackTargetUrlValid', automaticResolution ? automaticAttested : Boolean(targetUrl), {
    source: automaticResolution ? 'automatic-provider-attestation' : targetUrlConfig?.name ?? null,
    resolutionMode,
  }),
  createCheck('rollbackTargetShaConfigured', targetShaConfigured, {
    source: automaticResolution ? 'automatic-provider-attestation' : targetShaConfig?.name ?? null,
    shaPrefix: automaticResolution ? null : (targetSha ? `${targetSha.slice(0, 12)}…` : null),
    rawIdentifierPersisted: false,
  }),
  createCheck('currentReleaseShaConfigured', currentShaConfigured, {
    shaPresent: Boolean(currentSha),
  }),
  createCheck('rollbackTargetDiffersFromCurrentRelease', targetDiffersFromCurrentRelease, {
    currentShaPresent: currentShaConfigured,
    targetShaPresent: targetShaConfigured,
    provenBy: automaticResolution ? 'resolver-policy-exactCurrentReleaseExcluded' : 'explicit-target-sha',
  }),
  createCheck('rollbackRunbookPresent', rollbackRunbookPresent, {
    path: 'docs/operations/ROLLBACK_RUNBOOK.md',
  }),
  createCheck('legacyRollbackPlanPresent', existsSync('docs/RELEASE_ROLLBACK_PLAN.md'), {
    path: 'docs/RELEASE_ROLLBACK_PLAN.md',
  }, false),
  createCheck('functionalValidationProofRecorded', targetValidationProof && (!automaticResolution || automaticAttested), {
    requiredEnv: 'RELEASE_ROLLBACK_TARGET_VALIDATED=true',
    resolverAttested: automaticResolution ? automaticAttested : null,
  }),
];

let rollbackHealth = null;
let providerDeployment = null;
let providerBoundExactSha = false;
const githubToken = String(process.env.GITHUB_TOKEN || '').trim();
const repository = String(process.env.GITHUB_REPOSITORY || '').trim();
const githubApiUrl = String(process.env.GITHUB_API_URL || 'https://api.github.com').trim();

if (!automaticResolution && targetUrl && targetShaConfigured && githubToken && repository) {
  providerDeployment = await findExactShaVercelProductionDeployment({
    repository,
    targetSha: targetSha.toLowerCase(),
    token: githubToken,
    apiUrl: githubApiUrl,
  });
  providerBoundExactSha = Boolean(providerDeployment?.publicUrl && sameHost(providerDeployment.publicUrl, targetUrl));
}

if (automaticResolution) {
  checks.push(createCheck('rollbackTargetHealthOk', automaticAttested, {
    source: automaticAttestation?.path ?? automaticEvidencePath,
    duplicateNetworkProbeSkipped: true,
  }));
  checks.push(createCheck('rollbackTargetHealthNoStore', automaticAttested, {
    source: automaticAttestation?.path ?? automaticEvidencePath,
    duplicateNetworkProbeSkipped: true,
  }));
} else if (targetUrl) {
  rollbackHealth = await request(route(targetUrl, '/api/health'), {
    headers: vercelProtectionHeaders,
  });
  const directHealthOk = rollbackHealth.status === 200 && rollbackHealth.body?.status === 'ok';
  const authBoundaryObserved = isVercelAuthenticationBoundary(rollbackHealth);
  const protectedValidatedFallback = !directHealthOk && shouldAcceptProtectedRollback({
    directHealthOk,
    authBoundaryObserved,
    providerBoundExactSha,
    targetValidationProof,
  });

  checks.push(createCheck('rollbackTargetHealthOk', directHealthOk || protectedValidatedFallback, {
    ...safeResponseSummary(rollbackHealth),
    providerBoundExactSha,
    authBoundaryObserved,
    protectedValidatedFallback,
  }));
  checks.push(createCheck('rollbackTargetHealthNoStore', hasNoStore(rollbackHealth.headers), safeResponseSummary(rollbackHealth)));
} else {
  checks.push(createCheck('rollbackTargetHealthOk', false, { skipped: true, reason: 'missing_valid_rollback_target_url' }));
  checks.push(createCheck('rollbackTargetHealthNoStore', false, { skipped: true, reason: 'missing_valid_rollback_target_url' }));
}

const readinessToken = (process.env.HEALTHCHECK_TOKEN || '').trim();
const runReadyCheck = process.env.RELEASE_ROLLBACK_CHECK_READY === 'true';
let rollbackReady = null;
if (!automaticResolution && targetUrl && runReadyCheck && readinessToken) {
  rollbackReady = await request(route(targetUrl, '/api/ready'), {
    headers: {
      Authorization: `Bearer ${readinessToken}`,
      ...vercelProtectionHeaders,
    },
  });
  checks.push(createCheck('rollbackTargetReadyOk', rollbackReady.status === 200 && rollbackReady.body?.status === 'ready', safeResponseSummary(rollbackReady)));
  checks.push(createCheck('rollbackTargetReadyNoStore', hasNoStore(rollbackReady.headers), safeResponseSummary(rollbackReady)));
} else if (runReadyCheck) {
  checks.push(createCheck('rollbackTargetReadyOk', false, {
    skipped: false,
    reason: automaticResolution ? 'automatic_resolver_does_not_attest_protected_readiness' : (targetUrl ? 'missing_healthcheck_token' : 'missing_valid_rollback_target_url'),
    requiredEnv: readinessToken ? null : 'HEALTHCHECK_TOKEN',
  }));
  checks.push(createCheck('rollbackTargetReadyNoStore', false, {
    skipped: false,
    reason: automaticResolution ? 'automatic_resolver_does_not_attest_protected_readiness' : (targetUrl ? 'missing_healthcheck_token' : 'missing_valid_rollback_target_url'),
    requiredEnv: automaticResolution ? null : (readinessToken ? null : 'HEALTHCHECK_TOKEN'),
  }));
} else {
  checks.push(createCheck('rollbackTargetReadyOk', true, {
    skipped: true,
    reason: 'set RELEASE_ROLLBACK_CHECK_READY=true to verify protected readiness on the rollback target',
  }, false));
}

const directHealthOk = automaticResolution
  ? automaticAttested
  : rollbackHealth?.status === 200 && rollbackHealth?.body?.status === 'ok';
const authBoundaryObserved = automaticResolution ? false : isVercelAuthenticationBoundary(rollbackHealth);
const protectedValidatedFallback = Boolean(
  !automaticResolution
  && !directHealthOk
  && shouldAcceptProtectedRollback({
    directHealthOk,
    authBoundaryObserved,
    providerBoundExactSha,
    targetValidationProof,
  }),
);
const healthOk = automaticResolution ? automaticAttested : Boolean(directHealthOk || protectedValidatedFallback);
const healthNoStore = automaticResolution ? automaticAttested : Boolean(rollbackHealth && hasNoStore(rollbackHealth.headers));
const readyOk = runReadyCheck
  ? rollbackReady?.status === 200 && rollbackReady?.body?.status === 'ready'
  : null;
const readyNoStore = runReadyCheck ? Boolean(rollbackReady && hasNoStore(rollbackReady.headers)) : null;
const failures = checks.filter((check) => check.critical && !check.passed).map((check) => check.name);
const outcome = failures.length === 0 ? 'passed' : 'failed';
const runtimeContext = githubRuntimeContext(currentSha || null, buildSha);

const evidence = {
  schema: 'risck-comply.rollback-dry-run-validation.v3',
  evidenceItem: 'rollback-dry-run-validation',
  status: outcome === 'passed' ? 'Complete' : 'Open',
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY release automation',
  runner: 'RISCK COMPLY release automation',
  releaseTarget: process.env.RELEASE_TARGET || 'production',
  commitSha: currentSha || null,
  buildSha,
  runtimeContext,
  summary: outcome === 'passed'
    ? 'Rollback dry-run verified previous known-good metadata, public health, no-store controls, and functional validation proof without mutating production.'
    : 'Rollback dry-run evidence is incomplete or the rollback target failed runtime validation; release remains blocked.',
  redactionConfirmation: 'Redaction confirmed: no token, cookie, authorization header, protection bypass secret, secret value, or raw rollback URL is written to this evidence file.',
  noSecretsStored: true,
  commandsExecuted: ['npm run release:rollback:dry-run'],
  evidenceLocations: [
    'scripts/release/run-rollback-dry-run.mjs',
    'docs/operations/ROLLBACK_RUNBOOK.md',
    'docs/RELEASE_ROLLBACK_PLAN.md',
    ...(automaticResolution ? [automaticEvidencePath] : []),
    evidencePath,
  ],
  controlsVerified: outcome === 'passed'
    ? checks.filter((check) => check.critical && check.passed).map((check) => check.name)
    : [],
  rollbackTarget: {
    urlConfigured: automaticResolution ? automaticAttested : Boolean(targetUrlConfig?.value),
    urlValid: automaticResolution ? automaticAttested : Boolean(targetUrl),
    urlSource: automaticResolution ? 'automatic-provider-attestation' : targetUrlConfig?.name ?? null,
    shaSource: automaticResolution ? 'automatic-provider-attestation' : targetShaConfig?.name ?? null,
    shaPrefix: automaticResolution ? null : (targetSha ? `${targetSha.slice(0, 12)}…` : null),
    shaFullRecordedPrivately: automaticResolution ? false : targetShaConfigured,
    identifiersResolvedWithoutPersistence: automaticResolution ? automaticAttested : false,
    protectionBypassUsed: Boolean(vercelProtectionBypassSecret),
    trustedOidcUsed: Boolean(vercelTrustedOidcToken),
    protectionAuthMode: vercelProtectionAuthMode,
    providerBoundExactSha: automaticResolution ? false : providerBoundExactSha,
    authBoundaryObserved: automaticResolution ? false : authBoundaryObserved,
    protectedValidatedFallbackUsed: automaticResolution ? false : protectedValidatedFallback,
    health: rollbackHealth ? safeResponseSummary(rollbackHealth) : null,
    readinessChecked: Boolean(rollbackReady),
    readiness: rollbackReady ? safeResponseSummary(rollbackReady) : null,
  },
  dryRun: {
    mutatesProduction: false,
    commandExecuted: true,
    commandMode: automaticResolution ? 'automatic-provider-attestation-validation' : 'metadata-plus-network-health-validation',
    timeoutMs,
  },
  targetValidation: {
    passed: targetValidationProof && (!automaticResolution || automaticAttested),
    targetConfigured: automaticResolution ? automaticAttested : Boolean(targetUrl),
    targetShaConfigured,
    targetDiffersFromCurrentRelease,
    healthOk,
    directHealthOk,
    healthNoStore,
    providerBoundExactSha: automaticResolution ? false : providerBoundExactSha,
    authBoundaryObserved: automaticResolution ? false : authBoundaryObserved,
    protectedValidatedFallbackUsed: automaticResolution ? false : protectedValidatedFallback,
    readyCheckRequired: runReadyCheck,
    readyOk,
    readyNoStore,
    protectionBypassUsed: Boolean(vercelProtectionBypassSecret),
    trustedOidcUsed: Boolean(vercelTrustedOidcToken),
    protectionAuthMode: vercelProtectionAuthMode,
    requiredEnv: 'RELEASE_ROLLBACK_TARGET_VALIDATED=true',
    note: automaticResolution
      ? 'Automatic mode consumes the provider-bound rollback resolver attestation; no raw rollback identifier is persisted in this evidence.'
      : 'This flag must only be set after manual functional validation of the previous known-good deployment.',
  },
  runbook: {
    present: rollbackRunbookPresent,
    path: 'docs/operations/ROLLBACK_RUNBOOK.md',
  },
  functionalValidation: {
    recorded: targetValidationProof && (!automaticResolution || automaticAttested),
    source: automaticResolution ? 'automatic-provider-attestation+RELEASE_ROLLBACK_TARGET_VALIDATED' : 'RELEASE_ROLLBACK_TARGET_VALIDATED',
  },
  checks,
  failures,
  releaseGate: outcome === 'passed'
    ? 'Rollback dry-run evidence is present and passed.'
    : 'Release remains blocked until rollback dry-run and target validation are Complete/passed.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    protectionBypassSecretStored: false,
    trustedOidcTokenStored: false,
    cookiesStored: false,
    rollbackTargetStored: false,
    exactShaBound: runtimeContext.generatedByGithubActions && currentShaConfigured,
  },
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${evidencePath}`);

if (failures.length > 0) {
  console.error('Rollback dry-run validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Rollback dry-run validation passed.');
