#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_DAY3_CLOSEOUT.md';
const required = [
  'npm run phase5:day3',
  'dashboard invariant checker exists',
  'focused dashboard invariant test exists',
  'root routing redirects to the localized entry point',
  'localized home handles authenticated users and enterprise home fallback',
  'organization dashboard redirects anonymous users to login',
  'organization dashboard redirects users without an organization to onboarding',
  'organization dashboard uses organization-scoped data loading',
  'dashboard overview receives workflow readiness data',
  'next-best-actions consume workflow readiness signals',
  'organization dashboard queries filter tasks, risks, vendors, and documents by organization id',
  'current organization resolution uses organization membership',
  'no template path is modified for Day 3 work',
];

if (!existsSync(path)) {
  console.error(path + ' is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 Day 3 closeout guide is incomplete.');
  for (const item of missing) console.error('- ' + item);
  process.exit(1);
}

console.log('Phase 5 Day 3 closeout guide check passed.');
