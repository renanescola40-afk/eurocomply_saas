#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/PHASE3_INDEX.md',
  'docs/PHASE3_FINAL_VALIDATION_COMMANDS.md',
  'docs/PHASE3_CLOSEOUT_DECISION_RECORD.md',
  'docs/PHASE3_EXTERNAL_GATES_CHECKLIST.md',
  'docs/PHASE3_PRODUCTION_HANDOFF.md',
  'scripts/dev/check-phase3-index.mjs',
  'scripts/dev/check-phase3-final-validation-commands.mjs',
  'scripts/dev/check-phase3-closeout-decision.mjs',
  'scripts/dev/check-phase3-external-gates-checklist.mjs',
  'scripts/dev/check-phase3-production-handoff.mjs',
];

const requiredIndexPhrases = [
  'Repository evidence can prove repository-complete or validated status',
  'Production-complete status requires external gates',
];

const blockers = [];

for (const path of requiredFiles) {
  if (!existsSync(path)) blockers.push(`${path} is missing`);
}

if (existsSync('docs/PHASE3_INDEX.md')) {
  const index = readFileSync('docs/PHASE3_INDEX.md', 'utf8');
  for (const phrase of requiredIndexPhrases) {
    if (!index.includes(phrase)) blockers.push(`docs/PHASE3_INDEX.md is missing phrase: ${phrase}`);
  }
}

if (blockers.length > 0) {
  console.error('Phase 3 repository closeout check failed.');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Phase 3 repository closeout check passed.');
console.log('Repository can be considered closeout-ready after all listed Phase 3 commands pass.');
