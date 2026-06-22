#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/quality/ROUTE_INVENTORY.md',
  'docs/quality/ROUTE_HEALTH_REPORT.md',
  'tests/e2e/route-health.spec.ts',
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'src/app/[locale]/login/page.tsx',
  'src/app/[locale]/signup/page.tsx',
  'src/app/[locale]/recuperar-senha/page.tsx',
  'src/app/[locale]/dashboard/page.tsx',
  'src/app/[locale]/organizations/page.tsx',
  'src/app/[locale]/documents/page.tsx',
  'src/app/[locale]/vendors/page.tsx',
  'src/app/[locale]/risks/page.tsx',
  'src/app/[locale]/tasks/page.tsx',
  'src/app/[locale]/approvals/page.tsx',
  'src/app/[locale]/reports/page.tsx',
  'src/app/[locale]/audit/page.tsx',
  'src/app/[locale]/settings/page.tsx',
  'src/app/[locale]/billing/page.tsx',
  'src/app/[locale]/trust/page.tsx',
  'src/app/[locale]/security/page.tsx',
  'src/app/[locale]/data-processing/page.tsx',
];

const specMarkers = [
  'anonymous private routes redirect to localized login',
  'legacy undefined routes never stay on undefined',
  'public routes render on mobile viewport',
  'authenticated RBAC route health',
  'viewer does not see admin affordances',
  'owner sees admin affordances',
];

const inventoryMarkers = [
  'Route Inventory',
  'Public routes',
  'Private routes',
  'RBAC personas',
  'Locales',
];

const missing = requiredFiles.filter((file) => !existsSync(file));

if (missing.length > 0) {
  console.error('Route health artifact check failed. Missing files:');
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const spec = readFileSync('tests/e2e/route-health.spec.ts', 'utf8');
const inventory = readFileSync('docs/quality/ROUTE_INVENTORY.md', 'utf8');

const missingSpecMarkers = specMarkers.filter((marker) => !spec.includes(marker));
const missingInventoryMarkers = inventoryMarkers.filter((marker) => !inventory.includes(marker));

if (missingSpecMarkers.length > 0 || missingInventoryMarkers.length > 0) {
  console.error('Route health artifact check failed. Missing coverage markers:');
  for (const marker of missingSpecMarkers) {
    console.error(`- spec marker: ${marker}`);
  }
  for (const marker of missingInventoryMarkers) {
    console.error(`- inventory marker: ${marker}`);
  }
  process.exit(1);
}

console.log('Route health artifacts are present and coverage markers are intact.');
