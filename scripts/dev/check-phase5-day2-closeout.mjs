#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_DAY2_CLOSEOUT.md';
const required = [
  'npm run phase5:day2',
  'functional inventory exists',
  'validation plan exists',
  'concrete files have been identified through direct file inspection',
  'routing files are named before functional changes',
  'organization dashboard query files are named before functional changes',
  'organization membership resolution is part of the validation plan',
  'dashboard data scoping is part of the validation plan',
  'onboarding and anonymous-user routing are part of the validation plan',
  'query fallbacks remain safe when optional schema objects are missing',
  'focused tests or checkers are named before implementation',
  'product, email, document, and UI template changes remain out of scope',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 Day 2 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 5 Day 2 closeout guide check passed.');
