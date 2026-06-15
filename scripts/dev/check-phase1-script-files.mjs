#!/usr/bin/env node

import { existsSync } from 'node:fs';

const requiredScripts = [
  'scripts/dev/check-phase1-gitignore.mjs',
  'scripts/dev/check-node-runtime.mjs',
  'scripts/dev/check-package-manager.mjs',
  'scripts/dev/ensure-phase1-package-scripts.mjs',
  'scripts/dev/check-phase1-package-scripts.mjs',
  'scripts/dev/pin-known-latest-deps.mjs',
  'scripts/dev/check-build-prereqs.mjs',
  'scripts/dev/check-lockfile-commit-ready.mjs',
  'scripts/dev/write-dependency-pin-report.mjs',
  'scripts/dev/write-phase1-status.mjs',
  'scripts/dev/check-local-foundation.mjs',
  'scripts/dev/run-quality-report.mjs',
  'scripts/dev/write-phase1-commit-plan.mjs',
  'scripts/dev/check-phase1-commit-plan.mjs',
  'scripts/dev/write-phase1-final-report.mjs',
  'scripts/dev/run-phase1.mjs',
  'scripts/dev/run-phase1-finalize.mjs',
  'scripts/dev/run-phase1-strict.mjs',
];

const missing = requiredScripts.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error('Missing Phase 1 script files:');
  for (const path of missing) {
    console.error(`- ${path}`);
  }
  process.exit(1);
}

console.log('Phase 1 script file inventory passed.');
