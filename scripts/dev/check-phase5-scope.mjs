#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_SCOPE.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'npm run phase4:review',
  'node scripts/dev/check-phase5-kickoff.mjs',
  'organization-scoped compliance project workflows',
  'Identify existing routes and modules related to compliance projects',
  'Identify required validation before runtime changes',
  'Identify tenant boundaries for project workflows',
  'Identify audit events for project workflow actions',
  'Product UI template changes',
  'Email template changes',
  'Document template changes',
  'UI template changes',
  'Provider credentials, private keys, service credentials, or customer data',
  'kickoff, scope, inventory, and validation commands exist',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 scope is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 5 scope check passed.');
