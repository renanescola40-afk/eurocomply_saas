#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE7_KICKOFF.md';
const required = [
  'Phase 7 starts after the Phase 6 repository-side readiness reporting surface',
  'npm run phase5:review',
  'npm run phase6:review',
  'npm run phase6:verify',
  'operational review workflows',
  'read-only readiness reporting surface',
  'Add repository-side planning and validation artifacts',
  'Identify safe review workflow touchpoints around the existing readiness summary',
  'Add static checkers or tests before additional runtime changes',
  'Reuse the existing organization dashboard readiness signal',
  'Product template changes',
  'Email template changes',
  'Document template changes',
  'UI template changes',
  'Provider credentials, private keys, service credentials, or customer data',
  'Phase 7 kickoff is ready when this document and its checker exist',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 7 kickoff is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 7 kickoff check passed.');
