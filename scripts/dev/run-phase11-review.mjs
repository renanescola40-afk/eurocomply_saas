#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['scripts/dev/run-phase11-checks.mjs']],
  ['npm', ['run', 'test']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Phase 11 review completed.');
