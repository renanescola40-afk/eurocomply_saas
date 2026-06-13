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

try {
  for (const file of requiredFiles) {
    assertFile(file);
  }

  const incident = read('docs/RELEASE_INCIDENT_RESPONSE_PLAN.md');
  const rollback = read('docs/RELEASE_ROLLBACK_PLAN.md');
  const goNoGo = read('docs/RELEASE_GO_NO_GO_CHECKLIST.md');
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

  assertIncludes(packageJson, 'security:release-incident-response', 'package.json');
  assertIncludes(packageJson, 'release:readiness', 'package.json');

  console.log('Release incident-response readiness: ok');
} catch (error) {
  console.error('Release incident-response readiness failed:');
  console.error(`- ${error.message}`);
  process.exit(1);
}
