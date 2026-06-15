#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE4_NEXT_IMPLEMENTATION_PLAN.md';
const required = [
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'node scripts/dev/check-phase4-final-review.mjs',
  'data-flow records are accepted',
  'access-model records are accepted',
  'operational assumptions are accepted',
  'repository checks pass locally or in CI',
  'no secrets or customer data are added to repository files',
  'Organization-scoped compliance project workflows',
  'Audit-event coverage for privileged actions',
  'Read-only operational dashboards or reports',
  'Billing-state display backed by existing provider state',
  'Do not begin implementation work that changes product, email, document, or UI templates unless a later scope record explicitly allows it',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 4 next implementation plan is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 4 next implementation plan check passed.');
