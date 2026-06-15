#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE6_INVENTORY.md';
const required = [
  'Read-only organization workflow readiness reporting',
  'src/server/queries/organization-dashboard.ts',
  'OrganizationWorkflowReadiness',
  'workflowReadiness',
  'getOrganizationWorkflowReadiness',
  'src/app/[locale]/dashboard/organizations/page.tsx',
  'src/components/dashboard/dashboard-home-overview.tsx',
  'src/components/dashboard/next-best-actions.tsx',
  'src/components/dashboard/workflow-readiness-summary.tsx',
  'docs/PHASE6_KICKOFF.md',
  'docs/PHASE6_SCOPE.md',
  'docs/PHASE6_INVENTORY.md',
  'docs/PHASE6_VALIDATION_PLAN.md',
  'scripts/dev/check-phase6-kickoff.mjs',
  'scripts/dev/check-phase6-scope.mjs',
  'scripts/dev/check-phase6-inventory.mjs',
  'scripts/dev/check-phase6-validation-plan.mjs',
  'scripts/dev/check-phase6-readiness-surface.mjs',
  'scripts/dev/check-phase6-focused-test.mjs',
  'scripts/dev/run-phase6-checks.mjs',
  'tests/phase6/readiness-reporting-surface.test.ts',
  'npm run phase5:review',
  'npm run phase6:review',
  'read-only dashboard summary',
  'Do not commit local environment files, provider credentials, private keys, service credentials, or customer data',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 6 inventory is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 6 inventory check passed.');
