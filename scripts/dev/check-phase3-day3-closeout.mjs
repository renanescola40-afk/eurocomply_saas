#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_DAY3_CLOSEOUT.md';
const required = [
  'npm run phase3:day3',
  'required production secrets',
  'pre-deployment checks',
  'post-deployment smoke checks',
  'rollback triggers',
  'rollback method',
  'migration source of truth',
  'pre-migration checklist',
  'prohibited migration patterns',
  'post-migration verification',
  'database rollback caution',
  'phase3-production-readiness-report.json',
  'no template paths are modified',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 Day 3 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 3 Day 3 closeout guide check passed.');
