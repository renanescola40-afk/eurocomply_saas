#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_FINAL_VALIDATION_COMMANDS.md';
const required = [
  'npm run phase3:strict',
  'check-phase3-progress-status.mjs',
  'check-phase3-scope-lock.mjs',
  'check-phase3-external-gates-checklist.mjs',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 final validation commands are incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 3 final validation commands check passed.');
