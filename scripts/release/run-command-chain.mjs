#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = process.argv.slice(2);

if (commands.length === 0) {
  console.error('Usage: node scripts/release/run-command-chain.mjs "command one" "command two"');
  process.exit(1);
}

for (const commandLine of commands) {
  const result = spawnSync(commandLine, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(typeof result.status === 'number' ? result.status : 1);
  }
}

console.log('Command chain passed.');
