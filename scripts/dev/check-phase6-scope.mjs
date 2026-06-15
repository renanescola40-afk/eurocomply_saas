#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE6_SCOPE.md';
const required = [
  'Phase 6 defines the next repository-side increment after the Phase 5 workflow readiness implementation',
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'npm run phase4:review',
  'npm run phase5:review',
  'npm run phase6:check',
  'Read-only organization workflow readiness reporting',
  'Map the existing organization dashboard readiness signal to reporting needs',
  'Identify read-only routes or components that can display readiness status',
  'Add validation artifacts for readiness reporting',
  'Add tests or static checkers before runtime changes',
  'Product template changes',
  'Email template changes',
  'Document template changes',
  'UI template changes',
  'Provider credentials, private keys, service credentials, or customer data',
  'kickoff, scope, and checks are wired through `npm run phase6:check`',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 6 scope is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 6 scope check passed.');
