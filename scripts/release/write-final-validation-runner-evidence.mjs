#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const outputPath = 'docs/security/evidence/runtime/final-validation-runner.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readRegisterOpenItems() {
  if (!existsSync(registerPath)) return ['P0 runtime evidence register missing'];
  const source = readFileSync(registerPath, 'utf8');
  return source
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter(([item, status]) => item && item !== 'Evidence item' && status !== 'Complete')
    .map(([item, status]) => `${item}: ${status}`);
}

const generatedAt = new Date().toISOString();
const targetCommit = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.RELEASE_COMMIT_SHA || 'local-unset';
const enterpriseRunnerExitCode = Number.parseInt(process.env.FINAL_VALIDATION_ENTERPRISE_READINESS_EXIT_CODE ?? '1', 10);
const localRunnerExitCode = Number.parseInt(process.env.FINAL_VALIDATION_LOCAL_RUNNER_EXIT_CODE ?? `${enterpriseRunnerExitCode}`, 10);
const openItems = readRegisterOpenItems();
const p0Gap = readJson('docs/security/evidence/runtime/p0-runtime-gap-report.json');
const authRbac = readJson('docs/security/evidence/runtime/auth-rbac-final-validation.json');

const passed = enterpriseRunnerExitCode === 0 && localRunnerExitCode === 0 && openItems.length === 0;

const evidence = {
  evidenceItem: 'final-validation-runner',
  id: 'final-validation-runner',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'blocked',
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY release automation',
  targetCommit,
  redactionConfirmation: 'No secret values are captured by this evidence writer.',
  commands: [
    {
      command: 'node scripts/release/run-local-enterprise-readiness.mjs',
      result: localRunnerExitCode === 0 ? 'passed' : 'blocked_or_not_run',
      exitCode: localRunnerExitCode,
    },
    {
      command: 'npm run release:enterprise-readiness',
      result: enterpriseRunnerExitCode === 0 ? 'passed' : 'blocked_or_not_run',
      exitCode: enterpriseRunnerExitCode,
    },
  ],
  register: {
    path: registerPath,
    openItems,
    allComplete: openItems.length === 0,
  },
  blockingEvidenceSnapshot: {
    authRbacFinalValidation: authRbac
      ? {
          status: authRbac.status ?? null,
          outcome: authRbac.outcome ?? null,
          releaseDecision: authRbac.releaseDecision ?? null,
          runtimeEvidenceStatus: authRbac.runtimeEvidenceStatus ?? null,
          placeholderOnly: authRbac.evidenceIntegrity?.placeholderOnly ?? null,
          realRuntimeEvidenceAttached: authRbac.evidenceIntegrity?.realRuntimeEvidenceAttached ?? null,
        }
      : null,
    p0RuntimeGapReport: p0Gap
      ? {
          status: p0Gap.status ?? null,
          outcome: p0Gap.outcome ?? null,
        }
      : null,
  },
  releaseGate: passed
    ? 'Final validation runner passed for the assessed commit.'
    : 'Final validation runner remains blocked until all P0 runtime evidence is Complete and enterprise readiness exits 0.',
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);

if (!passed) {
  console.error('Final validation runner evidence is Open/blocked. Remaining open items:');
  for (const item of openItems) console.error(`- ${item}`);
  process.exitCode = 1;
}
