#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SOURCE_PATH = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
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

function targetCheckPassed(target, name) {
  return findNamedCheck(target?.detailedChecks, name)?.passed === true;
}

function baseEvidence({
  evidenceItem,
  checkName,
  passed,
  generatedAt,
  expectedSha,
  sourceSha,
  sourceGeneratedAt,
  sourceFresh,
  sourcePassed,
  targetCount,
  sourcePath,
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
      ? `${evidenceItem} passed against the deployed release target.`
      : `${evidenceItem} is missing, stale, SHA-mismatched, or failed; enterprise release remains blocked.`,
    redactionConfirmation:
      'No token, cookie, authorization header, secret value, response body, or customer data is copied into this derived evidence file.',
    sourceEvidence: {
      path: sourcePath,
      generatedAt: sourceGeneratedAt || null,
      commitSha: sourceSha || null,
      expectedSha: expectedSha || null,
      exactShaMatch: Boolean(expectedSha && sourceSha === expectedSha),
      fresh: sourceFresh,
      passed: sourcePassed,
      targetCount,
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
      'scripts/release/run-deployment-smoke-v2.mjs',
      'scripts/release/write-security-response-evidence.mjs',
      sourcePath,
    ],
    evidenceBoundary:
      'This artifact derives from a fresh deployment smoke for one exact SHA. It does not replace external security review, DAST, authenticated tenant-isolation testing, or provider validation.',
  };
}

export function buildSecurityResponseEvidence(
  smokeEvidence,
  expectedSha,
  {
    generatedAt = new Date().toISOString(),
    maxSourceAgeMs = DEFAULT_MAX_SOURCE_AGE_MS,
    sourcePath = DEFAULT_SOURCE_PATH,
  } = {},
) {
  const normalizedExpectedSha = normalizeSha(expectedSha);
  const commitCheck = findNamedCheck(smokeEvidence?.globalChecks, 'lastCommitValidated');
  const sourceSha = normalizeSha(commitCheck?.details?.sha);
  const targets = asArray(smokeEvidence?.targets);
  const generatedAtMs = parseTimestamp(generatedAt);
  const sourceGeneratedAtMs = parseTimestamp(smokeEvidence?.generatedAt);
  const sourceAgeMs =
    generatedAtMs !== null && sourceGeneratedAtMs !== null
      ? generatedAtMs - sourceGeneratedAtMs
      : null;
  const sourceFresh =
    sourceAgeMs !== null && sourceAgeMs >= 0 && sourceAgeMs <= maxSourceAgeMs;
  const exactShaMatch =
    SHA_PATTERN.test(normalizedExpectedSha) &&
    commitCheck?.passed === true &&
    sourceSha === normalizedExpectedSha;
  const sourcePassed =
    smokeEvidence?.status === 'Complete' &&
    smokeEvidence?.outcome === 'passed' &&
    sourceFresh &&
    exactShaMatch &&
    targets.length > 0;

  const headerTargetResults = targets.map((target) => ({
    target: target?.baseUrl || null,
    passed: targetCheckPassed(target, 'securityHeadersPresent'),
  }));
  const noStoreTargetResults = targets.map((target) => ({
    target: target?.baseUrl || null,
    sensitiveApis: targetCheckPassed(target, 'sensitiveApisHaveNoStore'),
    privateRoutes: targetCheckPassed(target, 'privateRoutesHaveNoStore'),
  }));

  const securityHeadersPassed =
    sourcePassed && headerTargetResults.every((target) => target.passed);
  const noStorePassed =
    sourcePassed &&
    noStoreTargetResults.every(
      (target) => target.sensitiveApis && target.privateRoutes,
    );

  return {
    securityHeaders: baseEvidence({
      evidenceItem: 'security-headers-validation',
      checkName: 'securityHeaders',
      passed: securityHeadersPassed,
      generatedAt,
      expectedSha: normalizedExpectedSha,
      sourceSha,
      sourceGeneratedAt: smokeEvidence?.generatedAt,
      sourceFresh,
      sourcePassed,
      targetCount: targets.length,
      sourcePath,
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
      sourceGeneratedAt: smokeEvidence?.generatedAt,
      sourceFresh,
      sourcePassed,
      targetCount: targets.length,
      sourcePath,
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
    throw new Error(`Unable to read deployment smoke evidence at ${path}: ${reason}`);
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeSecurityResponseEvidence({
  sourcePath = process.env.RELEASE_DEPLOYMENT_SMOKE_EVIDENCE_PATH || DEFAULT_SOURCE_PATH,
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
  const result = buildSecurityResponseEvidence(smokeEvidence, expectedSha, {
    generatedAt,
    maxSourceAgeMs,
    sourcePath,
  });

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
