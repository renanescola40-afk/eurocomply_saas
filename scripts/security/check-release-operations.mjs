#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/RELEASE_OPERATIONS_INDEX.md',
  'docs/RELEASE_CANDIDATE_VALIDATION.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  'docs/RELEASE_APPROVAL_RECORD.md',
  'docs/RELEASE_APPROVAL_LINKAGE.md',
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
  'docs/RELEASE_ROLLBACK_PLAN.md',
  'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md',
  'docs/RELEASE_POST_INCIDENT_REVIEW.md',
  'docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md',
  'docs/RELEASE_SUPPORT_READINESS.md',
];

const requiredIndexTokens = [
  'Release Operations Index',
  'RELEASE_CANDIDATE_VALIDATION.md',
  'RELEASE_EVIDENCE_CHECKLIST.md',
  'RELEASE_APPROVAL_RECORD.md',
  'RELEASE_GO_NO_GO_CHECKLIST.md',
  'RELEASE_ROLLBACK_PLAN.md',
  'RELEASE_INCIDENT_RESPONSE_PLAN.md',
  'RELEASE_POST_INCIDENT_REVIEW.md',
  'RELEASE_CUSTOMER_COMMUNICATION_PLAN.md',
  'RELEASE_SUPPORT_READINESS.md',
  'npm run release:readiness',
  'npm run security:ci',
  'security:release-candidate',
  'security:release-evidence',
  'security:release-approval',
  'security:release-go-no-go',
  'security:release-rollback',
  'security:release-incident-response',
  'security:release-post-incident',
  'security:release-support-readiness',
  'Enterprise rule',
];

const failures = [];
const warnings = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`Missing required release operations file: ${file}`);
  }
}

if (existsSync('docs/RELEASE_OPERATIONS_INDEX.md')) {
  const content = readFileSync('docs/RELEASE_OPERATIONS_INDEX.md', 'utf8');
  for (const token of requiredIndexTokens) {
    if (!content.includes(token)) {
      failures.push(`Release operations index missing token: ${token}`);
    }
  }
}

if (existsSync('package.json')) {
  const content = readFileSync('package.json', 'utf8');
  if (!content.includes('release:readiness')) {
    failures.push('package.json missing release:readiness script');
  }
  if (!content.includes('check-release-operations.mjs')) {
    warnings.push('package.json does not wire check-release-operations.mjs yet; run this gate directly until package wiring is available.');
  }
} else {
  failures.push('Missing package.json');
}

if (failures.length > 0) {
  console.error('Release operations readiness failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('Release operations readiness warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

console.log('Release operations readiness: ok');
