#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];

function requireFile(path) {
  if (!existsSync(path)) {
    checks.push(`Missing required file: ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function requireToken(content, token, label) {
  if (!content.includes(token)) {
    checks.push(`${label} is missing required token: ${token}`);
  }
}

const linkage = requireFile('docs/RELEASE_APPROVAL_LINKAGE.md');
const approval = requireFile('docs/RELEASE_APPROVAL_RECORD.md');
const evidence = requireFile('docs/RELEASE_EVIDENCE_CHECKLIST.md');
const rc = requireFile('docs/RELEASE_CANDIDATE_VALIDATION.md');

for (const token of [
  'Release Approval Linkage',
  'RELEASE_APPROVAL_RECORD.md',
  'RELEASE_EVIDENCE_CHECKLIST.md',
  'RELEASE_CANDIDATE_VALIDATION.md',
  'evidence package',
  'exact commit SHA',
  'accepted exceptions',
  'rollback ownership',
  'Enterprise procurement',
]) {
  requireToken(linkage, token, 'release approval linkage');
}

for (const token of [
  'Release Approval Record',
  'commit SHA',
  'Release owner',
  'Approver',
  'exceptions',
]) {
  requireToken(approval, token, 'release approval record');
}

requireToken(evidence, 'Release Evidence Checklist', 'release evidence checklist');
requireToken(rc, 'Release Candidate Validation', 'release candidate validation');

if (checks.length > 0) {
  console.error('Release approval readiness failures:');
  for (const check of checks) {
    console.error(`- ${check}`);
  }
  process.exit(1);
}

console.log('Release approval readiness: ok');
