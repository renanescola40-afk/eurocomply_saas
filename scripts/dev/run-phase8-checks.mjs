#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    file: 'docs/PHASE8_KICKOFF.md',
    required: [
      'Phase 8 Kickoff',
      'Phase 8 starts after the Phase 7 repository-side readiness follow-up workflow',
      'npm run phase6:verify',
      'npm run phase7:review',
      'npm run phase7:verify',
      'executive reporting package preparation',
      'readiness summary and follow-up plan',
    ],
  },
  {
    file: 'docs/PHASE8_SCOPE.md',
    required: [
      'Phase 8 Scope',
      'Executive readiness reporting package preparation',
      'npm run phase7:verify',
      'npm run phase8:check',
      'readiness summary and follow-up plan to executive reporting needs',
      'read-only reporting package touchpoints',
      'Add validation artifacts before additional runtime changes',
      'Add tests or static checkers for reporting package wiring',
    ],
  },
];

for (const { file, required } of checks) {
  if (!existsSync(file)) {
    console.error(`${file} is missing`);
    process.exit(1);
  }

  const content = readFileSync(file, 'utf8');
  const missing = required.filter((item) => !content.includes(item));

  if (missing.length > 0) {
    console.error(`Phase 8 checks failed for ${file}.`);
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }
}

console.log('Phase 8 checks completed.');
