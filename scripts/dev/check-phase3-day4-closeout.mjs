#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_DAY4_CLOSEOUT.md';
const required = [
  'npm run phase3:day4',
  'completion gates documentation',
  'strict runner gates',
  'evidence pack readiness',
  'owner acceptance template',
  'two-command closeout path',
  'phase3-completion-gates-report.json',
  'docs/PHASE3_EVIDENCE_PACK.md',
  'docs/PHASE3_OWNER_ACCEPTANCE_TEMPLATE.md',
  'docs/PHASE3_TWO_COMMAND_CLOSEOUT.md',
  'no template paths are modified',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 Day 4 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 3 Day 4 closeout guide check passed.');
