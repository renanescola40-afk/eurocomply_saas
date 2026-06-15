#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checklistPath = 'docs/PHASE3_EXTERNAL_GATES_CHECKLIST.md';
const requiredPhrases = [
  'Strict Phase 3 checks pass locally or in CI',
  'Progress status check passes locally or in CI',
  'Deployment environment is configured outside the repository',
  'Database migrations are reviewed and applied in order',
  'Billing live configuration is complete',
  'Observability production project is configured when enabled',
  'Production handoff is accepted by the production owner',
  'It does not authorize product, email, document, or UI template changes',
];

const blockers = [];

if (!existsSync(checklistPath)) {
  blockers.push(`${checklistPath} is missing`);
} else {
  const content = readFileSync(checklistPath, 'utf8');
  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) {
      blockers.push(`${checklistPath} is missing required phrase: ${phrase}`);
    }
  }
}

if (blockers.length > 0) {
  console.error('Phase 3 external gates checklist check failed.');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Phase 3 external gates checklist check passed.');
