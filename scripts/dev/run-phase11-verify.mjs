#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['scripts/dev/run-phase11-review.mjs']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'build']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Phase 11 verify completed.');
