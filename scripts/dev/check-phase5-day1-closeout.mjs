#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_DAY1_CLOSEOUT.md';
const required = [
  'npm run phase5:day1',
  'Phase 3 strict and closeout commands are referenced',
  'Phase 4 planning checks and review commands are referenced',
  'Phase 5 kickoff exists',
  'Phase 5 scope exists',
  'Phase 5 inventory exists',
  'Phase 5 discovery notes exist',
  'organization-scoped compliance project workflows are the functional focus',
  'route and module names are not assumed before discovery',
  'tenant boundaries are identified before runtime changes',
  'audit events are identified before workflow changes',
  'validation expectations are identified before implementation',
  'product, email, document, and UI template changes remain out of scope',
  'secrets, provider credentials, private keys, service credentials, and customer data remain out of repository files',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 Day 1 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 5 Day 1 closeout guide check passed.');
