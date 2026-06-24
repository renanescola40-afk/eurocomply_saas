#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();

function readRequired(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required release file: ${path}`);
  }
  return readFileSync(absolutePath, 'utf8');
}

function readJsonRequired(path) {
  const raw = readRequired(path);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${error.message}`);
  }
}

function assertContains(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`${label} must contain: ${needle}`);
  }
}

function assertMatches(content, pattern, label) {
  if (!pattern.test(content)) {
    throw new Error(`${label} did not match ${pattern}`);
  }
}

function extractLine(content, label) {
  const match = content.match(new RegExp(`^- ${label}: (?<value>.+)$`, 'm'));
  return match?.groups?.value?.trim() ?? '';
}

const executionPlan = readRequired('docs/security/ENTERPRISE_RELEASE_EXECUTION_PLAN_2026_06_24.md');
const approvalRecord = readRequired('docs/RELEASE_APPROVAL_RECORD.md');
const finalReadinessReport = readRequired('docs/RELEASE_FINAL_READINESS_REPORT.md');
const goNoGoChecklist = readRequired('docs/RELEASE_GO_NO_GO_CHECKLIST.md');
const vercelRunbook = readRequired('docs/ops/VERCEL_DEPLOYMENT_RECOVERY_RUNBOOK.md');
const finalValidationRunner = readRequired('scripts/release/run-final-validation.mjs');
const day1EvidenceStatus = readJsonRequired('docs/security/evidence/runtime/day1-deployment-final-validation-status.json');

const requiredPlanSections = [
  '# EuroComply Enterprise Release Execution Plan',
  '## Exact pull request order',
  '| 1 | 1 | Deployment, final validation, owners, rollback control plane |',
  '| 2 | 2 | Supabase RLS live validation |',
  '| 3 | 3 | API hardening, BOLA/IDOR, rate limit, security CI |',
  '| 4 | 4 | Stripe, MFA/IdP, upload scanner runtime proof |',
  '| 5 | 5 | Audit-chain, observability, incident response, rollback, support communications |',
  '| 6 | 6 | E2E route health, production smoke, enterprise UX, Trust Center, privacy/GDPR |',
  '| 7 | 7 | External review package, final readiness, Go/No-Go |',
  '## Go / No-Go definition',
];

for (const section of requiredPlanSections) {
  assertContains(executionPlan, section, 'enterprise execution plan');
}

const requiredOwners = [
  'Release owner',
  'Incident owner',
  'Rollback owner',
  'Customer communication owner',
  'Support owner',
  'Security owner',
];

for (const ownerLabel of requiredOwners) {
  const owner = extractLine(approvalRecord, ownerLabel);
  if (!owner || /^tbd$/i.test(owner)) {
    throw new Error(`${ownerLabel} must be assigned to a named owner`);
  }
}

const deploymentLine = extractLine(approvalRecord, 'Deployment URL');
if (!deploymentLine) {
  throw new Error('Release approval record must include a Deployment URL line');
}

const hasCurrentDeploymentUrl = /https:\/\/[\w.-]+\.vercel\.app/i.test(deploymentLine) && !/historical|missing|failed/i.test(deploymentLine);
if (!hasCurrentDeploymentUrl) {
  assertContains(approvalRecord, '- [x] **No-Go**', 'approval record');
  assertContains(finalReadinessReport, 'Final decision: **No-Go**', 'final readiness report');
  assertContains(goNoGoChecklist, '- Build/deployment evidence is failing or missing.', 'Go/No-Go checklist');
}

assertContains(approvalRecord, '## Rollback target', 'approval record');
assertContains(approvalRecord, 'Previous known-good deployment URL candidate', 'approval record');
assertContains(approvalRecord, 'Rollback trigger criteria', 'approval record');
assertContains(approvalRecord, 'Candidate only; runtime URL was not functionally verified', 'approval record');

const p0Blockers = [
  'Supabase live RLS validation',
  'External security review or pentest',
  'Step-up MFA / IdP validation',
  'Upload scanner provider proof',
  'Stripe runtime validation',
];

for (const blocker of p0Blockers) {
  assertContains(approvalRecord, blocker, 'approval record P0 blocker table');
}

const finalValidationCommands = [
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run test:e2e',
  'npm run build',
  'npm run security:ci',
  'npm run release:readiness',
  'npm run release:enterprise-readiness',
];

for (const command of finalValidationCommands) {
  assertContains(finalValidationRunner, command, 'final validation runner');
}

assertContains(vercelRunbook, 'Historical Vercel preview URLs from older PRs or commits', 'Vercel recovery runbook');
assertContains(vercelRunbook, 'RELEASE_TARGET=enterprise node scripts/release/run-final-validation.mjs', 'Vercel recovery runbook');
assertMatches(vercelRunbook, /\/api\/health/, 'Vercel recovery runbook health check');
assertMatches(vercelRunbook, /\/api\/ready/, 'Vercel recovery runbook readiness check');

if (day1EvidenceStatus.status !== 'Open') {
  throw new Error('Day 1 evidence status must remain Open until current deployment and final validation proof exist');
}

if (day1EvidenceStatus.currentDeploymentUrl !== null || day1EvidenceStatus.currentBuildLogUrl !== null) {
  throw new Error('Day 1 evidence status must not contain deployment/build URLs until they are real current-commit evidence');
}

if (!day1EvidenceStatus.decisionImpact?.includes('No-Go')) {
  throw new Error('Day 1 evidence status must explicitly preserve No-Go impact while evidence is missing');
}

console.log('Day 1 release control-plane gate passed. Current deployment evidence is either present or explicitly blocks Go.');
