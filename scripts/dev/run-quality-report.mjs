#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const startedAt = new Date().toISOString();
const commands = [
  { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'test', command: 'npm', args: ['run', 'test'] },
  { name: 'build', command: 'npm', args: ['run', 'build'] },
];

const results = [];

for (const item of commands) {
  const stepStartedAt = new Date().toISOString();
  const result = spawnSync(item.command, item.args, {
    encoding: 'utf8',
    shell: false,
  });

  const step = {
    name: item.name,
    command: `${item.command} ${item.args.join(' ')}`,
    startedAt: stepStartedAt,
    finishedAt: new Date().toISOString(),
    status: result.status ?? 1,
    success: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };

  results.push(step);

  if (!step.success) {
    break;
  }
}

const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  success: results.every((step) => step.success),
  results,
};

writeFileSync('local-quality-report.json', `${JSON.stringify(report, null, 2)}\n`);

if (!report.success) {
  const failed = results.find((step) => !step.success);
  console.error(`Local quality report failed at: ${failed?.name ?? 'unknown'}`);
  console.error('Report written to local-quality-report.json');
  process.exit(failed?.status || 1);
}

console.log('Local quality report passed.');
console.log('Report written to local-quality-report.json');
