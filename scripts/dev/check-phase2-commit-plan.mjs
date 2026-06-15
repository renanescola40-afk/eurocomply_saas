#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const planPath = 'phase2-commit-plan.json';
const requiredFiles = [
  '.github/workflows/ci.yml',
  'docs/PHASE2_CICD_FOUNDATION.md',
  'scripts/dev/check-phase2-cicd-foundation.mjs',
  'scripts/dev/check-phase2-docs.mjs',
  'scripts/dev/check-phase2-gitignore.mjs',
  'scripts/dev/check-phase2-package-scripts.mjs',
  'scripts/dev/check-phase2-script-files.mjs',
  'scripts/dev/ensure-phase2-gitignore.mjs',
  'scripts/dev/run-phase2-complete.mjs',
  'scripts/dev/run-phase2-strict.mjs',
  'scripts/dev/write-phase2-commit-plan.mjs',
  'scripts/dev/write-phase2-final-report.mjs',
];

if (!existsSync(planPath)) {
  console.error(`Missing ${planPath}`);
  process.exit(1);
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const filesToCommit = new Set(plan.filesToCommit ?? []);
const missingFiles = requiredFiles.filter((file) => !filesToCommit.has(file));
const blockers = plan.blockers ?? [];

if (!plan.readyToCommit || blockers.length > 0 || missingFiles.length > 0) {
  console.error('Phase 2 commit plan is not ready.');

  if (!plan.readyToCommit) {
    console.error('- readyToCommit is false');
  }

  for (const blocker of blockers) {
    console.error(`- blocker: ${blocker}`);
  }

  for (const file of missingFiles) {
    console.error(`- filesToCommit missing: ${file}`);
  }

  process.exit(1);
}

console.log('Phase 2 commit plan check passed.');
