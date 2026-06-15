#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_DISCOVERY_NOTES.md';
const required = [
  'Organization-scoped compliance project workflows',
  'compliance project',
  'compliance',
  'project organization audit billing subscription',
  'search index did not return matches',
  'Phase 5 implementation should not assume route or module names yet',
  'existing application routes',
  'existing project-related modules',
  'organization or tenant context helpers',
  'audit-event helpers',
  'billing-state helpers',
  'tests covering project workflows',
  'Do not introduce runtime changes until the functional inventory names the files or modules to change',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 discovery notes are incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 5 discovery notes check passed.');
