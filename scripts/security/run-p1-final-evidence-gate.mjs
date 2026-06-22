#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict');

function run(command, args, options = {}) {
  console.log(`[p1-final-evidence-gate] running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(`[p1-final-evidence-gate] failed to run ${command}: ${result.error.message}`);
    if (!options.allowFailure) process.exit(1);
    return false;
  }
  if (result.status !== 0) {
    const message = `[p1-final-evidence-gate] command failed with exit code ${result.status}: ${command} ${args.join(' ')}`;
    if (!options.allowFailure) {
      console.error(message);
      process.exit(result.status ?? 1);
    }
    console.warn(`${message} (advisory in non-strict mode)`);
    return false;
  }
  return true;
}

const requiredCommands = [
  ['node', ['scripts/security/check-p1-evidence-index.mjs', ...(strict ? ['--strict'] : [])]],
  ['node', ['scripts/security/check-p1-final-evidence-files.mjs', ...(strict ? ['--strict'] : [])]],
  ['node', ['scripts/security/report-p1-evidence-gap.mjs', ...(strict ? ['--strict'] : [])]],
  ['node', ['scripts/security/generate-p1-progress-dashboard.mjs']],
];

for (const [command, args] of requiredCommands) run(command, args);

run('git', ['diff', '--exit-code', 'docs/security/evidence/p1/P1_PROGRESS.md'], { allowFailure: !strict });

console.log(`[p1-final-evidence-gate] passed${strict ? ' in strict mode' : ''}`);
