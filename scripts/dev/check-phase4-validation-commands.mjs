#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_VALIDATION_COMMANDS.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'npm run phase4:review',
  'Phase 4 planning checks are available through `phase4:check`',
  'Phase 4 final review and next implementation plan are available through `phase4:review`',
  'These commands validate planning artifacts only',
  'They do not prove runtime behavior or authorize product, email, document, or UI template changes',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 validation commands document is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 4 validation commands check passed.');
