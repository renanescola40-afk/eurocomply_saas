#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_DATA_FLOW.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'User identity and session context',
  'Organization and membership context',
  'Compliance project data',
  'Generated document metadata',
  'Billing and subscription state',
  'Audit and operational events',
  'source of truth',
  'read and write paths',
  'cross-tenant boundaries',
  'audit events',
  'Avoid storing secrets or provider credentials in repository files',
  'No Phase 4 runtime implementation should proceed until data-flow assumptions are documented and checked',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 data flow plan is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 4 data flow check passed.');
