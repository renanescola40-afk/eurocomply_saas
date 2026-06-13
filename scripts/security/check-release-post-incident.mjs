#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';

const requiredFiles = [
  'docs/RELEASE_POST_INCIDENT_REVIEW.md',
  'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md',
  'docs/RELEASE_ROLLBACK_PLAN.md',
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  'package.json',
];

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

for (const file of requiredFiles) {
  read(file);
}

const review = read('docs/RELEASE_POST_INCIDENT_REVIEW.md');
const incident = read('docs/RELEASE_INCIDENT_RESPONSE_PLAN.md');
const rollback = read('docs/RELEASE_ROLLBACK_PLAN.md');
const goNoGo = read('docs/RELEASE_GO_NO_GO_CHECKLIST.md');
const evidence = read('docs/RELEASE_EVIDENCE_CHECKLIST.md');
const pkg = read('package.json');

const reviewTokens = [
  'Release Post-Incident Review',
  'Incident identifier',
  'Release identifier',
  'Promoted commit SHA',
  'Severity',
  'Incident commander',
  'Security/compliance owner',
  'Customer communication owner',
  'Corrective actions',
  'Preventive actions',
  'Rollback decision',
  'Release readiness impact',
  'Enterprise rule',
];

for (const token of reviewTokens) {
  if (!review.includes(token)) {
    failures.push(`docs/RELEASE_POST_INCIDENT_REVIEW.md must include '${token}'`);
  }
}

const linkedDocs = [
  'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md',
  'docs/RELEASE_ROLLBACK_PLAN.md',
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
  'docs/RELEASE_APPROVAL_RECORD.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
];

for (const token of linkedDocs) {
  if (!review.includes(token)) {
    failures.push(`post-incident review must reference ${token}`);
  }
}

if (!incident.includes('post-incident review')) {
  failures.push('incident response plan must reference post-incident review');
}

if (!rollback.includes('post-rollback validation')) {
  failures.push('rollback plan must include post-rollback validation');
}

if (!goNoGo.includes('Automatic No-Go')) {
  failures.push('Go/No-Go checklist must define automatic No-Go criteria');
}

if (!evidence.includes('External review evidence')) {
  failures.push('release evidence checklist must include external review evidence');
}

if (!pkg.includes('security:release-post-incident')) {
  failures.push('package.json must define security:release-post-incident');
}

if (!pkg.includes('check-release-post-incident.mjs')) {
  failures.push('package.json must run check-release-post-incident.mjs');
}

if (!pkg.includes('release:readiness')) {
  failures.push('package.json must define release:readiness');
}

if (failures.length > 0) {
  console.error('Release post-incident readiness failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release post-incident readiness: ok');
