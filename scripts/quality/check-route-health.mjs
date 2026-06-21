#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const app = 'src/app/[locale]';
const dash = `${app}/dashboard`;
const org = `${dash}/organizations`;
const s = 'security';

const files = [
  'docs/quality/ROUTE_INVENTORY.md',
  'docs/quality/ROUTE_HEALTH_REPORT.md',
  'tests/e2e/route-health.spec.ts',
  `${app}/page.tsx`,
  `${app}/pricing/page.tsx`,
  `${app}/login/page.tsx`,
  `${app}/signup/page.tsx`,
  `${app}/recuperar-senha/page.tsx`,
  `${app}/trust/page.tsx`,
  `${app}/${s}/page.tsx`,
  `${app}/data-processing/page.tsx`,
  `${dash}/page.tsx`,
  `${org}/page.tsx`,
  `${org}/documents/page.tsx`,
  `${app}/vendor-assurance/page.tsx`,
  `${org}/risks/page.tsx`,
  `${app}/aprovacoes/page.tsx`,
  `${dash}/tasks/page.tsx`,
  `${org}/reports-governance/page.tsx`,
  `${app}/auditoria/page.tsx`,
  `${app}/settings/page.tsx`,
  `${app}/billing/page.tsx`,
  `${org}/billing/page.tsx`,
  `${app}/${s}-center/page.tsx`,
];

const specNeedles = [
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
  `/${s}-center`,
  '/data-processing',
  '/undefined',
  'mobile viewport',
];

const docNeedles = [
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
  `trust/${s}`,
  'data-processing',
  'owner',
  'admin',
  'editor',
  'viewer',
];

let failed = false;
function fail(message) {
  failed = true;
  console.error(message);
}

for (const file of files) {
  if (!existsSync(join(root, file))) fail(`Missing route health artifact: ${file}`);
}

const spec = join(root, 'tests/e2e/route-health.spec.ts');
if (existsSync(spec)) {
  const body = readFileSync(spec, 'utf8');
  for (const needle of specNeedles) if (!body.includes(needle)) fail(`Route E2E spec missing marker: ${needle}`);
}

for (const file of ['docs/quality/ROUTE_INVENTORY.md', 'docs/quality/ROUTE_HEALTH_REPORT.md']) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  const body = readFileSync(path, 'utf8').toLowerCase();
  for (const needle of docNeedles) if (!body.includes(needle.toLowerCase())) fail(`${file} missing marker: ${needle}`);
}

if (failed) process.exit(1);
console.log('Route health artifact check passed.');
