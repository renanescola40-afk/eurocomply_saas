#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_INVENTORY.md';
const requiredFiles = [
  'docs/PHASE5_KICKOFF.md',
  'docs/PHASE5_SCOPE.md',
  'docs/PHASE5_INVENTORY.md',
  'scripts/dev/check-phase5-kickoff.mjs',
  'scripts/dev/check-phase5-scope.mjs',
  'scripts/dev/check-phase5-inventory.mjs',
  'scripts/dev/run-phase5-checks.mjs',
];

const requiredPhrases = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'npm run phase4:review',
  'node scripts/dev/run-phase5-checks.mjs',
  'Organization-scoped compliance project workflows',
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
  console.error('Phase 5 inventory check failed.');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Phase 5 inventory check passed.');
