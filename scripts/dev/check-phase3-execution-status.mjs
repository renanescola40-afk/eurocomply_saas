#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_EXECUTION_STATUS.md';
const required = [
  'Repository-complete',
  'Production-validated',
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'production smoke test result',
  'RLS validation status',
  'owner approval record',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 execution status boundary is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 3 execution status boundary check passed.');
