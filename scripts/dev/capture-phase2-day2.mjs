#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const evidenceDir = 'docs/evidence/phase2';
const commands = [
  ['day2-npm-ci', 'npm', ['ci']],
  ['day2-lint', 'npm', ['run', 'lint']],
  ['day2-typecheck', 'npm', ['run', 'typecheck']],
  ['day2-test', 'npm', ['run', 'test']],
  ['day2-build', 'npm', ['run', 'build']],
  ['day2-security-ci', 'npm', ['run', 'security:ci']],
];

mkdirSync(evidenceDir, { recursive: true });

const summaryRows = [];

for (const [name, command, args] of commands) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const endedAt = new Date().toISOString();
  const exitCode = result.status ?? 1;
  const log = [
    '# Phase 2 Day 2 evidence: ' + name,
    '',
    '## command',
    command + ' ' + args.join(' '),
    '',
    '## startedAt: ' + startedAt,
    '## endedAt: ' + endedAt,
    '## exitCode: ' + exitCode,
    '',
    '## stdout',
    result.stdout || '',
    '',
    '## stderr',
    result.stderr || '',
    '',
  ].join('\n');

  writeFileSync(evidenceDir + '/' + name + '.log', log);
  summaryRows.push('| ' + name + ' | ' + exitCode + ' | ' + startedAt + ' | ' + endedAt + ' |');

  if (exitCode !== 0) {
    console.error('Phase 2 Day 2 failed at ' + name + '. See ' + evidenceDir + '/' + name + '.log');
    process.exit(exitCode);
  }
}

const summary = [
  '# Phase 2 Day 2 Artifacts Summary',
  '',
  '| Step | Exit code | Started at | Ended at |',
  '| --- | ---: | --- | --- |',
  ...summaryRows,
  '',
  'Day 2 CI evidence was generated from real command output.',
  '',
].join('\n');

writeFileSync(evidenceDir + '/day2-artifacts-summary.md', summary);

console.log('Phase 2 Day 2 evidence captured.');
