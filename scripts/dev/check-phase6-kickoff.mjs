#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE6_KICKOFF.md';
const required = [
  'Phase 6 starts after the Phase 5 repository-side workflow readiness implementation',
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'npm run phase4:review',
  'npm run phase5:review',
  'operationalizing organization workflow readiness',
  'safe reporting and review surfaces',
  'Add repository-side planning and validation artifacts',
  'Identify safe read-only reporting surfaces',
  'Identify tests and checkers for readiness reporting',
  'Reuse the existing organization dashboard workflow readiness signal',
  'Product template changes',
  'Email template changes',
  'Document template changes',
  'UI template changes',
  'Provider credentials, private keys, service credentials, or customer data',
  'Phase 6 kickoff is ready when this document and its checker exist',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 6 kickoff is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 6 kickoff check passed.');
