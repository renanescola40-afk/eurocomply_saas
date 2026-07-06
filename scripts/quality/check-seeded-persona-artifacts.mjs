#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'docs/product/SEEDED_QA_PERSONAS.md',
  'tests/e2e/seeded-permissions.spec.ts',
];

const requiredMarkers = {
  'docs/product/SEEDED_QA_PERSONAS.md': [
    'Seeded QA Personas',
    'Required storage state files',
    'Required gates',
    'Owner',
    'Admin',
    'Member',
    'Viewer',
    'Billing controls',
    'Team management controls',
    'Product write controls',
    'Acceptance definition for 100%',
  ],
  'tests/e2e/seeded-permissions.spec.ts': [
    'seeded persona permission smoke',
    'owner',
    'admin',
    'member',
    'viewer',
    'billing permission surface',
    'team permission surface',
    'product write permission surface',
    '/pt/dashboard/organizations/billing',
    '/pt/dashboard/organizations/team',
    '/pt/ai-systems',
  ],
};

let failed = false;

function fail(message) {
  failed = true;
  console.error(message);
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) fail(`Missing seeded persona artifact: ${file}`);
}

for (const [file, markers] of Object.entries(requiredMarkers)) {
  const path = join(root, file);
  if (!existsSync(path)) continue;

  const body = readFileSync(path, 'utf8').toLowerCase();
  for (const marker of markers) {
    if (!body.includes(marker.toLowerCase())) fail(`${file} missing seeded persona marker: ${marker}`);
  }
}

if (failed) process.exit(1);
console.log('Seeded persona QA artifacts are present.');
