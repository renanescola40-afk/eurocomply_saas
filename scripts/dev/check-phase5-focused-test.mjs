#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'tests/phase5/dashboard-invariants.test.ts';
const required = [
  "describe('Phase 5 dashboard invariants'",
  'src/app/page.tsx',
  "'/pt'",
  'src/app/[locale]/page.tsx',
  'dashboard/organizations',
  'src/app/[locale]/dashboard/organizations/page.tsx',
  'getLoginPath(safeLocale, dashboardPath)',
  'redirect(`/${safeLocale}/onboarding',
  'src/server/queries/organization-dashboard.ts',
  "eq('organization_id', organizationId)",
  "from('compliance_tasks')",
  "from('risks')",
  "from('vendors')",
  "from('documents')",
  'src/server/queries/current-organization.ts',
  "from('organization_members')",
  "eq('user_id', userId)",
  'membership.slug === slug',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 focused dashboard invariant test is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 5 focused dashboard invariant test check passed.');
