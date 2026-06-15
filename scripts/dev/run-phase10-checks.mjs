#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const file = 'docs/PHASE10_KICKOFF.md';
const required = [
  'Phase 10 Kickoff',
  'Phase 10 starts after the Phase 9 repository-side readiness export preparation surface',
  'npm run phase8:verify',
  'npm run phase9:review',
  'npm run phase9:verify',
  'audit-ready package review',
  'organization readiness reporting',
  'export preparation surface',
];

if (!existsSync(file)) {
  console.error(`${file} is missing`);
  process.exit(1);
}

const content = readFileSync(file, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 10 checks failed.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 10 checks completed.');
