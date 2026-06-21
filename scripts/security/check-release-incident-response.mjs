#!/usr/bin/env node

import fs from 'node:fs';

const requiredFiles = [
  'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md',
  'docs/RELEASE_ROLLBACK_PLAN.md',
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
  'docs/RELEASE_APPROVAL_RECORD.md',
  'package.json',
];

const requiredIncidentTokens = [
  'Release Incident Response Plan',
  'SEV-1',
  'SEV-2',
  'SEV-3',
  'Incident commander',
  'Rollback owner',
  'Evidence owner',
  'Required evidence preservation',
  'Rollback decision',
  'Communication rules',
  'Closure criteria',
  'Post-incident review',
  'Release readiness impact',
  'Enterprise rule',
];

const requiredRollbackTokens = [
  'Release Rollback Plan',
  'rollback ownership',
  'post-rollback validation',
];

const requiredGoNoGoTokens = [
  'Automatic No-Go',
  'rollback',
];

const requiredApprovalTokens = [
  'Incident owner:',
  'Rollback owner:',
  'Customer communication owner:',
];

const requiredReleaseOwners = [
  { label: 'Incident owner', env: 'RELEASE_INCIDENT_OWNER' },
  { label: 'Rollback owner', env: 'RELEASE_ROLLBACK_OWNER' },
];

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assertFile(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing required release incident-response artifact: ${path}`);
  }
}

function assertIncludes(content, token, path) {
  if (!content.includes(token)) {
    throw new Error(`Missing token in ${path}: ${token}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ownerValueFromApprovalRecord(content, label) {
  const pattern = new RegExp(`^-\\s*${escapeRegExp(label)}:\\s*(?<value>.+)$`, 'im');
  const value = content.match(pattern)?.groups?.value?.trim() ?? '';
  return value && !/^tbd|todo|n\/a|none|placeholder$/i.test(value) ? value : '';
}

function assertReleaseOwners(approval) {
  for (const owner of requiredReleaseOwners) {
    const fromEnv = process.env[owner.env]?.trim() ?? '';
    const fromApprovalRecord = ownerValueFromApprovalRecord(approval, owner.label);
    if (!fromEnv && !fromApprovalRecord) {
      throw new Error(
        `Release readiness requires ${owner.label}. Set ${owner.env} or fill "${owner.label}:" in docs/RELEASE_APPROVAL_RECORD.md.`,
      );
    }
  }
}

try {
  for (const file of requiredFiles) {
    assertFile(file);
  }

  const incident = read('docs/RELEASE_INCIDENT_RESPONSE_PLAN.md');
  const rollback = read('docs/RELEASE_ROLLBACK_PLAN.md');
  const goNoGo = read('docs/RELEASE_GO_NO_GO_CHECKLIST.md');
  const approval = read('docs/RELEASE_APPROVAL_RECORD.md');
  const packageJson = read('package.json');

  for (const token of requiredIncidentTokens) {
    assertIncludes(incident, token, 'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md');
  }

  for (const token of requiredRollbackTokens) {
    assertIncludes(rollback, token, 'docs/RELEASE_ROLLBACK_PLAN.md');
  }

  for (const token of requiredGoNoGoTokens) {
    assertIncludes(goNoGo, token, 'docs/RELEASE_GO_NO_GO_CHECKLIST.md');
  }

  for (const token of requiredApprovalTokens) {
    assertIncludes(approval, token, 'docs/RELEASE_APPROVAL_RECORD.md');
  }

  assertReleaseOwners(approval);

  assertIncludes(packageJson, 'security:release-incident-response', 'package.json');
  assertIncludes(packageJson, 'release:readiness', 'package.json');

  console.log('Release incident-response readiness: ok');
} catch (error) {
  console.error('Release incident-response readiness failed:');
  console.error(`- ${error.message}`);
  process.exit(1);
}
