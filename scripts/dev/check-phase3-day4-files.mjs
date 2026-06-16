#!/usr/bin/env node

import { existsSync } from 'node:fs';

const requiredFiles = [
  'docs/PHASE3_COMPLETION_GATES.md',
  'docs/PHASE3_EVIDENCE_PACK.md',
  'docs/PHASE3_OWNER_ACCEPTANCE_TEMPLATE.md',
  'docs/PHASE3_TWO_COMMAND_CLOSEOUT.md',
  'docs/PHASE3_DAY4_CLOSEOUT.md',
  'scripts/dev/check-phase3-completion-gates.mjs',
  'scripts/dev/check-phase3-evidence-pack.mjs',
  'scripts/dev/check-phase3-owner-acceptance-template.mjs',
  'scripts/dev/check-phase3-two-command-closeout.mjs',
  'scripts/dev/check-phase3-day4-closeout.mjs',
];

const missing = requiredFiles.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error('Missing Phase 3 Day 4 files:');
  for (const path of missing) console.error('- ' + path);
  process.exit(1);
}

console.log('Phase 3 Day 4 file check passed.');
