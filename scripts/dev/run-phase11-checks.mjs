#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const file = 'docs/PHASE11_KICKOFF.md';
const required = [
  'Phase 11 Kickoff',
  'Phase 11 starts after the Phase 10 repository-side audit package review surface',
  'npm run phase9:verify',
  'npm run phase10:review',
  'npm run phase10:verify',
  'evidence handoff review',
  'organization readiness reporting',
  'audit review surface',
];

if (!existsSync(file)) {
  console.error(`${file} is missing`);
  process.exit(1);
}

const content = readFileSync(file, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 11 checks failed.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 11 checks completed.');
