#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const packageJson = readJson('package.json');
const phase1Summary = readJson('phase1-summary.json');
const lockfileExists = existsSync('package-lock.json');

const latestDependencies = [];
for (const section of ['dependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(packageJson?.[section] ?? {})) {
    if (version === 'latest') {
      latestDependencies.push({ section, name, version });
    }
  }
}

const filesToCommit = [];
if (packageJson && latestDependencies.length === 0) {
  filesToCommit.push('package.json');
}
if (lockfileExists) {
  filesToCommit.push('package-lock.json');
}

const blockers = [];
if (!lockfileExists) {
  blockers.push('package-lock.json is missing. Run node scripts/dev/run-phase1.mjs.');
}
if (latestDependencies.length > 0) {
  blockers.push('Some dependencies still use latest. Run node scripts/dev/pin-known-latest-deps.mjs.');
}
if (phase1Summary && phase1Summary.success === false) {
  blockers.push(`Phase 1 failed at ${phase1Summary.failedStep?.name ?? 'unknown step'}.`);
}

const plan = {
  generatedAt: new Date().toISOString(),
  readyToCommit: blockers.length === 0,
  filesToCommit,
  blockers,
  latestDependencies,
  phase1Summary: phase1Summary
    ? {
        success: phase1Summary.success,
        failedStep: phase1Summary.failedStep ?? null,
      }
    : null,
  suggestedCommands: blockers.length === 0
    ? [
        'git add package.json package-lock.json',
        'git commit -m "Complete phase 1 local foundation"',
      ]
    : [
        'node scripts/dev/run-phase1.mjs',
        'node scripts/dev/write-phase1-commit-plan.mjs',
      ],
};

writeFileSync('phase1-commit-plan.json', `${JSON.stringify(plan, null, 2)}\n`);
console.log(JSON.stringify(plan, null, 2));

if (!plan.readyToCommit) {
  process.exit(1);
}
