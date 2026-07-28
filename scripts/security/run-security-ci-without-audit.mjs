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

const commands = applicationSecurityCommand
  .split(/\s+&&\s+/)
  .map((entry) => entry.trim())
  .filter(Boolean);

for (const [index, securityCommand] of commands.entries()) {
  console.log(`::group::Application security gate ${index + 1}/${commands.length}: ${securityCommand}`);
  const result = spawnSync(securityCommand, {
    cwd: root,
    env: process.env,
    shell: true,
    stdio: 'inherit',
    timeout: 10 * 60 * 1000,
  });
  console.log('::endgroup::');

  if (result.error) {
    console.error(`Application security gate failed to execute: ${securityCommand}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.signal) {
    console.error(`Application security gate terminated by signal ${result.signal}: ${securityCommand}`);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    console.error(`Application security gate failed with exit code ${result.status ?? 1}: ${securityCommand}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`Application security CI passed all ${commands.length} gates.`);
