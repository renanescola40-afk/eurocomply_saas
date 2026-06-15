#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_REPOSITORY_CLOSURE_CHECKLIST.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'docs/PHASE3_INDEX.md',
  'docs/PHASE3_EVIDENCE_PACK.md',
  'docs/PHASE3_OWNER_ACCEPTANCE_TEMPLATE.md',
  'docs/PHASE3_REPOSITORY_NOTES.md',
  'docs/PHASE3_CLOSEOUT_COMMANDS_ALIAS.md',
  'No product, email, document, or UI template change is authorized by this checklist',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 final review checklist is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 3 final review checklist check passed.');
