#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assertFile(path) {
  if (!existsSync(join(root, path))) {
    throw new Error(`Missing required release deployment artifact: ${path}`);
  }
}

function assertIncludes(path, tokens) {
  const content = read(path);
  const missing = tokens.filter((token) => !content.includes(token));
  if (missing.length > 0) {
    throw new Error(`${path} is missing deployment evidence coverage: ${missing.join(', ')}`);
  }
}

const requiredFiles = [
  'docs/RELEASE_DEPLOYMENT_EVIDENCE.md',
  'docs/RELEASE_APPROVAL_RECORD.md',
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
  'docs/RELEASE_EXECUTION_EVIDENCE_MANIFEST.md',
  'docs/RELEASE_ROLLBACK_PLAN.md',
  'docs/RELEASE_OPERATIONS_INDEX.md',
];

for (const file of requiredFiles) {
  assertFile(file);
}

assertIncludes('docs/RELEASE_DEPLOYMENT_EVIDENCE.md', [
  'Release Deployment Evidence Standard',
  'Approved commit SHA',
  'Deployed commit SHA',
  'Deployment platform',
  'Deployment environment',
  'Deployment owner',
  'Rollback owner',
  'Required pre-deployment checks',
  'Required post-deployment checks',
  'Evidence attachments',
  'Automatic No-Go conditions',
  'Rollback trigger conditions',
  'A release is not production-complete',
]);

assertIncludes('docs/RELEASE_EXECUTION_EVIDENCE_MANIFEST.md', [
  'Build evidence',
  'Security command evidence',
  'Observability evidence',
  'Customer and support evidence',
]);

assertIncludes('docs/RELEASE_ROLLBACK_PLAN.md', [
  'rollback',
]);

console.log('Release deployment evidence gate passed.');
