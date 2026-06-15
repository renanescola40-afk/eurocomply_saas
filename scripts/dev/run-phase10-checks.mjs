#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    file: 'docs/PHASE10_KICKOFF.md',
    required: [
      'Phase 10 Kickoff',
      'Phase 10 starts after the Phase 9 repository-side readiness export preparation surface',
      'npm run phase8:verify',
      'npm run phase9:review',
      'npm run phase9:verify',
      'audit-ready package review',
      'organization readiness reporting',
      'export preparation surface',
    ],
  },
  {
    file: 'docs/PHASE10_SCOPE.md',
    required: [
      'Phase 10 Scope',
      'audit package review workflow around organization readiness reporting',
      'npm run phase9:verify',
      'npm run phase10:check',
      'Audit package review',
      'readiness export preparation to audit package review needs',
      'read-only audit review touchpoints',
      'Add validation artifacts before additional runtime changes',
      'Add tests or static checks for audit review wiring',
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
    console.error(`Phase 10 checks failed for ${file}.`);
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }
}

console.log('Phase 10 checks completed.');
