#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const file = 'docs/PHASE12_KICKOFF.md';

if (!existsSync(file)) {
  console.error(`${file} is missing`);
  process.exit(1);
}

const content = readFileSync(file, 'utf8');
const required = ['Phase 12 Kickoff', 'evidence handoff readiness review', 'handoff review surface'];
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 12 checks failed.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 12 checks completed.');
