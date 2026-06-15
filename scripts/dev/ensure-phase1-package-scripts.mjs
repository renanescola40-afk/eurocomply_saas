#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

pkg.scripts = {
  ...(pkg.scripts ?? {}),
  phase1: 'node scripts/dev/run-phase1.mjs',
  'phase1:finalize': 'node scripts/dev/run-phase1-finalize.mjs',
  'phase1:strict': 'node scripts/dev/run-phase1-strict.mjs',
  'phase1:commit-plan': 'node scripts/dev/write-phase1-commit-plan.mjs',
};

writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log('Phase 1 package scripts ensured.');
