#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_DAY2_CLOSEOUT.md';
const required = [
  'npm run phase4:day2',
  'user identity and session data flow',
  'organization and membership data flow',
  'compliance project data flow',
  'generated document metadata flow',
  'billing and subscription state flow',
  'audit and operational event flow',
  'source-of-truth assumptions',
  'read and write paths',
  'cross-tenant boundaries',
  'user account access',
  'organization membership access',
  'compliance project access',
  'generated document access',
  'billing administration access',
  'audit log visibility',
  'no product, email, document, or UI template path is modified',
  'no local environment file, provider credential, private key, service credential, or customer data is committed',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 Day 2 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 4 Day 2 closeout guide check passed.');
