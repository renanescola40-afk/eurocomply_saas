#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_REPOSITORY_NOTES.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'docs/PHASE3_INDEX.md',
  'docs/PHASE3_EVIDENCE_PACK.md',
  'docs/PHASE3_OWNER_ACCEPTANCE_TEMPLATE.md',
  'docs/PHASE3_TWO_COMMAND_CLOSEOUT.md',
  'No product, email, document, or UI template change is authorized by this note',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 repository notes are incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 3 repository notes check passed.');
