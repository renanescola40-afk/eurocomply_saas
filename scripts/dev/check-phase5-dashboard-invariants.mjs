#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const files = {
  root: 'src/app/page.tsx',
  localeHome: 'src/app/[locale]/page.tsx',
  orgDashboard: 'src/app/[locale]/dashboard/organizations/page.tsx',
  orgDashboardQuery: 'src/server/queries/organization-dashboard.ts',
  currentOrganization: 'src/server/queries/current-organization.ts',
};

const expectations = [
  [files.root, ['redirect', "'/pt'"]],
  [files.localeHome, ['getCurrentUser', 'dashboard/organizations', 'EnterpriseHome']],
  [files.orgDashboard, ['getCurrentUser', 'redirect(`/${safeLocale}/login`)', 'getOrganizationDashboardData', 'redirect(`/${safeLocale}/onboarding']],
  [files.orgDashboardQuery, ['getCurrentOrganizationForUser', 'organization.id', "eq('organization_id', organizationId)", "from('compliance_tasks')", "from('risks')", "from('vendors')", "from('documents')"]],
  [files.currentOrganization, ["from('organization_members')", "eq('user_id', userId)", 'getCurrentOrganizationForUser', 'membership.slug === slug']],
];

const failures = [];

for (const [file, required] of expectations) {
  if (!existsSync(file)) {
    failures.push(`${file} is missing`);
    continue;
  }

  const content = readFileSync(file, 'utf8');
  for (const phrase of required) {
    if (!content.includes(phrase)) {
      failures.push(`${file} is missing required invariant: ${phrase}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Phase 5 dashboard invariant check failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 5 dashboard invariant check passed.');
