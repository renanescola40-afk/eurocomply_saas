#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_DAY3_CLOSEOUT.md';
const required = [
  'npm run phase4:day3',
  'runtime environment ownership',
  'verification command or dashboard',
  'manual approval requirements',
  'implementation readiness',
  'no product, email, document, or UI template path is modified',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 Day 3 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 4 Day 3 closeout guide check passed.');
