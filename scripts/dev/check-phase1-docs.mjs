#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'docs/PHASE1_EXECUTION_CHECKLIST.md',
    requiredText: [
      'npm run phase1:strict',
      'phase1-final-report.txt',
      'phase1-commit-plan.json',
      'Every Phase 1 script file exists',
      'Phase 1 npm aliases exist in `package.json` and pass validation',
    ],
  },
  {
    file: 'docs/PHASE1_LOCAL_FOUNDATION.md',
    requiredText: [
      'node scripts/dev/run-phase1-strict.mjs',
      'npm run phase1:strict',
      'phase1-final-report.txt',
      'phase1-commit-plan.json',
      'Phase 1 npm aliases exist and pass validation',
    ],
  },
];

const failures = [];

for (const check of checks) {
  const content = readFileSync(check.file, 'utf8');
  for (const text of check.requiredText) {
    if (!content.includes(text)) {
      failures.push(`${check.file}: missing "${text}"`);
    }
  }
}

if (failures.length > 0) {
  console.error('Phase 1 documentation check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Phase 1 documentation check passed.');
