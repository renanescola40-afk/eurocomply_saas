#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts ?? {};

const expected = {
  'phase2:check': 'node scripts/dev/check-phase2-cicd-foundation.mjs',
};

const mismatches = Object.entries(expected).filter(([name, command]) => scripts[name] !== command);

if (mismatches.length > 0) {
  console.error('Phase 2 package script aliases are missing or incorrect:');
  for (const [name, command] of mismatches) {
    console.error(`- ${name}: expected "${command}", found "${scripts[name] ?? 'missing'}"`);
  }
  process.exit(1);
}

console.log('Phase 2 package script aliases passed.');
