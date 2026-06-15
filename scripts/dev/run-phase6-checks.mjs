#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/dev/check-phase6-kickoff.mjs']],
  ['node', ['scripts/dev/check-phase6-scope.mjs']],
  ['node', ['scripts/dev/check-phase6-inventory.mjs']],
  ['node', ['scripts/dev/check-phase6-validation-plan.mjs']],
  ['node', ['scripts/dev/check-phase6-readiness-surface.mjs']],
  ['node', ['scripts/dev/check-phase6-focused-test.mjs']],
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

console.log('\nPhase 6 checks completed.');
