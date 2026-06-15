#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const gateFile = 'docs/PHASE1_EXECUTION_GATE.md';
const lockFile = 'package-lock.json';

if (!existsSync(gateFile)) {
  console.error(`${gateFile} is missing`);
  process.exit(1);
}

const gate = readFileSync(gateFile, 'utf8');
const required = [
  'npm install --package-lock-only --ignore-scripts',
  'npm ci',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'npm run lint',
  'package-lock.json',
];

const missing = required.filter((item) => !gate.includes(item));

if (missing.length > 0) {
  console.error('Phase 1 gate is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

if (!existsSync(lockFile)) {
  console.error(`${lockFile} is missing. Run npm install --package-lock-only --ignore-scripts and commit the generated lockfile.`);
  process.exit(1);
}

console.log('Phase 1 checks completed.');
