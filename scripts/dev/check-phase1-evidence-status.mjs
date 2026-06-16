#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const evidenceDir = 'docs/evidence/phase1';
const items = [
  ['package-lock.json', 'package-lock.json'],
  ['floating-deps', `${evidenceDir}/floating-deps.log`],
  ['npm-ci', `${evidenceDir}/npm-ci.log`],
  ['npm-audit', `${evidenceDir}/npm-audit.log`],
  ['typecheck', `${evidenceDir}/typecheck.log`],
  ['test', `${evidenceDir}/test.log`],
  ['build', `${evidenceDir}/build.log`],
  ['lint', `${evidenceDir}/lint.log`],
  ['dev-smoke', `${evidenceDir}/dev-smoke.log`],
];

function getStatus(path) {
  if (!existsSync(path)) return 'missing';
  if (!path.endsWith('.log')) return 'present';

  const content = readFileSync(path, 'utf8');
  const match = content.match(/## exitCode: (\d+)/);
  if (!match) return 'present-without-exit-code';

  return Number(match[1]) === 0 ? 'passed' : `failed-${match[1]}`;
}

const rows = items.map(([name, path]) => [name, path, getStatus(path)]);
const failures = rows.filter(([, , status]) => status !== 'present' && status !== 'passed');

console.log('Phase 1 evidence status');
console.log('-----------------------');
for (const [name, path, status] of rows) {
  console.log(`${name}: ${status} (${path})`);
}

if (failures.length > 0) {
  console.error(`Phase 1 evidence incomplete: ${failures.length} item(s) missing or failing.`);
  process.exit(1);
}

console.log('Phase 1 evidence complete.');
