#!/usr/bin/env node

import { existsSync } from 'node:fs';

const requiredFiles = [
  'docs/PHASE3_PRODUCTION_READINESS.md',
  'scripts/dev/check-phase3-production-readiness.mjs',
  'scripts/dev/check-phase3-script-files.mjs',
  'scripts/dev/run-phase3-strict.mjs',
];

const missing = requiredFiles.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error('Missing Phase 3 foundation files:');
  for (const path of missing) {
    console.error(`- ${path}`);
  }
  process.exit(1);
}

console.log('Phase 3 file inventory passed.');
