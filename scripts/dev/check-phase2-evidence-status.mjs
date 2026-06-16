#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const evidenceDir = 'docs/evidence/phase2';
const items = [
  ['package-lock', 'package-lock.json'],
  ['day1-lockfile', evidenceDir + '/day1-lockfile.log'],
  ['day1-npm-ci', evidenceDir + '/day1-npm-ci.log'],
  ['day1-typecheck', evidenceDir + '/day1-typecheck.log'],
  ['day1-test', evidenceDir + '/day1-test.log'],
  ['day1-build', evidenceDir + '/day1-build.log'],
  ['day2-npm-ci', evidenceDir + '/day2-npm-ci.log'],
  ['day2-lint', evidenceDir + '/day2-lint.log'],
  ['day2-typecheck', evidenceDir + '/day2-typecheck.log'],
  ['day2-test', evidenceDir + '/day2-test.log'],
  ['day2-build', evidenceDir + '/day2-build.log'],
  ['day2-security-ci', evidenceDir + '/day2-security-ci.log'],
  ['day2-artifacts-summary', evidenceDir + '/day2-artifacts-summary.md'],
  ['day3-preview-deploy', evidenceDir + '/day3-preview-deploy.md'],
  ['day3-production-deploy', evidenceDir + '/day3-production-deploy.md'],
  ['day3-health-check', evidenceDir + '/day3-health-check.log'],
  ['day3-smoke-test', evidenceDir + '/day3-smoke-test.log'],
  ['day4-supabase-staging', evidenceDir + '/day4-supabase-staging.md'],
  ['day4-supabase-production', evidenceDir + '/day4-supabase-production.md'],
  ['day4-rls-validation', evidenceDir + '/day4-rls-validation.log'],
  ['day4-storage-policy-review', evidenceDir + '/day4-storage-policy-review.md'],
];

function getStatus(path) {
  if (!existsSync(path)) return 'missing';
  if (!path.endsWith('.log')) return 'present';

  const content = readFileSync(path, 'utf8');
  const match = content.match(/## exitCode: (\d+)/);
  if (!match) return 'present-without-exit-code';

  return Number(match[1]) === 0 ? 'passed' : 'failed-' + match[1];
}

const rows = items.map(([name, path]) => [name, path, getStatus(path)]);
const failures = rows.filter(([, , status]) => status !== 'present' && status !== 'passed');

console.log('Phase 2 evidence status');
console.log('-----------------------');
for (const [name, path, status] of rows) {
  console.log(name + ': ' + status + ' (' + path + ')');
}

if (failures.length > 0) {
  console.error('Phase 2 evidence incomplete: ' + failures.length + ' item(s) missing or failing.');
  process.exit(1);
}

console.log('Phase 2 evidence complete.');
