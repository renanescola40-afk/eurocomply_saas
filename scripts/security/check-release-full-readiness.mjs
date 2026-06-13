#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['run', 'release:readiness']],
  ['npm', ['run', 'security:final-readiness']],
];

let failed = false;

for (const [command, args] of commands) {
  const label = [command, ...args].join(' ');
  console.log(`\n[release-full-readiness] Running: ${label}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`\n[release-full-readiness] Failed: ${label}`);
    break;
  }
}

if (failed) {
  console.error('\nRelease full readiness: failed');
  process.exit(1);
}

console.log('\nRelease full readiness: ok');
