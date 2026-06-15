#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_CLOSEOUT_DECISION_RECORD.md';
const required = [
  'repository-complete',
  'validated',
  'production-complete',
  'Do not mark Phase 3 as production-complete from repository evidence alone',
  'npm run phase3:strict',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 closeout decision record is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 3 closeout decision check passed.');
