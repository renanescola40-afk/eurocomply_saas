#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const evidenceDir = 'docs/evidence/phase1';
const commands = [
  ['floating-deps', 'npm', ['run', 'supply-chain:floating-deps']],
  ['npm-ci', 'npm', ['ci']],
  ['npm-audit', 'npm', ['audit', '--audit-level=moderate']],
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['test', 'npm', ['run', 'test']],
  ['build', 'npm', ['run', 'build']],
  ['lint', 'npm', ['run', 'lint']],
];

if (!existsSync(evidenceDir)) {
  mkdirSync(evidenceDir, { recursive: true });
}

for (const [name, command, args] of commands) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  const output = [
    `$ ${command} ${args.join(' ')}`,
    '',
    '## stdout',
    result.stdout || '',
    '## stderr',
    result.stderr || '',
    `## exitCode: ${result.status ?? 1}`,
  ].join('\n');

  writeFileSync(`${evidenceDir}/${name}.log`, output, 'utf8');

  if (result.status !== 0) {
    console.error(`Phase 1 evidence capture stopped at ${name}. See ${evidenceDir}/${name}.log`);
    process.exit(result.status ?? 1);
  }
}

console.log('Phase 1 evidence capture completed.');
console.log(`Logs written to ${evidenceDir}`);
