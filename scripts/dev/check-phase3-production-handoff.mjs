#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const handoffPath = 'docs/PHASE3_PRODUCTION_HANDOFF.md';
const requiredPhrases = [
  'production-complete',
  'repository-complete',
  'validated',
  'Production secrets are configured only in the deployment provider or external services',
  'Supabase production migrations are reviewed and applied in filename order',
  'Stripe live products and prices are configured',
  'Sentry production project is configured when observability is enabled',
  'No product, document, email, or UI template was modified',
];

const blockers = [];

if (!existsSync(handoffPath)) {
  blockers.push(`${handoffPath} is missing`);
} else {
  const content = readFileSync(handoffPath, 'utf8');
  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) {
      blockers.push(`${handoffPath} is missing required phrase: ${phrase}`);
    }
  }
}

if (blockers.length > 0) {
  console.error('Phase 3 production handoff check failed.');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Phase 3 production handoff check passed.');
