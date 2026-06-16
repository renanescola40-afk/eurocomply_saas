#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const evidenceDir = 'docs/evidence/phase2';
const items = [
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

console.log('Phase 2 Day 4 evidence status');
console.log('-----------------------------');
for (const [name, path, status] of rows) {
  console.log(name + ': ' + status + ' (' + path + ')');
}

if (failures.length > 0) {
  console.error('Phase 2 Day 4 evidence incomplete: ' + failures.length + ' item(s) missing or failing.');
  process.exit(1);
}

console.log('Phase 2 Day 4 evidence complete.');
