#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const actual = pkg.scripts?.['phase2:finalize'];
const expected = 'node scripts/dev/run-phase2-finalize.mjs';

if (actual !== expected) {
  console.error('Phase 2 finalize alias is missing or incorrect.');
  console.error(`Expected: ${expected}`);
  console.error(`Found: ${actual ?? 'missing'}`);
  process.exit(1);
}

console.log('Phase 2 finalize alias passed.');
