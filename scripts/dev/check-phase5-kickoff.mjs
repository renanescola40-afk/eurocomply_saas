#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_KICKOFF.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'npm run phase4:review',
  'Phase 5 is the first functional implementation phase after Phase 4 planning',
  'This kickoff does not authorize product, email, document, or UI template changes by itself',
  'organization-scoped compliance project workflows',
  'Confirm data-flow assumptions',
  'Confirm access-model assumptions',
  'Confirm operational assumptions',
  'Confirm no secrets or customer data are added to repository files',
  'Add focused validation before introducing functional changes',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 kickoff is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 5 kickoff check passed.');
