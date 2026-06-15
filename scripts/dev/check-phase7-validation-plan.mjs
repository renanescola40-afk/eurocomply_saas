#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE7_VALIDATION_PLAN.md';
const required = [
  'Readiness review follow-up planning for organization dashboards',
  'src/components/dashboard/workflow-readiness-summary.tsx',
  'src/components/dashboard/next-best-actions.tsx',
  'src/components/dashboard/dashboard-home-overview.tsx',
  'src/server/queries/organization-dashboard.ts',
  'workflow remains based on the existing organization readiness signal',
  'workflow remains safe and read-only',
  'readiness summary continues to expose review signals',
  'Follow-up actions continue to derive from current workflow readiness',
  'No product, email, document, or UI template changes are required',
  'npm run phase6:verify',
  'npm run phase7:check',
  'npm run test',
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
  console.error('Phase 7 validation plan is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 7 validation plan check passed.');
