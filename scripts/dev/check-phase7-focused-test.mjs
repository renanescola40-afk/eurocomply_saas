#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'tests/phase7/readiness-follow-up-workflow.test.ts';
const required = [
  "describe('Phase 7 readiness follow-up workflow'",
  'docs/PHASE7_SCOPE.md',
  'docs/PHASE7_INVENTORY.md',
  'docs/PHASE7_VALIDATION_PLAN.md',
  'Readiness review follow-up planning for organization dashboards',
  'src/components/dashboard/workflow-readiness-summary.tsx',
  'src/components/dashboard/next-best-actions.tsx',
  'src/components/dashboard/dashboard-home-overview.tsx',
  'Read-only reporting snapshot',
  'workflowReadiness?.reasons',
  'buildWorkflowReadinessAction',
  'current workflow readiness',
  'WorkflowReadinessSummary',
  'workflow remains safe and read-only',
  'No product, email, document, or UI template changes are required',
  'Do not commit local environment files, provider credentials, private keys, service credentials, or customer data',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 7 focused test is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 7 focused test check passed.');
