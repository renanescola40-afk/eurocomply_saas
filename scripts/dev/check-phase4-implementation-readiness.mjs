#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_IMPLEMENTATION_READINESS.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'docs/PHASE4_SCOPE.md',
  'docs/PHASE4_INVENTORY.md',
  'docs/PHASE4_DATA_FLOW.md',
  'docs/PHASE4_ACCESS_MODEL.md',
  'docs/PHASE4_OPERATIONAL_ASSUMPTIONS.md',
  'data flow, access model, and operational assumptions are documented and checked',
  'Do not commit local environment files, provider credentials, private keys, service credentials, or customer data',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 implementation readiness record is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 4 implementation readiness check passed.');
