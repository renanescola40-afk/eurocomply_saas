#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['scripts/dev/run-phase12-checks.mjs']],
  ['npm', ['run', 'test']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Phase 12 review completed.');
