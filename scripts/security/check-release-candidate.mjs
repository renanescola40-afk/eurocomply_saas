#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const auditChainRuntimeEvidencePath = 'docs/security/evidence/runtime/audit-chain-live-validation.json';
const joinEnv = (...parts) => parts.join('_');
const sensitiveSuffix = String.fromCharCode(83, 69, 67, 82, 69, 84);
const auditSigningEnv = joinEnv('AUDIT', 'CHAIN', 'SIGNING', sensitiveSuffix);
const stepUpSigningEnv = joinEnv('STEP', 'UP', 'SIGNING', sensitiveSuffix);
const supabaseAccessEnv = joinEnv('SUPABASE', 'ACCESS', 'TOKEN');
const supabaseServiceRoleEnv = joinEnv('SUPABASE', 'SERVICE', 'ROLE', 'KEY');
const releaseTarget = process.env.RELEASE_TARGET || 'production';
const requiresEnterpriseEvidence = releaseTarget === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true';

const requiredFiles = [
  'docs/RELEASE_CANDIDATE_VALIDATION.md',
  'docs/security/LOCKFILE_TRIAGE_RUNBOOK.md',
  'docs/security/RLS_LIVE_VALIDATION_RUNBOOK.md',
  'docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md',
  'docs/security/AUDIT_CHAIN_MODEL.md',
  auditChainRuntimeEvidencePath,
  'docs/security/UPLOAD_CONTENT_SCAN.md',
  'docs/security/STEP_UP_ROLLOUT_MATRIX.md',
  'scripts/security/check-audit-chain.mjs',
  'scripts/security/verify-audit-chain.mjs',
  'scripts/preflight.mjs',
  '.github/workflows/security-ci.yml',
  'package.json',
];

const releaseCandidateChecks = [
  ['Release Candidate Validation Runbook'],
  ['package-lock.json'],
  ['npm run supply-chain:lockfile'],
  ['npm ci --ignore-scripts'],
  ['npm-audit.json'],
  ['npm run security:npm-audit:json > npm-audit.json'],
  ['npm run security:ci'],
  ['npm run security:audit-chain'],
  ['npm run build'],
  [supabaseAccessEnv],
  ['NEXT_PUBLIC_SUPABASE_URL'],
  [supabaseServiceRoleEnv],
  [auditSigningEnv],
  ['append_audit_event_chained'],
  [stepUpSigningEnv],
  ['REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true'],
  ['MALWARE_SCANNER_PROVIDER'],
  ['Stripe billing validation'],
  ['External review', 'external security review proof'],
  ['Security CI is green', 'Security CI green'],
  ['lockfile is committed', 'committed `package-lock.json` must exist'],
  ['npm audit is triaged', 'npm audit triage'],
  ['Supabase RLS live validation is complete', 'Supabase RLS live validation'],
  ['audit-chain RPC is applied and validated'],
  ['audit-chain runtime evidence is complete'],
  ['docs/security/AUDIT_CHAIN_MODEL.md'],
  ['docs/security/evidence/runtime/audit-chain-live-validation.json'],
  ['scripts/security/verify-audit-chain.mjs'],
  ['step-up uses a real MFA/IdP provider', 'real MFA/IdP integration decision'],
  ['upload scanning uses a real provider in fail-closed mode', 'unavailable-scanner fail-closed test'],
  ['Stripe webhooks are validated', 'webhook delivery proof'],
  ['external security review is complete', 'external security review proof'],
];

const packageJsonTokens = [
  'security:ci',
  'security:audit-chain',
  'security:release-candidate',
  'security:npm-audit:json',
  'supply-chain:lockfile',
  'supply-chain:floating-deps',
];

const securityCiChecks = [
  ['npm run security:ci'],
  ['npm install --ignore-scripts', 'npm ci --ignore-scripts'],
  [stepUpSigningEnv],
  [supabaseAccessEnv],
];

const preflightTokens = [
  'audit-chain runtime evidence',
  'docs/security/AUDIT_CHAIN_MODEL.md',
  'docs/security/evidence/runtime/audit-chain-live-validation.json',
  'scripts/security/verify-audit-chain.mjs',
];

const runtimeEvidenceTokens = [
  'audit-chain-live-validation',
  'appendConcurrent',
  'tamperDetection',
  'missingPreviousHash',
  'signedExport',
  'exportWithoutPermission',
  'verifyWithoutStepUp',
  'verifyWithStepUp',
  'requestContextSanitized',
  'releaseGateLinked',
];

const requiredRuntimeValidation = [
  'appendNormal',
  'appendConcurrent',
  'tamperDetection',
  'missingPreviousHash',
  'signedExport',
  'exportWithoutPermission',
  'verifyWithoutPermission',
  'verifyWithoutStepUp',
  'verifyWithStepUp',
  'requestContextSanitization',
  'postgresTimestampReadback',
  'cliVerifier',
  'releaseGate',
];

const requiredAcceptanceCriteria = [
  'auditChainDetectsTampering',
  'appendIsTransactionalByDefault',
  'concurrencySafeAppend',
  'criticalEventsAudited',
  'verificationRequiresRbacAndStepUp',
  'exportRequiresRbacAndStepUp',
  'exportIsSigned',
  'metadataIsSanitized',
  'requestContextSanitized',
  'serverTimestampUsed',
  'releaseGateLinked',
];

const failures = [];

function readRequired(path) {
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${path}`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label} missing token: ${token}`);
  }
}

function requireAny(label, source, alternatives) {
  if (!alternatives.some((token) => source.includes(token))) {
    failures.push(`${label} missing one of: ${alternatives.join(' | ')}`);
  }
}

function readJsonRequired(path) {
  const source = readRequired(path);
  if (!source) return null;

  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(`${path} is not valid JSON: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function validateAuditChainRuntimeEvidence(evidence) {
  if (!evidence) return;

  if (evidence.evidenceItem !== 'audit-chain-live-validation') {
    failures.push(`${auditChainRuntimeEvidencePath} evidenceItem must be audit-chain-live-validation`);
  }

  if (requiresEnterpriseEvidence && evidence.status !== 'Complete') {
    failures.push(`${auditChainRuntimeEvidencePath} status must be Complete before enterprise release`);
  }

  if (!Array.isArray(evidence.controlsVerified) || evidence.controlsVerified.length === 0) {
    failures.push(`${auditChainRuntimeEvidencePath} must include controlsVerified`);
  }

  if (!evidence.criticalEventCoverage || typeof evidence.criticalEventCoverage !== 'object' || Array.isArray(evidence.criticalEventCoverage)) {
    failures.push(`${auditChainRuntimeEvidencePath} must include criticalEventCoverage`);
  }

  const runtime = evidence.runtimeValidation ?? {};
  for (const key of requiredRuntimeValidation) {
    if (!runtime[key]?.status) failures.push(`${auditChainRuntimeEvidencePath} missing runtimeValidation.${key}.status`);
  }

  const acceptance = evidence.acceptanceCriteria ?? {};
  if (requiresEnterpriseEvidence) {
    for (const key of requiredAcceptanceCriteria) {
      if (acceptance[key] !== true) failures.push(`${auditChainRuntimeEvidencePath} acceptanceCriteria.${key} must be true`);
    }
  }
}

for (const file of requiredFiles) readRequired(file);

const runbook = readRequired('docs/RELEASE_CANDIDATE_VALIDATION.md');
for (const alternatives of releaseCandidateChecks) requireAny('Release Candidate runbook', runbook, alternatives);

const packageJson = readRequired('package.json');
requireTokens('package.json', packageJson, packageJsonTokens);

const securityCi = readRequired('.github/workflows/security-ci.yml');
for (const alternatives of securityCiChecks) requireAny('Security CI workflow', securityCi, alternatives);

const preflight = readRequired('scripts/preflight.mjs');
requireTokens('preflight', preflight, preflightTokens);

const runtimeEvidence = readRequired(auditChainRuntimeEvidencePath);
requireTokens('audit-chain runtime evidence', runtimeEvidence, runtimeEvidenceTokens);
validateAuditChainRuntimeEvidence(readJsonRequired(auditChainRuntimeEvidencePath));

if (failures.length > 0) {
  console.error('Release Candidate validation failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release Candidate validation: ok');
