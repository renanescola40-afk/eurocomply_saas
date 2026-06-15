#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_EVIDENCE_PACK.md';
const required = [
  'docs/PHASE3_PRODUCTION_READINESS.md',
  'docs/PHASE3_PRODUCTION_HANDOFF.md',
  'docs/PHASE3_INDEX.md',
  'docs/PHASE3_TWO_COMMAND_CLOSEOUT.md',
  'scripts/dev/run-phase3-strict.mjs',
  'scripts/dev/run-phase3-closeout.mjs',
  'scripts/dev/check-phase3-repository-closeout.mjs',
  '.github/workflows/ci.yml',
  'repository-complete or validated status',
  'It cannot alone prove production-complete status',
  'npm run phase3:strict',
  'npm run phase3:closeout',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 evidence pack is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 3 evidence pack check passed.');
