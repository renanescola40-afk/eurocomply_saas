#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/dev/ensure-phase2-ci-workflow.mjs']],
  ['node', ['scripts/dev/run-phase2-finalize.mjs']],
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

console.log('\nPhase 2 CI ready checks completed.');
