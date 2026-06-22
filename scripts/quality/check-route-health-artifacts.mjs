#!/usr/bin/env node

import { existsSync } from 'node:fs';

const required = [
  'docs/quality/ROUTE_INVENTORY.md',
  'docs/quality/ROUTE_HEALTH_REPORT.md',
  'tests/e2e/route-health.spec.ts',
  'src/app/[locale]/dashboard/page.tsx',
  'src/app/[locale]/dashboard/organizations/page.tsx',
  'src/app/[locale]/dashboard/organizations/documents/page.tsx',
  'src/app/[locale]/vendor-assurance/page.tsx',
  'src/app/[locale]/dashboard/organizations/risks/page.tsx',
  'src/app/[locale]/aprovacoes/page.tsx',
  'src/app/[locale]/dashboard/tasks/page.tsx',
  'src/app/[locale]/dashboard/organizations/reports-governance/page.tsx',
  'src/app/[locale]/auditoria/page.tsx',
  'src/app/[locale]/settings/page.tsx',
  'src/app/[locale]/billing/page.tsx',
  'src/app/[locale]/trust/page.tsx',
  'src/app/[locale]/security/page.tsx',
  'src/app/[locale]/security-center/page.tsx',
  'src/app/[locale]/data-processing/page.tsx',
];

const missing = required.filter((file) => !existsSync(file));

if (missing.length > 0) {
  console.error('Route health artifact check failed. Missing files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log('Route health artifacts are present.');
