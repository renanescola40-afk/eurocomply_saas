#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_INVENTORY.md';
const requiredFiles = [
  'docs/PHASE4_KICKOFF.md',
  'docs/PHASE4_SCOPE.md',
  'docs/PHASE4_INVENTORY.md',
  'docs/PHASE4_DATA_FLOW.md',
  'scripts/dev/check-phase4-kickoff.mjs',
  'scripts/dev/check-phase4-scope.mjs',
  'scripts/dev/check-phase4-inventory.mjs',
  'scripts/dev/check-phase4-data-flow.mjs',
  'scripts/dev/run-phase4-checks.mjs',
];

const requiredPhrases = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'docs/PHASE4_DATA_FLOW.md',
  'scripts/dev/check-phase4-data-flow.mjs',
  'No product, email, document, or UI template change is authorized by this inventory',
];

const blockers = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) blockers.push(`${file} is missing`);
}

if (!existsSync(path)) {
  blockers.push(`${path} is missing`);
} else {
  const content = readFileSync(path, 'utf8');
  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) blockers.push(`${path} is missing required phrase: ${phrase}`);
  }
}

if (blockers.length > 0) {
  console.error('Phase 4 inventory check failed.');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Phase 4 inventory check passed.');
