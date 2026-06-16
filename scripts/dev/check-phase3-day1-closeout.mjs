#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_DAY1_CLOSEOUT.md';
const required = [
  'npm run phase3:files',
  'npm run phase3:check',
  'phase3-production-readiness-report.json',
  'No template paths are modified',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 Day 1 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 3 Day 1 closeout guide check passed.');
