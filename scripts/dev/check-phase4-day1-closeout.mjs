#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_DAY1_CLOSEOUT.md';
const required = [
  'npm run phase4:day1',
  'Phase 3 strict and closeout commands are referenced',
  'Phase 4 scope is defined before runtime code changes',
  'planning inventory exists',
  'Phase 4 validation commands exist',
  'no product, email, document, or UI template path is modified',
  'no local environment file, provider credential, private key, service credential, or customer data is committed',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 Day 1 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 4 Day 1 closeout guide check passed.');
