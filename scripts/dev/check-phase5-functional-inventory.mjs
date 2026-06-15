#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_FUNCTIONAL_INVENTORY.md';
const required = [
  'Organization-scoped compliance project workflows',
  'Initial concrete files have been identified through direct file inspection',
  'src/app/page.tsx',
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/dashboard/organizations/page.tsx',
  'src/server/queries/organization-dashboard.ts',
  'src/server/queries/current-organization.ts',
  'organization_members',
  'compliance_tasks',
  'risks',
  'vendors',
  'documents',
  'billing entitlements',
  'Review organization dashboard route behavior',
  'Review organization membership resolution',
  'Review project workflow terminology before introducing new route names',
  'Name the tests to add or update',
  'Confirm no product, email, document, or UI template changes are required',
  'Functional work should proceed only after the identified files have matching validation steps',
  'Do not commit local environment files, provider credentials, private keys, service credentials, or customer data',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 functional inventory is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 5 functional inventory check passed.');
