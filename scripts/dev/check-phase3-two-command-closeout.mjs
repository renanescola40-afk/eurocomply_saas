#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_TWO_COMMAND_CLOSEOUT.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'This does not mean production-complete',
  'external deployment gates',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 two command closeout guide is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 3 two command closeout check passed.');
