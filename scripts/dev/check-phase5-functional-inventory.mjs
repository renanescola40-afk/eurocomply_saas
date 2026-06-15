#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/PHASE5_FUNCTIONAL_INVENTORY.md';
const required = [
  'Organization-scoped compliance project workflows',
  'Concrete routes and modules are not identified yet',
  'Direct file inspection is required before selecting implementation files',
  'Name the existing application routes to review',
  'Name the project-related modules to review',
  'Name the organization or tenant context helpers to review',
  'Name the audit-event helpers to review',
  'Name the tests to add or update',
  'Confirm no product, email, document, or UI template changes are required',
  'Functional work should wait until this inventory is updated with concrete file paths and matching validation steps',
  'Do not commit local environment files, provider credentials, private keys, service credentials, or customer data',
];

if (!existsSync(path)) {
  console.error(`${path} is missing`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const missing = required.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error('Phase 5 functional inventory is incomplete.');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Phase 5 functional inventory check passed.');
