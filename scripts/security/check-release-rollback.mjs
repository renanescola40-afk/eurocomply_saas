#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/RELEASE_ROLLBACK_PLAN.md',
  'docs/RELEASE_CANDIDATE_VALIDATION.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  'docs/RELEASE_APPROVAL_RECORD.md',
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
];

const requiredTokens = new Map([
  [
    'docs/RELEASE_ROLLBACK_PLAN.md',
    [
      'Release Rollback Plan',
      'previous known-good commit SHA',
      'rollback ownership',
      'Application rollback',
      'Database rollback',
      'Configuration rollback',
      'Security-specific rollback considerations',
      'RLS remains enabled',
      'Audit-chain writes continue',
      'Step-up gates remain active',
      'Upload signature validation remains active',
      'Billing webhook verification remains active',
      'Go/No-Go impact',
      'Post-rollback validation',
      'RELEASE_APPROVAL_RECORD.md',
      'RELEASE_GO_NO_GO_CHECKLIST.md',
    ],
  ],
  [
    'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
    ['rollback', 'No-Go', 'Conditional Go'],
  ],
  [
    'docs/RELEASE_EVIDENCE_CHECKLIST.md',
    ['rollback', 'Release decision'],
  ],
  [
    'docs/RELEASE_APPROVAL_RECORD.md',
    ['rollback', 'accepted exceptions', 'Final sign-off', 'Rollback owner:'],
  ],
]);

const failures = [];
let approvalRecord = '';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ownerValueFromApprovalRecord(content, label) {
  const pattern = new RegExp(`^-\\s*${escapeRegExp(label)}:\\s*(?<value>.+)$`, 'im');
  const value = content.match(pattern)?.groups?.value?.trim() ?? '';
  return value && !/^tbd|todo|n\/a|none|placeholder$/i.test(value) ? value : '';
}

for (const filePath of requiredFiles) {
  let content = '';
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    failures.push(`${filePath}: missing required rollback release artifact`);
    continue;
  }

  if (filePath === 'docs/RELEASE_APPROVAL_RECORD.md') {
    approvalRecord = content;
  }

  const tokens = requiredTokens.get(filePath) ?? [];
  for (const token of tokens) {
    if (!content.includes(token)) {
      failures.push(`${filePath}: missing token ${JSON.stringify(token)}`);
    }
  }
}

const rollbackOwner = process.env.RELEASE_ROLLBACK_OWNER?.trim() ?? ownerValueFromApprovalRecord(approvalRecord, 'Rollback owner');
if (!rollbackOwner) {
  failures.push('Release rollback readiness requires Rollback owner. Set RELEASE_ROLLBACK_OWNER or fill "Rollback owner:" in docs/RELEASE_APPROVAL_RECORD.md.');
}

if (failures.length > 0) {
  console.error('Release rollback readiness failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release rollback readiness: ok');
