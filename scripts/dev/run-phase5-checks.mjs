#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/dev/check-phase5-kickoff.mjs']],
  ['node', ['scripts/dev/check-phase5-scope.mjs']],
  ['node', ['scripts/dev/check-phase5-inventory.mjs']],
  ['node', ['scripts/dev/check-phase5-discovery-notes.mjs']],
  ['node', ['scripts/dev/check-phase5-functional-inventory.mjs']],
  ['node', ['scripts/dev/check-phase5-validation-plan.mjs']],
  ['node', ['scripts/dev/check-phase5-dashboard-invariants.mjs']],
  ['node', ['scripts/dev/check-phase5-focused-test.mjs']],
  ['node', ['scripts/dev/check-phase5-workflow-readiness-wiring.mjs']],
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

console.log('\nPhase 5 checks completed.');
