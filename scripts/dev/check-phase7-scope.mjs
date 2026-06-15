#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE7_SCOPE.md';
const required = [
  'Phase 7 defines the first operational review workflow around the Phase 6 readiness reporting summary',
  'npm run phase6:review',
  'npm run phase6:verify',
  'npm run phase7:check',
  'Readiness review follow-up planning for organization dashboards',
  'Map the existing readiness summary to operational follow-up needs',
  'Identify safe read-only review touchpoints in the dashboard experience',
  'Add validation artifacts before additional runtime changes',
  'Add tests or static checkers for review workflow wiring',
  'Product template changes',
  'Email template changes',
  'Document template changes',
  'UI template changes',
  'Provider credentials, private keys, service credentials, or customer data',
  'kickoff, scope, and checks are wired through `npm run phase7:check`',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 7 scope is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 7 scope check passed.');
