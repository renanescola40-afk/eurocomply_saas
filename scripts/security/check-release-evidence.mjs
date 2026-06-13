#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];

function addCheck(ok, message) {
  checks.push({ ok, message });
}

function readRequired(path) {
  const exists = existsSync(path);
  addCheck(exists, `${path} exists`);
  return exists ? readFileSync(path, 'utf8') : '';
}

function requireTokens(path, content, tokens) {
  for (const token of tokens) {
    addCheck(content.includes(token), `${path} contains ${token}`);
  }
}

const evidenceChecklist = readRequired('docs/RELEASE_EVIDENCE_CHECKLIST.md');
const rcRunbook = readRequired('docs/RELEASE_CANDIDATE_VALIDATION.md');
const packageJson = readRequired('package.json');

requireTokens('docs/RELEASE_EVIDENCE_CHECKLIST.md', evidenceChecklist, [
  'Build and CI evidence',
  'Supply-chain evidence',
  'Database and RLS evidence',
  'Audit-chain evidence',
  'Step-up authentication evidence',
  'Upload scanning evidence',
  'Billing evidence',
  'Observability evidence',
  'External review evidence',
  'Release decision',
]);

requireTokens('docs/RELEASE_CANDIDATE_VALIDATION.md', rcRunbook, [
  'Release Candidate Validation',
  'RELEASE_EVIDENCE_CHECKLIST.md',
  'Security CI',
  'Supabase',
  'Vercel',
  'Stripe',
  'pentest',
]);

requireTokens('package.json', packageJson, [
  'security:release-candidate',
]);

const failures = checks.filter((check) => !check.ok);

if (failures.length > 0) {
  console.error('Release evidence validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure.message}`);
  }
  process.exit(1);
}

console.log('Release evidence validation: ok');
