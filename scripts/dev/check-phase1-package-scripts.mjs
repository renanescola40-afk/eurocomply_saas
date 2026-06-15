#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts ?? {};

const expected = {
  phase1: 'node scripts/dev/run-phase1.mjs',
  'phase1:finalize': 'node scripts/dev/run-phase1-finalize.mjs',
  'phase1:strict': 'node scripts/dev/run-phase1-strict.mjs',
  'phase1:commit-plan': 'node scripts/dev/write-phase1-commit-plan.mjs',
};

const mismatches = Object.entries(expected).filter(([name, command]) => scripts[name] !== command);

if (mismatches.length > 0) {
  console.error('Phase 1 package script aliases are missing or incorrect:');
  for (const [name, command] of mismatches) {
    console.error(`- ${name}: expected "${command}", found "${scripts[name] ?? 'missing'}"`);
  }
  process.exit(1);
}

console.log('Phase 1 package script aliases passed.');
