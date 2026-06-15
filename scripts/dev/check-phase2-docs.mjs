#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const file = 'docs/PHASE2_CICD_FOUNDATION.md';
const content = readFileSync(file, 'utf8');

const requiredText = [
  'node scripts/dev/run-phase2-strict.mjs',
  'node scripts/dev/run-phase2-finalize.mjs',
  'npm run phase2:strict',
  'npm run phase2:complete',
  'npm run phase2:finalize',
  'npm run phase2:check',
  'npm run phase2:gitignore',
  'ensure-phase2-ci-workflow',
  'check-phase2-script-files',
  'ensure-phase2-gitignore',
  'check-phase2-gitignore',
  'check-phase2-package-scripts',
  'check-phase2-cicd-foundation',
  'write-phase2-final-report',
  'write-phase2-commit-plan',
  'check-phase2-commit-plan',
  'phase2-cicd-report.json',
  'phase2-final-report.txt',
  'phase2-commit-plan.json',
  'npm ci',
  'npm install',
  'Node.js 20',
];

const missing = requiredText.filter((text) => !content.includes(text));

if (missing.length > 0) {
  console.error('Phase 2 documentation check failed:');
  for (const text of missing) {
    console.error(`- ${file}: missing "${text}"`);
  }
  process.exit(1);
}

console.log('Phase 2 documentation check passed.');
