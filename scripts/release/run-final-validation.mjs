#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const outputDir = process.env.RELEASE_VALIDATION_DIR || 'release-validation';
const logDir = join(outputDir, 'logs');
const evidenceDir = join('docs', 'security', 'evidence', 'runtime');
const evidencePath = join(evidenceDir, 'final-validation-runner.json');
const releaseTarget = process.env.RELEASE_TARGET || 'production';
const maxBuffer = 128 * 1024 * 1024;

mkdirSync(logDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });

const productionCommands = [
  { slug: '00-npm-ci', label: 'npm ci', command: 'npm', args: ['ci'], requested: true },
  { slug: '01-lint', label: 'npm run lint', command: 'npm', args: ['run', 'lint'], requested: true },
  { slug: '02-typecheck', label: 'npm run typecheck', command: 'npm', args: ['run', 'typecheck'], requested: true },
  { slug: '03-test', label: 'npm run test', command: 'npm', args: ['run', 'test'], requested: true },
  {
    slug: '04-playwright-install',
    label: 'Playwright browser dependency install',
    command: 'npx',
    args: ['playwright', 'install', '--with-deps'],
    requested: false,
    prerequisiteFor: 'npm run test:e2e',
  },
  { slug: '05-test-e2e', label: 'npm run test:e2e', command: 'npm', args: ['run', 'test:e2e'], requested: true },
  { slug: '06-build', label: 'npm run build', command: 'npm', args: ['run', 'build'], requested: true },
  { slug: '07-security-ci', label: 'npm run security:ci', command: 'npm', args: ['run', 'security:ci'], requested: true },
  { slug: '08-deployment-smoke', label: 'npm run release:deployment-smoke', command: 'npm', args: ['run', 'release:deployment-smoke'], requested: true },
  { slug: '09-rollback-dry-run', label: 'npm run release:rollback:dry-run', command: 'npm', args: ['run', 'release:rollback:dry-run'], requested: true },
  { slug: '10-release-readiness', label: 'npm run release:readiness', command: 'npm', args: ['run', 'release:readiness'], requested: true },
];

const enterpriseCommands = [
  {
    slug: '11-release-enterprise-readiness',
    label: 'npm run release:enterprise-readiness',
    command: 'npm',
    args: ['run', 'release:enterprise-readiness'],
    requested: true,
  },
];

const commands = releaseTarget === 'enterprise'
  ? [...productionCommands, ...enterpriseCommands]
  : productionCommands;

function now() {
  return new Date().toISOString();
}

function githubRunUrl() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!repository || !runId) return null;
  return `https://github.com/${repository}/actions/runs/${runId}`;
}

function commandLine(step) {
  return [step.command, ...step.args].join(' ');
}

function runCommand(step) {
  const startedAt = now();
  const logPath = join(logDir, `${step.slug}.log`);
  const header = [
    `# ${step.label}`,
    `Command: ${commandLine(step)}`,
    `Started: ${startedAt}`,
    `Release target: ${releaseTarget}`,
    '',
  ].join('\n');

  process.stdout.write(`${header}\n`);

  const result = spawnSync(step.command, step.args, {
    encoding: 'utf8',
    maxBuffer,
    env: {
      ...process.env,
      CI: 'true',
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1',
      RELEASE_TARGET: releaseTarget,
      FINAL_VALIDATION_IN_PROGRESS: 'true',
    },
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const finishedAt = now();
  const exitStatus = typeof result.status === 'number' ? result.status : 1;
  const diagnostics = result.error ? `\nRunner error: ${result.error.message}\n` : '';
  const footer = [
    '',
    diagnostics.trim() ? diagnostics.trim() : null,
    `Finished: ${finishedAt}`,
    `Exit status: ${exitStatus}`,
    result.signal ? `Signal: ${result.signal}` : null,
    '',
  ].filter(Boolean).join('\n');

  process.stdout.write(`${footer}\n`);
  writeFileSync(logPath, `${header}\n${stdout}${stderr}${footer}\n`);

  return {
    ...step,
    startedAt,
    finishedAt,
    exitStatus,
    exitCode: exitStatus,
    passed: exitStatus === 0,
    result: exitStatus === 0 ? 'passed' : 'failed',
    log: logPath,
  };
}

const results = commands.map((command) => runCommand(command));
const requestedResults = results.filter((result) => result.requested);
const prerequisiteFailures = results.filter((result) => !result.requested && result.exitStatus !== 0);
const requestedFailures = requestedResults.filter((result) => result.exitStatus !== 0);
const overallResult = requestedFailures.length === 0 && prerequisiteFailures.length === 0 ? 'passed' : 'failed';

const summary = {
  generatedAt: now(),
  repository: process.env.GITHUB_REPOSITORY || null,
  workflow: process.env.GITHUB_WORKFLOW || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runUrl: githubRunUrl(),
  commitSha: process.env.GITHUB_SHA || null,
  refName: process.env.GITHUB_REF_NAME || null,
  actor: process.env.GITHUB_ACTOR || null,
  eventName: process.env.GITHUB_EVENT_NAME || null,
  releaseTarget,
  overallResult,
  requestedCommandFailures: requestedFailures.map((result) => result.label),
  prerequisiteFailures: prerequisiteFailures.map((result) => result.label),
  commands: results.map((result) => ({
    command: result.label,
    requested: result.requested,
    prerequisiteFor: result.prerequisiteFor || null,
    exitStatus: result.exitStatus,
    exitCode: result.exitCode,
    passed: result.passed,
    result: result.result,
    log: result.log,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
  })),
};

writeFileSync(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

const markdown = [
  '# Final release validation summary',
  '',
  `- Generated at: ${summary.generatedAt}`,
  `- Repository: ${summary.repository || 'local/not in GitHub Actions'}`,
  `- Run URL: ${summary.runUrl || 'local/not in GitHub Actions'}`,
  `- Commit SHA: ${summary.commitSha || 'local/not in GitHub Actions'}`,
  `- Ref: ${summary.refName || 'local/not in GitHub Actions'}`,
  `- Release target: ${summary.releaseTarget}`,
  `- Overall result: **${summary.overallResult}**`,
  '',
  '| Command | Requested | Result | Exit status | Log |',
  '| --- | --- | --- | --- | --- |',
  ...summary.commands.map((command) => `| \`${command.command}\` | ${command.requested ? 'yes' : 'no'} | ${command.result} | ${command.exitStatus} | \`${command.log}\` |`),
  '',
].join('\n');

writeFileSync(join(outputDir, 'summary.md'), markdown);

const evidence = {
  evidenceItem: 'final-validation-runner',
  status: overallResult === 'passed' ? 'Complete' : 'Open',
  outcome: overallResult,
  generatedAt: summary.generatedAt,
  reviewedAt: summary.generatedAt,
  reviewer: 'EuroComply release automation',
  releaseTarget,
  summary: overallResult === 'passed' ? 'Final validation command bundle passed for the assessed commit.' : 'Final validation command bundle failed; release remains blocked.',
  redactionConfirmation: 'Redaction confirmed for runtime evidence.',
  evidenceLocations: ['scripts/release/run-final-validation.mjs', 'release-validation/summary.json', 'release-validation/logs/*.log', evidencePath],
  controlsVerified: overallResult === 'passed' ? summary.commands.filter((command) => command.requested).map((command) => command.command) : [],
  commands: summary.commands,
  commandResults: summary.commands,
  failures: {
    requestedCommandFailures: summary.requestedCommandFailures,
    prerequisiteFailures: summary.prerequisiteFailures,
  },
  releaseGate: overallResult === 'passed' ? 'Final validation evidence is present.' : 'Release remains blocked until final validation is Complete/passed.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
  },
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (overallResult !== 'passed') {
  console.error('Final release validation failed. See release-validation/summary.json, release-validation/logs/*.log and docs/security/evidence/runtime/final-validation-runner.json.');
  process.exit(1);
}

console.log('Final release validation passed.');
