#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_INDEX.md';
const required = [
  'docs/PHASE3_PRODUCTION_READINESS.md',
  'docs/PHASE3_PRODUCTION_HANDOFF.md',
  'docs/PHASE3_CLOSEOUT_DECISION_RECORD.md',
  'scripts/dev/run-phase3-strict.mjs',
  'scripts/dev/check-phase3-closeout-decision.mjs',
  'npm run phase3:strict',
  'Production-complete status requires external gates',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 index is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 3 index check passed.');
