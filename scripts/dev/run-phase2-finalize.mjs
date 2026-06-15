#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/dev/run-phase2-complete.mjs']],
  ['node', ['scripts/dev/check-phase2-commit-plan.mjs']],
];

for (const [command, args] of steps) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const finalReportPath = 'phase2-final-report.txt';
const commitPlanPath = 'phase2-commit-plan.json';

if (existsSync(finalReportPath)) {
  console.log(`\n--- ${finalReportPath} ---`);
  process.stdout.write(readFileSync(finalReportPath, 'utf8'));
}

if (existsSync(commitPlanPath)) {
  console.log(`\n--- ${commitPlanPath} ---`);
  process.stdout.write(readFileSync(commitPlanPath, 'utf8'));
}

console.log('\nPhase 2 finalize checks completed.');
