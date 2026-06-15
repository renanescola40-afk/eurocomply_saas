#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const scopeLockPath = 'docs/PHASE3_SCOPE_LOCK.md';
const requiredPhrases = [
  'Allowed files',
  'Forbidden files',
  'Phase 3 repository work is complete when all repository checks pass',
  'Phase 3 production work is complete only after external gates are confirmed',
  'Do not modify template',
  'package.json` only for Phase 3 validation aliases',
];

const blockers = [];

if (!existsSync(scopeLockPath)) {
  blockers.push(`${scopeLockPath} is missing`);
} else {
  const content = readFileSync(scopeLockPath, 'utf8');
  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) {
      blockers.push(`${scopeLockPath} is missing required phrase: ${phrase}`);
    }
  }
}

if (blockers.length > 0) {
  console.error('Phase 3 scope lock check failed.');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Phase 3 scope lock check passed.');
