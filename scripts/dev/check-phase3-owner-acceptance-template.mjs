#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_OWNER_ACCEPTANCE_TEMPLATE.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'CI result reviewed',
  'Production environment variables reviewed outside the repository',
  'Database migration plan reviewed',
  'Billing configuration reviewed',
  'No local environment file was committed',
  'No private key was committed',
  'No customer data was committed',
  'No product, email, document, or UI template change is part of this closeout',
  'Owner name:',
  'Decision:',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 owner acceptance template is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 3 owner acceptance template check passed.');
