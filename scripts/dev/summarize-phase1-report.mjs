#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const reportPath = process.argv[2] ?? 'phase1-run-report.json';
const outputPath = process.argv[3] ?? 'phase1-summary.json';

if (!existsSync(reportPath)) {
  console.error(`Report not found: ${reportPath}`);
  console.error('Run node scripts/dev/run-phase1.mjs first.');
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const results = Array.isArray(report.results) ? report.results : [];
const failed = results.find((step) => !step.success) ?? null;

function nextAction(stepName) {
  switch (stepName) {
    case 'pin-dependencies':
      return 'Check package.json write permissions and rerun the phase 1 runner.';
    case 'build-prereqs':
      return 'Review missing base files or required dependencies before running install/build.';
    case 'lockfile':
      return 'Review npm install output, dependency resolution, and package manager version.';
    case 'dependency-pin-report':
      return 'Replace remaining latest dependency versions or update the known pin list.';
    case 'status':
      return 'Review phase1-status.json and fix missing lockfile, scripts, or dependency pins.';
    case 'foundation':
      return 'Review local foundation output and fix package or script requirements.';
    case 'quality':
      return 'Open local-quality-report.json and fix the first failing typecheck, test, or build step.';
    default:
      return 'Review the failing step output and rerun the phase 1 runner.';
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  source: reportPath,
  success: Boolean(report.success),
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

writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

if (failed) {
  console.error(`Phase 1 failed at: ${failed.name}`);
  console.error(summary.failedStep.nextAction);
  console.error(`Summary written to ${outputPath}`);
  process.exit(1);
}

console.log('Phase 1 report summary passed.');
console.log(`Summary written to ${outputPath}`);
