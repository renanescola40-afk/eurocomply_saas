#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/RELEASE_CANDIDATE_VALIDATION.md',
  'docs/security/LOCKFILE_TRIAGE_RUNBOOK.md',
  'docs/security/RLS_LIVE_VALIDATION_RUNBOOK.md',
  'docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md',
  'docs/security/UPLOAD_CONTENT_SCAN.md',
  'docs/security/STEP_UP_ROLLOUT_MATRIX.md',
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
  'npm run build',
  'SUPABASE_ACCESS_TOKEN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
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
  'step-up uses a real MFA/IdP provider',
  'upload scanning uses a real provider in fail-closed mode',
  'Stripe webhooks are validated',
  'external security review is complete',
];

const packageJsonTokens = [
  'security:ci',
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

const failures = [];

function readRequired(path) {
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${path}`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

for (const file of requiredFiles) {
  readRequired(file);
}

const runbook = readRequired('docs/RELEASE_CANDIDATE_VALIDATION.md');
for (const token of requiredReleaseCandidateTokens) {
  if (!runbook.includes(token)) {
    failures.push(`Release Candidate runbook missing token: ${token}`);
  }
}

const packageJson = readRequired('package.json');
for (const token of packageJsonTokens) {
  if (!packageJson.includes(token)) {
    failures.push(`package.json missing Release Candidate token: ${token}`);
  }
}

const securityCi = readRequired('.github/workflows/security-ci.yml');
for (const token of securityCiTokens) {
  if (!securityCi.includes(token)) {
    failures.push(`Security CI workflow missing Release Candidate token: ${token}`);
  }
}

if (failures.length > 0) {
  console.error('Release Candidate validation failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release Candidate validation: ok');
