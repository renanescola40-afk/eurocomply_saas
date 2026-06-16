#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_DAY4_CLOSEOUT.md';
const required = [
  'npm run phase4:day4',
  'Phase 4 final review exists',
  'Phase 4 next implementation plan exists',
  'Phase 4 validation commands exist',
  'phase4:check',
  'phase4:review',
  'data-flow records are accepted',
  'access-model records are accepted',
  'operational assumptions are accepted',
  'repository checks pass locally or in CI',
  'no secrets or customer data are added to repository files',
  'template changes remain out of scope',
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
  console.error('Phase 4 Day 4 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 4 Day 4 closeout guide check passed.');
