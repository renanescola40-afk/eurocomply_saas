#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const outputPath = 'docs/security/evidence/runtime/final-validation-runner.json';
const productionFinalPath = 'docs/security/evidence/runtime/production-final-validation.json';
const enterpriseRuntimePath = 'docs/security/evidence/runtime/enterprise-runtime-evidence.json';
const releaseGoNoGoPath = 'docs/security/evidence/runtime/release-go-no-go.json';
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
const productionFinal = readJson(productionFinalPath);
const enterpriseRuntime = readJson(enterpriseRuntimePath);
const releaseGoNoGo = readJson(releaseGoNoGoPath);
const openItems = readRegisterOpenItems();
const targetCommit = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.RELEASE_COMMIT_SHA || productionFinal?.commitSha || 'local-unset';
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || productionFinal?.buildSha || targetCommit;
const requiredCommandLabels = [
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'npm run test:e2e',
  'npm run security:ci',
  'npm run security:rls:live',
  'npm run release:deployment-smoke',
  'npm run release:observability-smoke',
  'npm run release:rollback:dry-run',
  'npm run release:enterprise-runtime-evidence',
  'npm run security:p0-runtime-gap:strict',
];

function commandPassed(label) {
  return (productionFinal?.commands ?? []).some((command) => command.command === label && (command.result === 'passed' || command.passed === true));
}

const missingCommands = requiredCommandLabels.filter((label) => !commandPassed(label));
const passed = productionFinal?.status === 'Complete'
  && productionFinal?.outcome === 'passed'
  && enterpriseRuntime?.status === 'Complete'
  && enterpriseRuntime?.outcome === 'passed'
  && releaseGoNoGo?.status === 'Complete'
  && releaseGoNoGo?.finalDecision === 'Go'
  && openItems.length === 0
  && missingCommands.length === 0;

const evidence = {
  evidenceItem: 'final-validation-runner',
  id: 'final-validation-runner',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'blocked',
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY release automation',
  releaseTarget: process.env.RELEASE_TARGET || productionFinal?.releaseTarget || 'enterprise',
  targetCommit,
  commitSha: targetCommit,
  buildSha,
  redactionConfirmation: 'No secret values, tokens, cookies, URLs, DSNs or Authorization headers are captured by this evidence writer.',
  noSecretsStored: true,
  commands: requiredCommandLabels.map((command) => ({
    command,
    result: commandPassed(command) ? 'passed' : 'missing_or_not_passed',
  })),
  evidenceSources: {
    productionFinalValidation: {
      path: productionFinalPath,
      status: productionFinal?.status ?? 'missing',
      outcome: productionFinal?.outcome ?? 'missing',
    },
    enterpriseRuntimeEvidence: {
      path: enterpriseRuntimePath,
      status: enterpriseRuntime?.status ?? 'missing',
      outcome: enterpriseRuntime?.outcome ?? 'missing',
    },
    releaseGoNoGo: {
      path: releaseGoNoGoPath,
      status: releaseGoNoGo?.status ?? 'missing',
      finalDecision: releaseGoNoGo?.finalDecision ?? 'missing',
    },
  },
  register: {
    path: registerPath,
    openItems,
    allComplete: openItems.length === 0,
  },
  failures: {
    missingCommands,
    openItems,
  },
  releaseGate: passed
    ? 'Final validation runner passed for the assessed commit and enterprise target.'
    : 'Final validation runner remains blocked until production-final, enterprise-runtime and release-go-no-go evidence are Complete/passed for the same commit and target.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);

if (!passed) {
  console.error('Final validation runner evidence is Open/blocked.');
  for (const command of missingCommands) console.error(`- Missing or not passed command: ${command}`);
  for (const item of openItems) console.error(`- Open register item: ${item}`);
  process.exitCode = 1;
}
