#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_OPERATIONAL_ASSUMPTIONS.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'Runtime environment ownership',
  'Required environment variables',
  'Scheduled job ownership',
  'Health check ownership',
  'Error monitoring ownership',
  'Billing provider ownership',
  'Database migration ownership',
  'Rollback ownership',
  'Identify owner for each operational area',
  'Identify expected verification command or dashboard for each area',
  'Identify manual approval requirements before runtime changes',
  'Avoid storing secrets or provider credentials in repository files',
  'No Phase 4 runtime implementation should proceed until operational assumptions are documented and checked',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 operational assumptions plan is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 4 operational assumptions check passed.');
