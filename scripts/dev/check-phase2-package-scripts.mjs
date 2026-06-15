#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts ?? {};

const expected = {
  'phase2:check': 'node scripts/dev/check-phase2-cicd-foundation.mjs',
  'phase2:strict': 'node scripts/dev/run-phase2-strict.mjs',
  'phase2:complete': 'node scripts/dev/run-phase2-complete.mjs',
  'phase2:finalize': 'node scripts/dev/run-phase2-finalize.mjs',
  'phase2:gitignore': 'node scripts/dev/ensure-phase2-gitignore.mjs',
  'phase2:ci-workflow': 'node scripts/dev/ensure-phase2-ci-workflow.mjs',
  'phase2:ci-ready': 'node scripts/dev/run-phase2-ci-ready.mjs',
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
