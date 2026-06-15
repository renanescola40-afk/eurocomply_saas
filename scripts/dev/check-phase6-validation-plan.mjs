#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE6_VALIDATION_PLAN.md';
const required = [
  'Read-only organization workflow readiness reporting',
  'OrganizationWorkflowReadiness',
  'workflowReadiness',
  'getOrganizationWorkflowReadiness',
  'source signal remains derived from organization dashboard data',
  'reporting surface remains read-only',
  'Existing dashboard consumers continue to receive the readiness signal',
  'Tests or static checkers cover readiness reporting before runtime changes',
  'No product, email, document, or UI template changes are required',
  'npm run phase5:review',
  'npm run phase6:check',
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
  console.error('Phase 6 validation plan is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 6 validation plan check passed.');
