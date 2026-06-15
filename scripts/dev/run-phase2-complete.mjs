#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/dev/check-phase2-script-files.mjs']],
  ['node', ['scripts/dev/check-phase2-docs.mjs']],
  ['node', ['scripts/dev/ensure-phase2-gitignore.mjs']],
  ['node', ['scripts/dev/check-phase2-gitignore.mjs']],
  ['node', ['scripts/dev/ensure-phase1-package-scripts.mjs']],
  ['node', ['scripts/dev/check-phase1-package-scripts.mjs']],
  ['node', ['scripts/dev/check-phase2-package-scripts.mjs']],
  ['node', ['scripts/dev/check-phase2-cicd-foundation.mjs']],
  ['node', ['scripts/dev/write-phase2-final-report.mjs']],
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

console.log('\nPhase 2 complete checks finished.');
