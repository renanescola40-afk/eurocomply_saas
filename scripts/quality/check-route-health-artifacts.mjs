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
  'docs/product/ROUTE_AND_ACTION_AUDIT.md',
  'docs/product/E2E_COVERAGE_MATRIX.md',
  'tests/e2e/route-health.spec.ts',
  'tests/e2e/product-critical-journeys.spec.ts',
  'tests/e2e/enterprise-critical-flows.spec.ts',
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
  'tests/e2e/product-critical-journeys.spec.ts': [
    'landing and pricing controlled-access CTAs stay routable and localized',
    'pricing exposes only actionable critical CTAs',
    'landing waitlist form has loading and success feedback',
    'landing waitlist form shows controlled error feedback',
    'book demo public route is controlled and healthy',
    'redirects anonymous visitor to login and preserves next',
    'anonymous private redirect response is no-store',
    '#waitlist-form',
    '/dashboard/organizations',
    '/dashboard/organizations/billing',
    '/vendor-assurance',
    '/aprovacoes',
    '/ai-systems',
    '/undefined',
  ],
  'tests/e2e/enterprise-critical-flows.spec.ts': [
    'enterprise critical SaaS flow coverage',
    'publicRouteSmokePaths',
    'guardedFeatureRoutes',
    'redirects anonymous visitors to localized login',
    'landing exposes real controlled-access destinations without fake production or legal claims',
    'mobile public conversion routes have no horizontal overflow or raw errors',
    'critical API negative cases are controlled and do not require real credentials',
    'billing checkout rejects anonymous access before Stripe is reached',
    'document upload rejects untrusted anonymous mutation before storage is reached',
    '/dashboard/organizations',
    '/dashboard/organizations/billing',
    '/vendor-assurance',
    '/aprovacoes',
    '/api/billing/checkout',
    '/api/documents/upload',
    '/undefined',
    'no-store',
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
  'docs/product/ROUTE_AND_ACTION_AUDIT.md': [
    'Route matrix',
    'Action matrix',
    'Public/private',
    'Needs auth?',
    'Needs org?',
    'Needs role?',
    'Expected without session',
    'Expected with session',
    'Expected without organization',
    'Expected with insufficient permission',
    'Join waitlist',
    'Start Professional Trial',
    'Book Business Demo',
    'Talk to Sales',
    'Create account and continue',
    'Continue to secure checkout',
    'Onboarding complete',
    'Create AI system',
    'Create task/document',
    'Mobile behavior',
    'Required role',
    'no-store',
    '/undefined',
  ],
  'docs/product/E2E_COVERAGE_MATRIX.md': [
    'Landing -> pricing -> signup',
    'Login redirect',
    'Protected route redirect',
    'Protected route no-store',
    'Onboarding complete',
    'Dashboard load',
    'Create AI system',
    'Create task/document',
    'Billing CTA',
    'Trust/security pages',
    'Mobile smoke',
    'Keyboard basic navigation',
    'Public form loading/success',
    'Public form error feedback',
    'Checkout without plan',
    'Synthetic data policy',
    'E2E_AUTH_STORAGE_STATE',
    'E2E_ALLOW_SYNTHETIC_ONBOARDING_WRITE',
    'E2E_ALLOW_SYNTHETIC_APP_WRITES',
  ],
};

let failed = false;

function fail(message) {
  failed = true;
  console.error(message);
}

for (const file of required) {
  if (!existsSync(join(root, file))) fail(`Missing route/product health artifact: ${file}`);
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
console.log('Route health, product action audit, and E2E coverage markers are present.');
