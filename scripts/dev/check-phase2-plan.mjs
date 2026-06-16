#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/PHASE2_EXECUTION_PLAN.md',
  'docs/PHASE2_DAY1_CLOSEOUT.md',
  'docs/evidence/phase2/README.md',
  'scripts/dev/capture-phase2-day1.mjs',
  'scripts/dev/check-phase2-day1-evidence.mjs',
  'scripts/dev/check-phase2-evidence-status.mjs',
  'package.json',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error('Missing required file: ' + file);
    process.exit(1);
  }
}

const pkg = readFileSync('package.json', 'utf8');
const plan = readFileSync('docs/PHASE2_EXECUTION_PLAN.md', 'utf8');

for (const script of [
  'phase2:plan',
  'phase2:day1',
  'phase2:day1:evidence',
  'phase2:day1:closeout',
  'phase2:ci',
  'phase2:evidence',
  'security:ci',
]) {
  if (!pkg.includes('"' + script + '"')) {
    console.error('Missing package script: ' + script);
    process.exit(1);
  }
}

for (const command of [
  'npm run phase2:day1:closeout',
  'npm run phase2:day1:evidence',
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'npm run security:ci',
]) {
  if (!plan.includes(command)) {
    console.error('Missing Phase 2 plan command: ' + command);
    process.exit(1);
  }
}

console.log('Phase 2 plan is wired.');
