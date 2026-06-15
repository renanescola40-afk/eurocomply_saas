#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/dev/check-phase3-progress-status.mjs']],
  ['node', ['scripts/dev/check-phase3-scope-lock.mjs']],
  ['node', ['scripts/dev/check-phase3-external-gates-checklist.mjs']],
  ['node', ['scripts/dev/check-phase3-final-validation-commands.mjs']],
  ['node', ['scripts/dev/check-phase3-closeout-decision.mjs']],
  ['node', ['scripts/dev/check-phase3-index.mjs']],
  ['node', ['scripts/dev/check-phase3-repository-closeout.mjs']],
  ['node', ['scripts/dev/check-phase3-evidence-pack.mjs']],
  ['node', ['scripts/dev/check-phase3-two-command-closeout.mjs']],
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

console.log('\nPhase 3 closeout checks completed.');
console.log('Repository closeout evidence is ready when this command and npm run phase3:strict both pass.');
