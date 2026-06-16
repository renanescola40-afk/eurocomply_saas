#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE3_DAY2_CLOSEOUT.md';
const required = [
  'npm run phase3:day2',
  'runtime security headers',
  'production CSP posture',
  'Sentry runtime wiring',
  'protected route posture',
  'tenant isolation posture',
  'phase3-runtime-readiness-report.json',
  'phase3-auth-session-readiness-report.json',
  'no template paths are modified',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 3 Day 2 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 3 Day 2 closeout guide check passed.');
