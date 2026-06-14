#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['scripts/security/check-release-candidate.mjs']],
  ['node', ['scripts/security/check-release-evidence.mjs']],
  ['node', ['scripts/security/check-release-approval.mjs']],
  ['node', ['scripts/security/check-release-go-no-go.mjs']],
  ['node', ['scripts/security/check-release-rollback.mjs']],
  ['node', ['scripts/security/check-release-incident-response.mjs']],
  ['node', ['scripts/security/check-release-post-incident.mjs']],
  ['node', ['scripts/security/check-release-support-readiness.mjs']],
  ['node', ['scripts/security/check-release-operations.mjs']],
  ['node', ['scripts/security/check-release-readiness-scorecard.mjs']],
  ['node', ['scripts/security/check-release-execution-evidence.mjs']],
];

for (const [command, args] of commands) {
  const label = `${command} ${args.join(' ')}`;
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nRelease execution readiness runner passed.');
