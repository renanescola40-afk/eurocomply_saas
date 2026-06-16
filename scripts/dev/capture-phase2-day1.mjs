#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const evidenceDir = 'docs/evidence/phase2';
const commands = [
  ['day1-lockfile', 'npm', ['run', 'supply-chain:lockfile']],
  ['day1-npm-ci', 'npm', ['ci']],
  ['day1-typecheck', 'npm', ['run', 'typecheck']],
  ['day1-test', 'npm', ['run', 'test']],
  ['day1-build', 'npm', ['run', 'build']],
];

mkdirSync(evidenceDir, { recursive: true });

for (const [name, command, args] of commands) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const endedAt = new Date().toISOString();
  const exitCode = result.status ?? 1;
  const log = [
    '# Phase 2 Day 1 evidence: ' + name,
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

  if (exitCode !== 0) {
    console.error('Phase 2 Day 1 failed at ' + name + '. See ' + evidenceDir + '/' + name + '.log');
    process.exit(exitCode);
  }
}

console.log('Phase 2 Day 1 evidence captured.');
