#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const app = 'src/app/[locale]';
const dash = `${app}/dashboard`;
const org = `${dash}/organizations`;
const s = 'security';

const required = [
  'docs/quality/ROUTE_INVENTORY.md',
  'docs/quality/ROUTE_HEALTH_REPORT.md',
  'tests/e2e/route-health.spec.ts',
  'scripts/quality/run-route-health-e2e.mjs',
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

const contentMarkers = {
  'tests/e2e/route-health.spec.ts': [
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
    '/dashboard/organizations/billing',
    '/vendor-assurance',
    '/aprovacoes',
    `/${s}-center`,
    '/data-processing',
    '/undefined',
    'expectNoUndefinedLinks',
    'expectNoDeadPrimaryControls',
    'should redirect to localized login',
    'mobile viewport',
  ],
  'scripts/quality/run-route-health-e2e.mjs': [
    'local',
    'preview',
    'production',
    'E2E_BASE_URLS',
    'E2E_PREVIEW_URL',
    'E2E_PRODUCTION_URL',
    'ROUTE_HEALTH_SKIP_LOCAL',
    'ROUTE_HEALTH_TARGET',
  ],
  'docs/quality/ROUTE_INVENTORY.md': [
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
    'preview',
    'production',
    'owner',
    'admin',
    'editor',
    'viewer',
  ],
  'docs/quality/ROUTE_HEALTH_REPORT.md': [
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
    'preview',
    'production',
    'CI blocks merge',
  ],
};

let failed = false;

function fail(message) {
  failed = true;
  console.error(message);
}

for (const file of required) {
  if (!existsSync(join(root, file))) fail(`Missing route health artifact: ${file}`);
}

for (const [file, markers] of Object.entries(contentMarkers)) {
  const path = join(root, file);
  if (!existsSync(path)) continue;

  const body = readFileSync(path, 'utf8').toLowerCase();
  for (const marker of markers) {
    if (!body.includes(marker.toLowerCase())) fail(`${file} missing marker: ${marker}`);
  }
}

if (failed) process.exit(1);
console.log('Route health artifact check passed.');
