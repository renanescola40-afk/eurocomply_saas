#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function preview(value, maxLines = 40) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.split('\n').slice(-maxLines).join('\n');
}

const summary = readJson('phase1-summary.json');
const plan = readJson('phase1-commit-plan.json');
const lines = [];

lines.push('# Phase 1 Final Report');
lines.push('');
lines.push(`Generated at: ${new Date().toISOString()}`);
lines.push(`Phase 1 success: ${summary ? Boolean(summary.success) : 'unknown'}`);
lines.push(`Ready to commit: ${plan ? Boolean(plan.readyToCommit) : 'unknown'}`);
lines.push('');

if (summary?.completedSteps?.length) {
  lines.push('Completed steps:');
  for (const step of summary.completedSteps) {
    lines.push(`- ${step}`);
  }
  lines.push('');
}

if (summary?.failedStep) {
  lines.push('Failed step:');
  lines.push(`- Name: ${summary.failedStep.name}`);
  lines.push(`- Command: ${summary.failedStep.command}`);
  lines.push(`- Status: ${summary.failedStep.status}`);
  lines.push(`- Next action: ${summary.failedStep.nextAction}`);
  lines.push('');

  const stderrPreview = preview(summary.failedStep.stderrPreview);
  const stdoutPreview = preview(summary.failedStep.stdoutPreview);

  if (stderrPreview) {
    lines.push('stderr preview:');
    lines.push('```');
    lines.push(stderrPreview);
    lines.push('```');
    lines.push('');
  }

  if (stdoutPreview) {
    lines.push('stdout preview:');
    lines.push('```');
    lines.push(stdoutPreview);
    lines.push('```');
    lines.push('');
  }
}

if (plan?.blockers?.length) {
  lines.push('Blockers:');
  for (const blocker of plan.blockers) {
    lines.push(`- ${blocker}`);
  }
  lines.push('');
}

if (plan?.latestDependencies?.length) {
  lines.push('Dependencies still using latest:');
  for (const dependency of plan.latestDependencies) {
    lines.push(`- ${dependency.section}: ${dependency.name}@${dependency.version}`);
  }
  lines.push('');
}

if (plan?.filesToCommit?.length) {
  lines.push('Files to commit:');
  for (const file of plan.filesToCommit) {
    lines.push(`- ${file}`);
  }
  lines.push('');
}

if (plan?.suggestedCommands?.length) {
  lines.push('Suggested commands:');
  for (const command of plan.suggestedCommands) {
    lines.push(`- ${command}`);
  }
  lines.push('');
}

writeFileSync('phase1-final-report.txt', `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
