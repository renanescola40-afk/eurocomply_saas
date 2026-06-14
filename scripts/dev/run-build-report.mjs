#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const startedAt = new Date().toISOString();
const result = spawnSync('npm', ['run', 'build'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const finishedAt = new Date().toISOString();
const report = {
  command: 'npm run build',
  startedAt,
  finishedAt,
  status: result.status,
  signal: result.signal,
  success: result.status === 0,
  stdout: result.stdout ?? '',
  stderr: result.stderr ?? '',
};

writeFileSync('local-build-report.json', `${JSON.stringify(report, null, 2)}\n`);

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  console.error('\nBuild failed. Report written to local-build-report.json');
  process.exit(result.status ?? 1);
}

console.log('\nBuild passed. Report written to local-build-report.json');
