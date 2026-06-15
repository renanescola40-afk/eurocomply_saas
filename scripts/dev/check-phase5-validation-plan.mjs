#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_VALIDATION_PLAN.md';
const required = [
  'Organization-scoped compliance project workflows',
  'src/app/page.tsx',
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/dashboard/organizations/page.tsx',
  'src/server/queries/organization-dashboard.ts',
  'src/server/queries/current-organization.ts',
  'Authenticated users are routed to the localized organization dashboard',
  'Anonymous users are routed to login where required',
  'Users without an organization are routed to onboarding',
  'Organization dashboard data is scoped through organization membership',
  'Dashboard preview queries use organization identifiers for tasks, risks, vendors, and documents',
  'Query fallbacks remain safe when optional tables or columns are missing',
  'No product, email, document, or UI template changes are required for this validation plan',
  'npm run phase3:strict',
  'npm run phase3:closeout',
  'npm run phase4:check',
  'npm run phase4:review',
  'npm run phase5:check',
  'Functional changes to the identified files should be paired with focused tests or checkers that cover routing, organization membership, and dashboard data scoping',
  'Do not commit local environment files, provider credentials, private keys, service credentials, or customer data',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 validation plan is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 5 validation plan check passed.');
