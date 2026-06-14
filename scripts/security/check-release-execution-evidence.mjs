#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assertFile(path) {
  if (!existsSync(join(root, path))) {
    throw new Error(`Missing required release execution evidence artifact: ${path}`);
  }
}

function assertIncludes(path, tokens) {
  const content = read(path);
  const missing = tokens.filter((token) => !content.includes(token));
  if (missing.length > 0) {
    throw new Error(`${path} is missing release execution evidence coverage: ${missing.join(', ')}`);
  }
}

const requiredFiles = [
  'docs/RELEASE_EXECUTION_EVIDENCE_MANIFEST.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  'docs/RELEASE_APPROVAL_RECORD.md',
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
  'docs/RELEASE_OPERATIONS_INDEX.md',
  'docs/RELEASE_ROLLBACK_PLAN.md',
  'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md',
  'docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md',
  'docs/RELEASE_SUPPORT_READINESS.md',
];

for (const file of requiredFiles) {
  assertFile(file);
}

assertIncludes('docs/RELEASE_EXECUTION_EVIDENCE_MANIFEST.md', [
  'Release Execution Evidence Manifest',
  'documented readiness',
  'executed readiness',
  'Build evidence',
  'Test evidence',
  'Security command evidence',
  'Supply-chain evidence',
  'Database and tenant isolation evidence',
  'Audit-chain evidence',
  'Step-up authentication evidence',
  'Upload scanning evidence',
  'Billing evidence',
  'Observability evidence',
  'Customer and support evidence',
  'Automatic No-Go conditions',
  'Conditional Go conditions',
  'Production release requires evidence',
]);

assertIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', [
  'Build',
  'Supply-chain',
  'Database',
  'Audit-chain',
  'Billing',
  'Observability',
  'External review',
]);

assertIncludes('docs/RELEASE_GO_NO_GO_CHECKLIST.md', [
  'Go',
  'Conditional Go',
  'No-Go',
  'Automatic No-Go',
]);

console.log('Release execution evidence gate passed.');
