#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const startedAt = new Date().toISOString();
const steps = [
  { name: 'pin-dependencies', command: 'node', args: ['scripts/dev/pin-known-latest-deps.mjs'] },
  { name: 'lockfile', command: 'npm', args: ['install', '--package-lock-only', '--ignore-scripts'] },
  { name: 'dependency-pin-report', command: 'node', args: ['scripts/dev/write-dependency-pin-report.mjs'] },
  { name: 'status', command: 'node', args: ['scripts/dev/write-phase1-status.mjs'] },
  { name: 'foundation', command: 'node', args: ['scripts/dev/check-local-foundation.mjs'] },
  { name: 'quality', command: 'node', args: ['scripts/dev/run-quality-report.mjs'] },
];

const results = [];

for (const step of steps) {
  const stepStartedAt = new Date().toISOString();
  console.log(`\n> ${step.command} ${step.args.join(' ')}`);

  const result = spawnSync(step.command, step.args, {
    encoding: 'utf8',
    shell: false,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const entry = {
    name: step.name,
    command: `${step.command} ${step.args.join(' ')}`,
    startedAt: stepStartedAt,
    finishedAt: new Date().toISOString(),
    status: result.status ?? 1,
    success: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };

  results.push(entry);

  if (!entry.success) {
    break;
  }
}

const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  success: results.every((step) => step.success),
  results,
};

writeFileSync('phase1-run-report.json', `${JSON.stringify(report, null, 2)}\n`);

if (!report.success) {
  const failed = results.find((step) => !step.success);
  console.error(`Phase 1 runner failed at: ${failed?.name ?? 'unknown'}`);
  console.error('Report written to phase1-run-report.json');
  process.exit(failed?.status || 1);
}

console.log('\nPhase 1 runner passed.');
console.log('Report written to phase1-run-report.json');
