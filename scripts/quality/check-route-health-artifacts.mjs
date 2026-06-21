#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const requiredFiles = [
  'docs/quality/ROUTE_INVENTORY.md',
  'docs/quality/ROUTE_HEALTH_REPORT.md',
  'tests/e2e/route-health.spec.ts',
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'src/app/[locale]/login/page.tsx',
  'src/app/[locale]/signup/page.tsx',
  'src/app/[locale]/recuperar-senha/page.tsx',
  'src/app/[locale]/(public-info)/trust/page.tsx',
  'src/app/[locale]/(public-info)/security/page.tsx',
  'src/app/[locale]/(public-info)/data-processing/page.tsx',
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
  'src/app/[locale]/dashboard/organizations/billing/page.tsx',
  'src/app/[locale]/security-center/page.tsx',
];

const requiredSpecNeedles = [
  'anonymous visitor',
  'authenticated user without organization',
  'owner',
  'admin',
  'editor',
  'viewer',
  'pt',
  'en',
  'es',
  'fr',
  'it',
  'de',
  '/dashboard/organizations',
  '/vendor-assurance',
  '/aprovacoes',
  '/security-center',
  '/data-processing',
  '/undefined',
  'mobile viewport',
];

const requiredDocNeedles = [
  'landing',
  'pricing',
  'login',
  'signup',
  'password reset',
  'dashboard',
  'organizations',
  'documents',
  'vendors',
  'risks',
  'tasks/approvals',
  'reports',
  'audit',
  'settings',
  'billing',
  'trust/security',
  'data-processing',
  'owner',
  'admin',
  'editor',
  'viewer',
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

for (const file of requiredFiles) {
  if (!existsSync(join(ROOT, file))) {
    fail(`Missing route-health artifact: ${file}`);
  }
}

const specPath = join(ROOT, 'tests/e2e/route-health.spec.ts');
const inventoryPath = join(ROOT, 'docs/quality/ROUTE_INVENTORY.md');
const reportPath = join(ROOT, 'docs/quality/ROUTE_HEALTH_REPORT.md');

if (existsSync(specPath)) {
  const spec = readFileSync(specPath, 'utf8');
  for (const needle of requiredSpecNeedles) {
    if (!spec.includes(needle)) {
      fail(`Route E2E spec is missing required coverage marker: ${needle}`);
    }
  }
}

for (const docPath of [inventoryPath, reportPath]) {
  if (!existsSync(docPath)) continue;
  const doc = readFileSync(docPath, 'utf8').toLowerCase();
  for (const needle of requiredDocNeedles) {
    if (!doc.includes(needle.toLowerCase())) {
      fail(`${docPath.replace(`${ROOT}/`, '')} is missing required route-health marker: ${needle}`);
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Route health artifact check passed.');
