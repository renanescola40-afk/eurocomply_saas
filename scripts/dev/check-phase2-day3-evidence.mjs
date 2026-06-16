#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const evidenceDir = 'docs/evidence/phase2';
const items = [
  ['day3-preview-deploy', evidenceDir + '/day3-preview-deploy.md'],
  ['day3-production-deploy', evidenceDir + '/day3-production-deploy.md'],
  ['day3-health-check', evidenceDir + '/day3-health-check.log'],
  ['day3-smoke-test', evidenceDir + '/day3-smoke-test.log'],
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

console.log('Phase 2 Day 3 evidence status');
console.log('-----------------------------');
for (const [name, path, status] of rows) {
  console.log(name + ': ' + status + ' (' + path + ')');
}

if (failures.length > 0) {
  console.error('Phase 2 Day 3 evidence incomplete: ' + failures.length + ' item(s) missing or failing.');
  process.exit(1);
}

console.log('Phase 2 Day 3 evidence complete.');
