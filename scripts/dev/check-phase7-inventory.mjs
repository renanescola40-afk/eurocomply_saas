#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE7_INVENTORY.md';
const required = [
  'Readiness review follow-up planning for organization dashboards',
  'src/components/dashboard/workflow-readiness-summary.tsx',
  'src/components/dashboard/dashboard-home-overview.tsx',
  'src/components/dashboard/next-best-actions.tsx',
  'src/server/queries/organization-dashboard.ts',
  'Read-only readiness snapshot',
  'Readiness reasons displayed as signals',
  'Recommended follow-up actions derived from current workflow readiness',
  'Organization dashboard route passing `workflowReadiness` through the consumer chain',
  'docs/PHASE7_KICKOFF.md',
  'docs/PHASE7_SCOPE.md',
  'docs/PHASE7_INVENTORY.md',
  'scripts/dev/check-phase7-kickoff.mjs',
  'scripts/dev/check-phase7-scope.mjs',
  'scripts/dev/check-phase7-inventory.mjs',
  'scripts/dev/run-phase7-checks.mjs',
  'npm run phase6:verify',
  'npm run phase7:check',
  'does not introduce new runtime behavior by itself',
  'Do not commit local environment files, provider credentials, private keys, service credentials, or customer data',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 7 inventory is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 7 inventory check passed.');
