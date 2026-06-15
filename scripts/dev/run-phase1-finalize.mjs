#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const result = spawnSync('node', ['scripts/dev/run-phase1.mjs'], {
  encoding: 'utf8',
  shell: false,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (existsSync('phase1-final-report.txt')) {
  console.log('\n--- phase1-final-report.txt ---\n');
  console.log(readFileSync('phase1-final-report.txt', 'utf8'));
}

process.exit(result.status ?? 1);
