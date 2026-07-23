#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const PASS = new Set(['PASS', 'SUCCESS', 'VERIFIED', 'GO']);

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function baseFailures({ targetSha, runId, repository }) {
  const failures = [];
  if (!FULL_SHA.test(targetSha)) failures.push('targetSha must be a full lowercase SHA');
  if (!/^\d+$/.test(String(runId))) failures.push('runId must be numeric');
  if (repository !== REPOSITORY) failures.push('repository must be canonical');
  return failures;
}

function readinessFailures(safeCoverage, targetSha) {
  const failures = [];
  if (safeCoverage?.targetSha !== targetSha) failures.push('safe coverage SHA mismatch');
  if (safeCoverage?.repository !== REPOSITORY) failures.push('safe coverage repository mismatch');
  if (safeCoverage?.scores?.implementationCoverage !== 100) failures.push('implementation coverage must be 100');
  if (safeCoverage?.scores?.ciVerifiedCoverage !== 100) failures.push('CI coverage must be 100');
  if ((safeCoverage?.scores?.runtimeEvidenceCoverage ?? 0) < 84) failures.push('safe runtime coverage must be at least 84');
  if (safeCoverage?.releaseDecision !== 'EU_AI_ACT_PRODUCT_COVERAGE_NO_GO') failures.push('safe coverage must remain NO_GO');
  return failures;
}

function proofFailures(proof, targetSha, label) {
  const failures = [];
  if (!PASS.has(String(proof?.status ?? '').toUpperCase())) failures.push(`${label} proof missing`);
  if (proof?.targetSha !== targetSha) failures.push(`${label} proof SHA mismatch`);
  return failures;
}

export function validateInputs({ targetSha, runId, repository, safeCoverage, providerProof, platformProof, strict }) {
  const groups = {
    base: baseFailures({ targetSha, runId, repository }),
    readiness: readinessFailures(safeCoverage, targetSha),
    provider: proofFailures(providerProof, targetSha, 'provider failure'),
    platform: proofFailures(platformProof, targetSha, 'platform'),
  };
  const failures = Object.values(groups).flat();
  if (strict && failures.length) fail(failures.join('; '));
  return { failures, groups };
}

function evidence({ targetSha, runId, workstreamId, source, limitations }) {
  const body = {
    schema: 'risck-comply.eu-ai-act-runtime-evidence.v1',
    repository: REPOSITORY,
    targetSha,
    workflowRunId: String(runId),
    generatedAt: new Date().toISOString(),
    workstreamId,
    status: 'VERIFIED',
    environment: 'github-actions-protected-closeout',
    providerMode: 'exact-sha-runtime',
    syntheticData: true,
    redaction: 'No customer data, credentials or provider secrets retained.',
    source,
    limitations,
  };
  return { ...body, integrity: { sha256: digest(body) } };
}

export function buildBundle({ targetSha, runId, repository, safeCoverage, providerProof, platformProof, strict = false }) {
  const validation = validateInputs({ targetSha, runId, repository, safeCoverage, providerProof, platformProof, strict });
  const accepted = new Set();
  if (validation.groups.base.length === 0 && validation.groups.readiness.length === 0) accepted.add('READINESS-SCORING');
  if (validation.groups.base.length === 0 && validation.groups.provider.length === 0) accepted.add('VENDOR-ASSURANCE');
  if (validation.groups.base.length === 0 && validation.groups.platform.length === 0) accepted.add('PLATFORM-CONTROLS');

  const docs = {};
  if (accepted.has('READINESS-SCORING')) docs['artifacts/enterprise-readiness/enterprise-readiness-scorecard.json'] = evidence({
    targetSha,
    runId,
    workstreamId: 'READINESS-SCORING',
    source: 'safe product coverage coherence plus exact-SHA enterprise controls',
    limitations: ['Proves score coherence and evidence lineage, not legal compliance or regulator approval.'],
  });
  if (accepted.has('VENDOR-ASSURANCE')) docs['docs/security/evidence/runtime/provider-failure-classification.json'] = evidence({
    targetSha,
    runId,
    workstreamId: 'VENDOR-ASSURANCE',
    source: providerProof.source ?? 'provider failure contract and classification proof',
    limitations: ['Uses synthetic provider-failure scenarios and does not certify third-party availability.'],
  });
  if (accepted.has('PLATFORM-CONTROLS')) docs['docs/security/evidence/runtime/branch-protection-validation.json'] = evidence({
    targetSha,
    runId,
    workstreamId: 'PLATFORM-CONTROLS',
    source: platformProof.source ?? 'GitHub branch protection and required-check proof',
    limitations: ['Proves repository policy at the observed time; administrator changes can invalidate it.'],
  });
  return { failures: validation.failures, failureGroups: validation.groups, accepted: [...accepted], docs };
}

function main() {
  const targetSha = String(process.env.TARGET_SHA ?? '').trim().toLowerCase();
  const runId = String(process.env.GITHUB_RUN_ID ?? '');
  const repository = String(process.env.GITHUB_REPOSITORY ?? '');
  const safeCoverage = readJson(process.env.SAFE_COVERAGE_PATH ?? 'artifacts/eu-ai-act-safe-runtime-promotion/eu-ai-act-product-coverage.json');
  const providerProof = readJson(process.env.PROVIDER_PROOF_PATH ?? 'artifacts/eu-ai-act-final-runtime/provider-proof.json');
  const platformProof = readJson(process.env.PLATFORM_PROOF_PATH ?? 'artifacts/eu-ai-act-final-runtime/platform-proof.json');
  const strict = process.env.STRICT_CLOSEOUT === '1';
  const result = buildBundle({ targetSha, runId, repository, safeCoverage, providerProof, platformProof, strict });
  const root = resolve(process.env.RUNTIME_EVIDENCE_ROOT ?? 'artifacts/eu-ai-act-final-runtime/evidence-root');
  for (const [path, document] of Object.entries(result.docs)) {
    const output = resolve(root, path);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
  }
  mkdirSync(resolve('artifacts/eu-ai-act-final-runtime'), { recursive: true });
  writeFileSync(resolve('artifacts/eu-ai-act-final-runtime/final-runtime-bundle.json'), `${JSON.stringify({ targetSha, strict, ...result }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ accepted: result.accepted, failures: result.failures }));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
