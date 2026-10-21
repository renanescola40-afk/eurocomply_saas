#!/usr/bin/env node
/**
 * Verify the archived CircleCI JSON against the trusted job environment.
 * Validates only SOURCE-ONLY evidence; never upgrades Enterprise NO_GO.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const FULL_SHA = /^[a-f0-9]{40}$/;
const exactKeys = (object, expected) =>
  object !== null && typeof object === 'object' && !Array.isArray(object)
  && Object.keys(object).sort().join('|') === [...expected].sort().join('|');
const keys = Object.freeze({
  root: ['schema','generatedAt','sourceCommitSha','circleci','sourceOnly','enterpriseRelease','containsSensitiveValues'],
  circleci: ['provider','job','branch','buildNumber'],
  sourceOnly: ['result','prerequisite','includes'],
  enterpriseRelease: ['accepted','decision','productionDeployment','authenticatedTenantIsolation','independentReview','providerRuntime','externalAssurance','mandatoryGithubActions','reason'],
});
const requiredChecks = Object.freeze([
  'npm run security:package-lock',
  'scripts/security/check-ci-required-checks-validation.mjs',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'node --test P0 PostgreSQL source contracts',
  'ISO/SOC2 source contracts',
  'scripts/security/run-security-ci-without-audit.mjs',
  'npm run security:npm-audit:all',
  'npm run build',
  'npm run quality:routes',
]);

export function verifyCircleCISourceProof(proof, env, { now = new Date() } = {}) {
  const errors = [];
  if (env?.CIRCLECI !== 'true' || env?.CIRCLE_JOB !== 'validar-risck') {
    errors.push('trusted_circleci_source_job_required');
  }
  if (!FULL_SHA.test(env?.CIRCLE_SHA1 || '') || !Number.isSafeInteger(Number(env?.CIRCLE_BUILD_NUM))
    || Number(env?.CIRCLE_BUILD_NUM) < 1 || !env?.CIRCLE_BRANCH) {
    errors.push('trusted_circleci_identity_missing');
  }
  if (!exactKeys(proof, keys.root)) {
    return [...errors, 'proof_root_schema_invalid'];
  }
  if (proof.schema !== 'risck-comply.circleci-source-only-proof.v1'
    || proof.containsSensitiveValues !== false) errors.push('proof_schema_or_redaction_invalid');
  const t = proof.generatedAt;
  const parsedAt = typeof t === 'string' ? Date.parse(t) : NaN;
  if (!Number.isFinite(parsedAt) || new Date(parsedAt).toISOString() !== t
    || parsedAt > now.getTime() + 5 * 60_000) errors.push('proof_timestamp_invalid');
  if (!FULL_SHA.test(proof.sourceCommitSha || '') || proof.sourceCommitSha !== env?.CIRCLE_SHA1) {
    errors.push('proof_source_sha_mismatch');
  }
  if (!exactKeys(proof.circleci, keys.circleci)
    || proof.circleci.provider !== 'CircleCI'
    || proof.circleci.job !== env?.CIRCLE_JOB
    || proof.circleci.branch !== env?.CIRCLE_BRANCH
    || proof.circleci.buildNumber !== Number(env?.CIRCLE_BUILD_NUM)) {
    errors.push('proof_circleci_job_identity_mismatch');
  }
  if (!exactKeys(proof.sourceOnly, keys.sourceOnly)
    || proof.sourceOnly.result !== 'SOURCE_ONLY_CHECKS_COMPLETED'
    || typeof proof.sourceOnly.prerequisite !== 'string'
    || !proof.sourceOnly.prerequisite.startsWith('Emitted only after successful ')
    || !Array.isArray(proof.sourceOnly.includes)
    || proof.sourceOnly.includes.length !== requiredChecks.length
    || new Set(proof.sourceOnly.includes).size !== requiredChecks.length
    || !requiredChecks.every(x => proof.sourceOnly.includes.includes(x))) {
    errors.push('proof_source_checklist_invalid');
  }
  const release = proof.enterpriseRelease;
  if (!exactKeys(release, keys.enterpriseRelease)
    || release.accepted !== false || release.decision !== 'NO_GO'
    || release.productionDeployment !== 'NOT_TESTED'
    || release.authenticatedTenantIsolation !== 'NOT_TESTED'
    || release.independentReview !== 'NOT_TESTED'
    || release.providerRuntime !== 'NOT_TESTED'
    || release.externalAssurance !== 'NOT_TESTED'
    || release.mandatoryGithubActions !== 'NOT_SUBSTITUTED'
    || typeof release.reason !== 'string'
    || !release.reason.startsWith('CircleCI source evidence is distinct')) {
    errors.push('enterprise_no_go_boundary_breached');
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  const file = path.resolve('artifacts/circleci-source-validation/source-only-validation.json');
  let proof;
  try {
    proof = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    console.error('CircleCI source proof missing or invalid JSON');
    process.exit(1);
  }
  const errors = verifyCircleCISourceProof(proof, process.env);
  if (errors.length) {
    console.error('CircleCI source proof rejected: ' + errors.join(','));
    process.exit(1);
  }
  console.log(JSON.stringify({
    verification: 'CIRCLECI_SOURCE_PROOF_STRUCTURE_PASS',
    sourceSha: proof.sourceCommitSha,
    buildNumber: proof.circleci.buildNumber,
    enterpriseAccepted: false,
    releaseDecision: 'NO_GO',
    evidenceBytesRetrievedByIndependentVerifier: false,
  }));
}
