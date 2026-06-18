#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict');

const commands = [
  ['node', ['scripts/security/check-p1-evidence-index.mjs', ...(strict ? ['--strict'] : [])]],
  ['node', ['scripts/security/check-p1-final-evidence-files.mjs', ...(strict ? ['--strict'] : [])]],
  ['node', ['scripts/security/report-p1-evidence-gap.mjs', ...(strict ? ['--strict'] : [])]],
  ['node', ['scripts/security/generate-p1-progress-dashboard.mjs']],
  ['git', ['diff', '--exit-code', 'docs/security/evidence/p1/P1_PROGRESS.md']],
];

for (const [command, args] of commands) {
  console.log(`[p1-final-evidence-gate] running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(`[p1-final-evidence-gate] failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[p1-final-evidence-gate] command failed with exit code ${result.status}: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`[p1-final-evidence-gate] passed${strict ? ' in strict mode' : ''}`);
