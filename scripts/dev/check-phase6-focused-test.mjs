#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'tests/phase6/readiness-reporting-surface.test.ts';
const required = [
  "describe('Phase 6 readiness reporting surface'",
  'docs/PHASE6_SCOPE.md',
  'docs/PHASE6_INVENTORY.md',
  'docs/PHASE6_VALIDATION_PLAN.md',
  'Read-only organization workflow readiness reporting',
  'src/server/queries/organization-dashboard.ts',
  'OrganizationWorkflowReadiness',
  'workflowReadiness',
  'getOrganizationWorkflowReadiness',
  'reporting surface remains read-only',
  'Existing dashboard consumers continue to receive the readiness signal',
  'workflowReadiness={data.workflowReadiness}',
  'workflowReadiness={workflowReadiness}',
  'buildWorkflowReadinessAction',
  'current workflow readiness',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 6 focused test is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 6 focused test check passed.');
