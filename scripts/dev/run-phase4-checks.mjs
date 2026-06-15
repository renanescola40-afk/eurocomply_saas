#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/dev/check-phase4-kickoff.mjs']],
  ['node', ['scripts/dev/check-phase4-scope.mjs']],
  ['node', ['scripts/dev/check-phase4-inventory.mjs']],
  ['node', ['scripts/dev/check-phase4-data-flow.mjs']],
  ['node', ['scripts/dev/check-phase4-access-model.mjs']],
  ['node', ['scripts/dev/check-phase4-operational-assumptions.mjs']],
  ['node', ['scripts/dev/check-phase4-implementation-readiness.mjs']],
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

console.log('\nPhase 4 checks completed.');
