#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/RELEASE_CANDIDATE_VALIDATION.md',
  'docs/security/LOCKFILE_TRIAGE_RUNBOOK.md',
  'docs/security/RLS_LIVE_VALIDATION_RUNBOOK.md',
  'docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md',
  'docs/security/AUDIT_CHAIN_MODEL.md',
  'docs/security/evidence/runtime/audit-chain-live-validation.json',
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
  'security:npm-audit:summary',
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

const runtimeEvidence = readRequired('docs/security/evidence/runtime/audit-chain-live-validation.json');
requireTokens('audit-chain runtime evidence', runtimeEvidence, runtimeEvidenceTokens);

if (failures.length > 0) {
  console.error('Release Candidate validation failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release Candidate validation: ok');
