#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_SCOPE.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'node scripts/dev/check-phase4-kickoff.mjs',
  'Define Phase 4 implementation areas before changing runtime code',
  'Add validation scripts for Phase 4 planning artifacts',
  'Product UI changes',
  'Email template changes',
  'Document template changes',
  'UI template changes',
  'Committing local environment files',
  'provider credentials, private keys, service credentials, or customer data',
  'scope, inventory, and validation commands exist',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 scope is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 4 scope check passed.');
