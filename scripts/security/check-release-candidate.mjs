#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const auditChainRuntimeEvidencePath = 'docs/security/evidence/runtime/audit-chain-live-validation.json';

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

const requiredReleaseCandidateTokens = [
  'Release Candidate Validation Runbook',
  'package-lock.json',
  'npm run supply-chain:lockfile',
  'npm ci --ignore-scripts',
  'npm-audit.json',
  'npm run security:npm-audit:json > npm-audit.json',
  'npm run security:ci',
  'npm run security:audit-chain',
  'npm run build',
  'SUPABASE_ACCESS_TOKEN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'append_audit_event_chained',
  'STEP_UP_SIGNING_SECRET',
  'REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true',
  'MALWARE_SCANNER_PROVIDER',
  'Stripe billing validation',
  'External review',
  'Security CI is green',
  'lockfile is committed',
  'npm audit is triaged',
  'Supabase RLS live validation is complete',
  'audit-chain RPC is applied and validated',
  'audit-chain runtime evidence is complete',
  'docs/security/AUDIT_CHAIN_MODEL.md',
  'docs/security/evidence/runtime/audit-chain-live-validation.json',
  'scripts/security/verify-audit-chain.mjs',
  'step-up uses a real MFA/IdP provider',
  'upload scanning uses a real provider in fail-closed mode',
  'Stripe webhooks are validated',
  'external security review is complete',
];

const packageJsonTokens = [
  'security:ci',
  'security:audit-chain',
  'security:release-candidate',
  'security:npm-audit:json',
  'supply-chain:lockfile',
  'supply-chain:floating-deps',
];

const securityCiTokens = [
  'npm run security:ci',
  'npm install --ignore-scripts',
  'STEP_UP_SIGNING_SECRET',
  'SUPABASE_ACCESS_TOKEN',
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
    if (!source.includes(token)) {
      failures.push(`${label} missing token: ${token}`);
    }
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

  if (evidence.status !== 'Complete') {
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
    if (!runtime[key]?.status) {
      failures.push(`${auditChainRuntimeEvidencePath} missing runtimeValidation.${key}.status`);
    }
  }

  const acceptance = evidence.acceptanceCriteria ?? {};
  for (const key of requiredAcceptanceCriteria) {
    if (acceptance[key] !== true) {
      failures.push(`${auditChainRuntimeEvidencePath} acceptanceCriteria.${key} must be true`);
    }
  }
}

for (const file of requiredFiles) {
  readRequired(file);
}

const runbook = readRequired('docs/RELEASE_CANDIDATE_VALIDATION.md');
requireTokens('Release Candidate runbook', runbook, requiredReleaseCandidateTokens);

const packageJson = readRequired('package.json');
requireTokens('package.json', packageJson, packageJsonTokens);

const securityCi = readRequired('.github/workflows/security-ci.yml');
requireTokens('Security CI workflow', securityCi, securityCiTokens);

const preflight = readRequired('scripts/preflight.mjs');
requireTokens('preflight', preflight, preflightTokens);

const runtimeEvidence = readRequired(auditChainRuntimeEvidencePath);
requireTokens('audit-chain runtime evidence', runtimeEvidence, runtimeEvidenceTokens);
validateAuditChainRuntimeEvidence(readJsonRequired(auditChainRuntimeEvidencePath));

if (failures.length > 0) {
  console.error('Release Candidate validation failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release Candidate validation: ok');
