#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const file = 'docs/PHASE9_KICKOFF.md';
const required = [
  'Phase 9 Kickoff',
  'Phase 9 starts after the Phase 8 repository-side executive reporting package surface',
  'npm run phase7:verify',
  'npm run phase8:review',
  'npm run phase8:verify',
  'board-ready export preparation',
  'organization readiness reporting',
  'executive reporting package',
];

if (!existsSync(file)) {
  console.error(`${file} is missing`);
  process.exit(1);
}

const content = readFileSync(file, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 9 checks failed.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 9 checks completed.');
