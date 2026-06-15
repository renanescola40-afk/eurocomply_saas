#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_KICKOFF.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'Define Phase 4 scope before code changes',
  'Preserve Phase 3 production readiness artifacts',
  'Avoid committing local environment files or provider credentials',
  'It does not authorize product, email, document, or UI template changes',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 kickoff is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 4 kickoff check passed.');
