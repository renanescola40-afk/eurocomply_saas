#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const command = packageJson?.scripts?.['security:ci'];

if (typeof command !== 'string' || !command.trim()) {
  console.error('package.json must define security:ci');
  process.exit(1);
}

const auditSegment = 'npm run security:npm-audit:all && ';
if (!command.includes(auditSegment)) {
  console.error('security:ci no longer contains the expected explicit npm audit segment');
  process.exit(1);
}

const applicationSecurityCommand = command.replace(auditSegment, '');
if (applicationSecurityCommand.includes('security:npm-audit')) {
  console.error('application security command still contains an npm audit invocation');
  process.exit(1);
}

const result = spawnSync(applicationSecurityCommand, {
  cwd: root,
  env: process.env,
  shell: true,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
