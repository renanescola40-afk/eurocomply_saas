#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const startedAt = new Date().toISOString();
const steps = [
  { name: 'gitignore-hygiene', command: 'node', args: ['scripts/dev/check-phase1-gitignore.mjs'] },
  { name: 'package-manager', command: 'node', args: ['scripts/dev/check-package-manager.mjs'] },
  { name: 'pin-dependencies', command: 'node', args: ['scripts/dev/pin-known-latest-deps.mjs'] },
  { name: 'build-prereqs', command: 'node', args: ['scripts/dev/check-build-prereqs.mjs'] },
  { name: 'lockfile', command: 'npm', args: ['install', '--package-lock-only', '--ignore-scripts'] },
  { name: 'lockfile-commit-ready', command: 'node', args: ['scripts/dev/check-lockfile-commit-ready.mjs'] },
  { name: 'dependency-pin-report', command: 'node', args: ['scripts/dev/write-dependency-pin-report.mjs'] },
  { name: 'status', command: 'node', args: ['scripts/dev/write-phase1-status.mjs'] },
  { name: 'foundation', command: 'node', args: ['scripts/dev/check-local-foundation.mjs'] },
  { name: 'quality', command: 'node', args: ['scripts/dev/run-quality-report.mjs'] },
  { name: 'commit-plan', command: 'node', args: ['scripts/dev/write-phase1-commit-plan.mjs'] },
  { name: 'commit-plan-check', command: 'node', args: ['scripts/dev/check-phase1-commit-plan.mjs'] },
];

function nextAction(stepName) {
  switch (stepName) {
    case 'gitignore-hygiene':
      return 'Add missing local diagnostic report files to .gitignore.';
    case 'package-manager':
      return 'Install or activate the npm major version declared in package.json.';
    case 'pin-dependencies':
      return 'Check package.json write permissions and rerun the phase 1 runner.';
    case 'build-prereqs':
      return 'Review missing base files or required dependencies before running install/build.';
    case 'lockfile':
      return 'Review npm install output, dependency resolution, and package manager version.';
    case 'lockfile-commit-ready':
      return 'Ensure package-lock.json exists and is not ignored by Git.';
    case 'dependency-pin-report':
      return 'Replace remaining latest dependency versions or update the known pin list.';
    case 'status':
      return 'Review phase1-status.json and fix missing lockfile, scripts, or dependency pins.';
    case 'foundation':
      return 'Review local foundation output and fix package or script requirements.';
    case 'quality':
      return 'Open local-quality-report.json and fix the first failing typecheck, test, or build step.';
    case 'commit-plan':
      return 'Review phase1-commit-plan.json and resolve any remaining blockers.';
    case 'commit-plan-check':
      return 'Commit package.json and package-lock.json once the plan is ready.';
    default:
      return 'Review the failing step output and rerun the phase 1 runner.';
  }
}

const results = [];

for (const step of steps) {
  const stepStartedAt = new Date().toISOString();
  console.log(`\n> ${step.command} ${step.args.join(' ')}`);

  const result = spawnSync(step.command, step.args, {
    encoding: 'utf8',
    shell: false,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const entry = {
    name: step.name,
    command: `${step.command} ${step.args.join(' ')}`,
    startedAt: stepStartedAt,
    finishedAt: new Date().toISOString(),
    status: result.status ?? 1,
    success: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };

  results.push(entry);

  if (!entry.success) {
    break;
  }
}

const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  success: results.every((step) => step.success),
  results,
};

const failed = results.find((step) => !step.success) ?? null;
const summary = {
  generatedAt: new Date().toISOString(),
  success: report.success,
  completedSteps: results.filter((step) => step.success).map((step) => step.name),
  failedStep: failed
    ? {
        name: failed.name,
        command: failed.command,
        status: failed.status,
        nextAction: nextAction(failed.name),
        stderrPreview: String(failed.stderr ?? '').slice(0, 2000),
        stdoutPreview: String(failed.stdout ?? '').slice(0, 2000),
      }
    : null,
};

writeFileSync('phase1-run-report.json', `${JSON.stringify(report, null, 2)}\n`);
writeFileSync('phase1-summary.json', `${JSON.stringify(summary, null, 2)}\n`);

if (!report.success) {
  console.error(`Phase 1 runner failed at: ${failed?.name ?? 'unknown'}`);
  console.error('Report written to phase1-run-report.json');
  console.error('Summary written to phase1-summary.json');
  process.exit(failed?.status || 1);
}

console.log('\nPhase 1 runner passed.');
console.log('Report written to phase1-run-report.json');
console.log('Summary written to phase1-summary.json');
