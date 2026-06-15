#!/usr/bin/env node

import { existsSync } from 'node:fs';

const requiredFiles = [
  'docs/PHASE2_CICD_FOUNDATION.md',
  '.github/workflows/ci.yml',
  'scripts/dev/check-phase2-cicd-foundation.mjs',
  'scripts/dev/check-phase2-commit-plan.mjs',
  'scripts/dev/check-phase2-docs.mjs',
  'scripts/dev/check-phase2-gitignore.mjs',
  'scripts/dev/check-phase2-package-scripts.mjs',
  'scripts/dev/ensure-phase2-ci-workflow.mjs',
  'scripts/dev/ensure-phase2-gitignore.mjs',
  'scripts/dev/run-phase2-ci-ready.mjs',
  'scripts/dev/run-phase2-complete.mjs',
  'scripts/dev/run-phase2-finalize.mjs',
  'scripts/dev/run-phase2-strict.mjs',
  'scripts/dev/write-phase2-commit-plan.mjs',
  'scripts/dev/write-phase2-final-report.mjs',
];

const missing = requiredFiles.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error('Missing Phase 2 foundation files:');
  for (const path of missing) {
    console.error(`- ${path}`);
  }
  process.exit(1);
}

console.log('Phase 2 file inventory passed.');
