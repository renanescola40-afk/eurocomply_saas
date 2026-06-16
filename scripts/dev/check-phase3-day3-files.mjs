#!/usr/bin/env node

import { existsSync } from 'node:fs';

const requiredFiles = [
  'docs/PHASE3_DEPLOYMENT_RUNBOOK.md',
  'docs/PHASE3_DATABASE_MIGRATION_SAFETY.md',
  'docs/PHASE3_DAY3_CLOSEOUT.md',
  'scripts/dev/check-phase3-production-readiness.mjs',
  'scripts/dev/check-phase3-day3-closeout.mjs',
];

const missing = requiredFiles.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error('Missing Phase 3 Day 3 files:');
  for (const path of missing) console.error('- ' + path);
  process.exit(1);
}

console.log('Phase 3 Day 3 file check passed.');
