#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SOURCE_PATH = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const DEFAULT_SHA_BINDING_PATH = 'docs/security/evidence/runtime/runtime-release-sha-validation.json';
const DEFAULT_HEADERS_PATH = 'docs/security/evidence/runtime/security-headers-validation.json';
const DEFAULT_NO_STORE_PATH = 'docs/security/evidence/runtime/no-store-validation.json';
const DEFAULT_MAX_SOURCE_AGE_MS = 30 * 60 * 1000;
const SHA_PATTERN = /^[a-f0-9]{40}$/;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function findNamedCheck(checks, name) {
  return asArray(checks).find((item) => item?.name === name) ?? null;
}

function parseTimestamp(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSha(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeHost(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(candidate).host.toLowerCase();
  } catch {
    return null;
  }
}

function isFresh(sourceGeneratedAt, generatedAt, maxAgeMs) {
  const generatedAtMs = parseTimestamp(generatedAt);
  const sourceGeneratedAtMs = parseTimestamp(sourceGeneratedAt);
  if (generatedAtMs === null || sourceGeneratedAtMs === null) return false;
  const ageMs = generatedAtMs - sourceGeneratedAtMs;
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

function targetCheckPassed(target, name) {
  return findNamedCheck(target?.detailedChecks, name)?.passed === true;
}

function safeIntegrity(document) {
  return document?.evidenceIntegrity?.containsSensitiveValues === false
    && document?.evidenceIntegrity?.valuesRedacted === true
    && document?.evidenceIntegrity?.authorizationHeaderStored === false
    && document?.evidenceIntegrity?.cookiesStored === false;
}

function baseEvidence({
  evidenceItem,
  checkName,
  passed,
  generatedAt,
  expectedSha,
  sourceSha,
  sourceBuildSha,
  sourceGeneratedAt,
  sourceFresh,
  sourcePassed,
  targetCount,
  sourcePath,
  shaBindingPath,
  runtimeShaBinding,
  details,
}) {
  return {
    evidenceItem,
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'failed',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY release automation',
    targetSha: expectedSha || null,
    summary: passed
      ? `${evidenceItem} passed against a fresh, exact-SHA-bound deployed release target.`
      : `${evidenceItem} is missing, stale, SHA-mismatched, host-unbound, or failed; enterprise release remains blocked.`,
    redactionConfirmation:
      'No token, cookie, authorization header, secret value, response body, raw URL, query string, or customer data is copied into this derived evidence file.',
    sourceEvidence: {
      path: sourcePath,
      generatedAt: sourceGeneratedAt || null,
      commitSha: sourceSha || null,
      buildSha: sourceBuildSha || null,
      expectedSha: expectedSha || null,
      exactCommitShaMatch: Boolean(expectedSha && sourceSha === expectedSha),
      exactBuildShaMatch: Boolean(expectedSha && sourceBuildSha === expectedSha),
      fresh: sourceFresh,
      passed: sourcePassed,
      targetCount,
    },
    runtimeShaBinding: {
      path: shaBindingPath,
      status: runtimeShaBinding.status || null,
      outcome: runtimeShaBinding.outcome || null,
      generatedAt: runtimeShaBinding.generatedAt || null,
      fresh: runtimeShaBinding.fresh,
      targetHost: runtimeShaBinding.targetHost,
      expectedCommitSha: runtimeShaBinding.expectedCommitSha || null,
      expectedBuildSha: runtimeShaBinding.expectedBuildSha || null,
      observedCommitSha: runtimeShaBinding.observedCommitSha || null,
      observedCommitShaMatchedExpected:
        runtimeShaBinding.observedCommitShaMatchedExpected === true,
      checksPassed: runtimeShaBinding.checksPassed,
      failuresEmpty: runtimeShaBinding.failuresEmpty,
      passed: runtimeShaBinding.passed,
    },
    checks: [
      {
        name: checkName,
        critical: true,
        passed,
        details,
      },
    ],
    evidenceLocations: [
      'scripts/release/run-deployment-smoke.mjs',
      'scripts/release/verify-runtime-release-sha.mjs',
      'scripts/release/write-security-response-evidence.mjs',
      sourcePath,
      shaBindingPath,
    ],
    evidenceBoundary:
      'This artifact derives from a fresh deployment smoke and a fresh protected runtime SHA proof for the same host. It does not replace external security review, DAST, authenticated tenant-isolation testing, or provider validation.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      valuesRedacted: true,
      authorizationHeaderStored: false,
      cookiesStored: false,
      rawUrlsStored: false,
      responseBodiesStored: false,
    },
  };
}

export function buildSecurityResponseEvidence(
  smokeEvidence,
  runtimeShaEvidence,
  expectedSha,
  {
    generatedAt = new Date().toISOString(),
    maxSourceAgeMs = DEFAULT_MAX_SOURCE_AGE_MS,
    sourcePath = DEFAULT_SOURCE_PATH,
    shaBindingPath = DEFAULT_SHA_BINDING_PATH,
  } = {},
) {
  const normalizedExpectedSha = normalizeSha(expectedSha);
  const commitCheck = findNamedCheck(smokeEvidence?.globalChecks, 'lastCommitValidated');
  const buildCheck = findNamedCheck(smokeEvidence?.globalChecks, 'buildShaRegistered');
  const sourceSha = normalizeSha(commitCheck?.details?.sha);
  const sourceBuildSha = normalizeSha(buildCheck?.details?.sha);
  const targets = asArray(smokeEvidence?.targets);
  const sourceFresh = isFresh(smokeEvidence?.generatedAt, generatedAt, maxSourceAgeMs);
  const exactShaMatch =
    SHA_PATTERN.test(normalizedExpectedSha)
    && commitCheck?.passed === true
    && buildCheck?.passed === true
    && sourceSha === normalizedExpectedSha
    && sourceBuildSha === normalizedExpectedSha;
  const sourcePassed =
    smokeEvidence?.evidenceItem === 'deployment-smoke-validation'
    && smokeEvidence?.status === 'Complete'
    && smokeEvidence?.outcome === 'passed'
    && sourceFresh
    && exactShaMatch
    && asArray(smokeEvidence?.failures).length === 0
    && safeIntegrity(smokeEvidence)
    && targets.length > 0;

  const runtimeTargetHost = normalizeHost(runtimeShaEvidence?.targetHost);
  const runtimeChecks = asArray(runtimeShaEvidence?.checks);
  const runtimeFailures = asArray(runtimeShaEvidence?.failures);
  const runtimeShaBinding = {
    status: runtimeShaEvidence?.status,
    outcome: runtimeShaEvidence?.outcome,
    generatedAt: runtimeShaEvidence?.generatedAt,
    fresh: isFresh(runtimeShaEvidence?.generatedAt, generatedAt, maxSourceAgeMs),
    targetHost: runtimeTargetHost,
    expectedCommitSha: normalizeSha(runtimeShaEvidence?.expectedCommitSha),
    expectedBuildSha: normalizeSha(runtimeShaEvidence?.expectedBuildSha),
    observedCommitSha: normalizeSha(runtimeShaEvidence?.observedCommitSha),
    observedCommitShaMatchedExpected:
      runtimeShaEvidence?.observedCommitShaMatchedExpected === true,
    checksPassed:
      runtimeChecks.length > 0 && runtimeChecks.every((check) => check?.passed === true),
    failuresEmpty: Array.isArray(runtimeShaEvidence?.failures) && runtimeFailures.length === 0,
    passed: false,
  };
  runtimeShaBinding.passed =
    runtimeShaEvidence?.schema === 'risck-comply.runtime-release-sha-validation.v1'
    && runtimeShaEvidence?.evidenceItem === 'runtime-release-sha-validation'
    && runtimeShaEvidence?.status === 'Complete'
    && runtimeShaEvidence?.outcome === 'passed'
    && runtimeShaBinding.fresh
    && Boolean(runtimeTargetHost)
    && runtimeShaBinding.expectedCommitSha === normalizedExpectedSha
    && runtimeShaBinding.expectedBuildSha === normalizedExpectedSha
    && runtimeShaBinding.observedCommitSha === normalizedExpectedSha
    && runtimeShaBinding.observedCommitShaMatchedExpected
    && runtimeShaBinding.checksPassed
    && runtimeShaBinding.failuresEmpty
    && safeIntegrity(runtimeShaEvidence)
    && runtimeShaEvidence?.evidenceIntegrity?.rawNetworkPayloadStored === false
    && runtimeShaEvidence?.evidenceIntegrity?.mismatchedObservedShaStored === false;

  const headerTargetResults = targets.map((target) => {
    const targetHost = normalizeHost(target?.baseUrl);
    const shaBound = Boolean(targetHost && runtimeTargetHost && targetHost === runtimeTargetHost);
    const runtimeCheckPassed = targetCheckPassed(target, 'securityHeadersPresent');
    return {
      targetHost,
      shaBound,
      runtimeCheckPassed,
      passed: shaBound && runtimeCheckPassed,
    };
  });
  const noStoreTargetResults = targets.map((target) => {
    const targetHost = normalizeHost(target?.baseUrl);
    const shaBound = Boolean(targetHost && runtimeTargetHost && targetHost === runtimeTargetHost);
    const sensitiveApis = targetCheckPassed(target, 'sensitiveApisHaveNoStore');
    const privateRoutes = targetCheckPassed(target, 'privateRoutesHaveNoStore');
    return {
      targetHost,
      shaBound,
      sensitiveApis,
      privateRoutes,
      passed: shaBound && sensitiveApis && privateRoutes,
    };
  });

  const securityHeadersPassed =
    sourcePassed
    && runtimeShaBinding.passed
    && headerTargetResults.every((target) => target.passed);
  const noStorePassed =
    sourcePassed
    && runtimeShaBinding.passed
    && noStoreTargetResults.every((target) => target.passed);

  return {
    securityHeaders: baseEvidence({
      evidenceItem: 'security-headers-validation',
      checkName: 'securityHeaders',
      passed: securityHeadersPassed,
      generatedAt,
      expectedSha: normalizedExpectedSha,
      sourceSha,
      sourceBuildSha,
      sourceGeneratedAt: smokeEvidence?.generatedAt,
      sourceFresh,
      sourcePassed,
      targetCount: targets.length,
      sourcePath,
      shaBindingPath,
      runtimeShaBinding,
      details: {
        targetResults: headerTargetResults,
        requiredRuntimeCheck: 'securityHeadersPresent',
      },
    }),
    noStore: baseEvidence({
      evidenceItem: 'no-store-validation',
      checkName: 'noStore',
      passed: noStorePassed,
      generatedAt,
      expectedSha: normalizedExpectedSha,
      sourceSha,
      sourceBuildSha,
      sourceGeneratedAt: smokeEvidence?.generatedAt,
      sourceFresh,
      sourcePassed,
      targetCount: targets.length,
      sourcePath,
      shaBindingPath,
      runtimeShaBinding,
      details: {
        targetResults: noStoreTargetResults,
        requiredRuntimeChecks: [
          'sensitiveApisHaveNoStore',
          'privateRoutesHaveNoStore',
        ],
      },
    }),
  };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown_error';
    throw new Error(`Unable to read runtime evidence at ${path}: ${reason}`);
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeSecurityResponseEvidence({
  sourcePath = process.env.RELEASE_DEPLOYMENT_SMOKE_EVIDENCE_PATH || DEFAULT_SOURCE_PATH,
  shaBindingPath =
    process.env.RELEASE_RUNTIME_SHA_EVIDENCE_PATH || DEFAULT_SHA_BINDING_PATH,
  headersPath = process.env.RELEASE_SECURITY_HEADERS_EVIDENCE_PATH || DEFAULT_HEADERS_PATH,
  noStorePath = process.env.RELEASE_NO_STORE_EVIDENCE_PATH || DEFAULT_NO_STORE_PATH,
  expectedSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || '',
  generatedAt = new Date().toISOString(),
  maxSourceAgeMs = Number(
    process.env.RELEASE_SECURITY_EVIDENCE_MAX_AGE_MS || DEFAULT_MAX_SOURCE_AGE_MS,
  ),
} = {}) {
  if (!Number.isFinite(maxSourceAgeMs) || maxSourceAgeMs <= 0) {
    throw new Error('RELEASE_SECURITY_EVIDENCE_MAX_AGE_MS must be a positive number.');
  }

  const smokeEvidence = readJson(sourcePath);
  const runtimeShaEvidence = readJson(shaBindingPath);
  const result = buildSecurityResponseEvidence(
    smokeEvidence,
    runtimeShaEvidence,
    expectedSha,
    {
      generatedAt,
      maxSourceAgeMs,
      sourcePath,
      shaBindingPath,
    },
  );

  writeJson(headersPath, result.securityHeaders);
  writeJson(noStorePath, result.noStore);

  const failures = [result.securityHeaders, result.noStore]
    .filter((item) => item.outcome !== 'passed')
    .map((item) => item.evidenceItem);

  if (failures.length > 0) {
    throw new Error(`Runtime security response evidence failed: ${failures.join(', ')}`);
  }

  console.log(`Wrote ${headersPath}`);
  console.log(`Wrote ${noStorePath}`);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    writeSecurityResponseEvidence();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
